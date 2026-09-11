import { Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BackSide,
  Color,
  type Fog,
  type Group,
  type Mesh,
  type Points,
  ShaderMaterial,
  type Vector3,
} from 'three';
import type { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky.js';
import type { TimeOfDayState } from './use-time-of-day';

/**
 * Radius of the camera-centred night dome. Inside `camera.far` (200) from any orbit, because
 * the dome travels with the camera; outside everything the diorama contains within view.
 */
const NIGHT_DOME_RADIUS = 150;

/**
 * drei's starfield shader places each star at `vec4(position, 0.5)`, which is the point at
 * **twice** its geometric radius. Measuring the geometry (as a previous fix did) therefore
 * under-reports the real distance by half. With the field centred on the camera, stars land
 * at 2 × (radius .. radius + depth) = 90..130 m: inside the dome and well inside `far`.
 */
const STAR_RADIUS = 45;
const STAR_DEPTH = 20;

/** Night gradient colour at the zenith; the horizon takes the eased fog colour. */
const NIGHT_ZENITH = new Color('#03060F');

/**
 * A gradient dome that takes over from `<Sky>` after dark. three's Preetham sky has no night:
 * its fragment shader keeps an ambient floor (`L0 = 0.1 * Fex`) and lifts it through a
 * 1/2.4 gamma, so with the sun below the horizon it still outputs roughly 35% grey — the
 * muddy brown the night preset used to show.
 */
function createNightMaterial() {
  return new ShaderMaterial({
    side: BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: NIGHT_ZENITH.clone() },
      horizon: { value: new Color() },
      opacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith;
      uniform vec3 horizon;
      uniform float opacity;
      varying vec3 vDirection;
      void main() {
        // Blend fast just above the horizon, then settle into the deep zenith colour, so the
        // band where the ground's fog meets the sky stays soft.
        float h = pow(clamp(vDirection.y, 0.0, 1.0), 0.45);
        gl_FragColor = vec4(mix(horizon, zenith, h), opacity);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Sky, stars, background and fog for the active time of day. `<Sky>` and the key light in
 * `Lighting` read the same eased sun vector, so shadows always agree with where the sun
 * appears.
 *
 * Everything is written imperatively per frame, so the transition itself costs no
 * reconciliation; the click that starts it does re-render this subtree once, via the store
 * subscription in `Scene`.
 */
export function SkyDome({ tod }: { tod: TimeOfDayState }) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sky = useRef<SkyImpl>(null);
  const nightDome = useRef<Mesh>(null);
  const starsRig = useRef<Group>(null);
  const stars = useRef<Points>(null);
  const nightMaterial = useMemo(createNightMaterial, []);

  useFrame(() => {
    (scene.background as Color | null)?.copy(tod.background);
    const fog = scene.fog as Fog | null;
    if (fog) {
      fog.color.copy(tod.fogColor);
      fog.near = tod.fogNear;
      fog.far = tod.fogFar;
    }

    // three's Sky shader declares all five uniforms, but the typed bag is index-signature
    // optional, so each write is guarded rather than asserted.
    const uniforms = (sky.current?.material as ShaderMaterial | undefined)?.uniforms;
    if (uniforms) {
      const sun = uniforms.sunPosition?.value as Vector3 | undefined;
      sun?.copy(tod.sun);
      const write = (name: keyof typeof tod.sky) => {
        const uniform = uniforms[name];
        if (uniform) uniform.value = tod.sky[name];
      };
      write('turbidity');
      write('rayleigh');
      write('mieCoefficient');
      write('mieDirectionalG');
    }

    // `starOpacity` is the eased "how night is it" level, 0 by day and 1 at night; the dome and
    // the stars both key off it so they arrive together.
    const night = tod.starOpacity;
    const { opacity, horizon } = nightMaterial.uniforms as {
      opacity: { value: number };
      horizon: { value: Color };
    };
    opacity.value = night;
    horizon.value.copy(tod.fogColor);
    if (nightDome.current) {
      nightDome.current.position.copy(camera.position);
      nightDome.current.visible = night > 0.01;
    }
    if (starsRig.current) starsRig.current.position.copy(camera.position);
    if (stars.current) {
      // drei's <Stars> does not forward renderOrder; after the dome (1) keeps them on top.
      stars.current.renderOrder = 2;
      // The starfield shader has no usable opacity input, so stars are toggled once the dome
      // is nearly opaque and dark enough to hide the pop.
      stars.current.visible = night > 0.85;
    }
  });

  return (
    <>
      <Sky ref={sky} distance={4500} sunPosition={tod.sun.toArray()} />
      {/* Render order within the transparent pass: dome, then stars on top of it. */}
      <mesh ref={nightDome} renderOrder={1} material={nightMaterial} frustumCulled={false}>
        <sphereGeometry args={[NIGHT_DOME_RADIUS, 32, 16]} />
      </mesh>
      {/* The rig follows the camera, so stars keep a fixed distance from any orbit and show
          no parallax, which is right for things at infinity. */}
      <group ref={starsRig}>
        <Stars
          ref={stars}
          radius={STAR_RADIUS}
          depth={STAR_DEPTH}
          count={2600}
          factor={3.2}
          saturation={0}
          fade
          speed={0.3}
        />
      </group>
    </>
  );
}
