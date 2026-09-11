import { Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Color, Fog, Points, ShaderMaterial, Vector3 } from 'three';
import type { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky.js';
import type { TimeOfDayState } from './use-time-of-day';

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
  const sky = useRef<SkyImpl>(null);
  const stars = useRef<Points>(null);

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

    if (stars.current) {
      // The starfield material is a custom shader with no usable opacity input, so the stars
      // are toggled near the end of the transition, by which point the sky is dark enough to
      // hide the pop.
      stars.current.visible = tod.starOpacity > 0.85;
    }
  });

  return (
    <>
      <Sky ref={sky} distance={4500} sunPosition={tod.sun.toArray()} />
      {/* Stars sit in a shell `radius`..`radius + depth` from the world origin, while the
          camera orbits out to 38 m and `camera.far` is 200: at the previous 200/70 the whole
          field fell outside the far plane and nothing rasterised. 120 + 40 + 38 stays inside. */}
      <Stars ref={stars} radius={120} depth={40} count={2400} factor={5} saturation={0} fade speed={0.3} />
    </>
  );
}
