import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, DoubleSide, type Group, SpriteMaterial, SRGBColorSpace } from 'three';
import { useReducedMotionRef } from '../utils/reduced-motion';
import type { TimeOfDayState } from './use-time-of-day';

/** Distance of the cloud shell from the camera: inside the sky dome and `camera.far`. */
const CLOUD_RADIUS = 120;
/** Radians per second the whole cloud field drifts round the camera. */
const DRIFT = 0.004;

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number) {
  const x = Math.sin(seed * 91.37) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Fair-weather cumulus: flat-ish base, piled rounded tops, a grey-blue underside. Drawn once
 * into a canvas at startup, so there is no image asset to fetch or generate.
 */
function createCloudTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable for the cloud texture');
  const h = canvas.height;

  // Puffs as [x, y, radius] in texture fractions; the base row is wide and low, the tops pile up.
  const puffs: [number, number, number][] = [
    [0.22, 0.72, 0.16],
    [0.38, 0.66, 0.2],
    [0.56, 0.64, 0.22],
    [0.74, 0.7, 0.17],
    [0.86, 0.76, 0.1],
    [0.12, 0.78, 0.09],
    [0.44, 0.44, 0.19],
    [0.6, 0.4, 0.17],
    [0.3, 0.52, 0.14],
    [0.72, 0.52, 0.13],
    [0.52, 0.28, 0.13],
  ];
  for (const [px, py, pr] of puffs) {
    const x = px * size;
    const y = py * h;
    const r = pr * size;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.62, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shade the underside only where cloud already exists.
  ctx.globalCompositeOperation = 'source-atop';
  const shade = ctx.createLinearGradient(0, h * 0.35, 0, h);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(158,176,204,0.6)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, h);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const CLOUD_COUNT = 16;

/**
 * Cloud placements on the shell: azimuth, elevation (radians), width in metres, mirrored.
 * Elevations stay between 4 and 13 degrees because the orbit camera only ever frames the sky
 * from the horizon up to ~10-15 degrees; higher clouds were simply never on screen. At this
 * height, and this size, they peek over the rooftops as in the hero reference.
 */
const CLOUDS = Array.from({ length: CLOUD_COUNT }, (_, i) => ({
  id: `cloud-${i}`,
  azimuth: (i / CLOUD_COUNT) * Math.PI * 2 + rand(i + 1) * 0.3,
  elevation: (4 + rand(i + 20) * 9) * (Math.PI / 180),
  width: 30 + rand(i + 40) * 24,
  flip: rand(i + 60) > 0.5,
}));

/**
 * A ring of cumulus billboards riding a camera-centred shell. They show no parallax, which is
 * right at this distance, drift slowly round the camera, and take their tint and opacity from
 * the time of day: white by morning, pink at dawn, lit orange at sunset, gone at night.
 */
export function Clouds({ tod }: { tod: TimeOfDayState }) {
  const camera = useThree((s) => s.camera);
  const rig = useRef<Group>(null);
  const reduced = useReducedMotionRef();
  const material = useMemo(
    () =>
      new SpriteMaterial({
        map: createCloudTexture(),
        transparent: true,
        depthWrite: false,
        // At 120 m every cloud would sit past the fog's far distance and vanish into it.
        fog: false,
        // Mirrored clouds use a negative scale, and three only flips face culling for meshes,
        // not sprites, so a one-sided sprite material would cull every mirrored cloud.
        side: DoubleSide,
      }),
    [],
  );

  useFrame((_, delta) => {
    const group = rig.current;
    if (!group) return;
    group.position.copy(camera.position);
    if (!reduced.current) group.rotation.y += delta * DRIFT;
    material.color.copy(tod.cloudTint);
    material.opacity = tod.cloudOpacity;
    group.visible = tod.cloudOpacity > 0.01;
  });

  return (
    <group ref={rig} name="clouds">
      {CLOUDS.map((cloud) => {
        const ring = Math.cos(cloud.elevation) * CLOUD_RADIUS;
        return (
          <sprite
            key={cloud.id}
            material={material}
            renderOrder={2}
            position={[
              Math.sin(cloud.azimuth) * ring,
              Math.sin(cloud.elevation) * CLOUD_RADIUS,
              Math.cos(cloud.azimuth) * ring,
            ]}
            scale={[cloud.flip ? -cloud.width : cloud.width, cloud.width / 2, 1]}
          />
        );
      })}
    </group>
  );
}
