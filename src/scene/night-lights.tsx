import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Color, MeshStandardMaterial, Object3D, PointLight } from 'three';
import { layout } from '../data/scene';
import type { TimeOfDayState } from './use-time-of-day';

/** Warm practicals, positioned to match the fixtures already modelled in the GLBs. */
const LAMPS = [
  // Porch lamp on the house, beside the front door.
  { position: [3.05, 2.1, 3.95] as const, color: '#FFD9A0', intensity: 9, distance: 7 },
  // Stone lantern in the back corner of the garden.
  { position: [6.3, 1.0, -5.9] as const, color: '#FFCE86', intensity: 6, distance: 6 },
  // Spill from the lit ground-floor windows onto the front garden.
  { position: [-1.65, 1.5, 4.4] as const, color: '#FFE0B0', intensity: 5, distance: 8 },
] as const;

/** Materials lit from within at night, and how hot each one glows at full lamp level. */
const EMISSIVE: Record<string, { color: string; strength: number }> = {
  house_glass: { color: '#FFD9A0', strength: 1.15 },
  house_curtain: { color: '#FFE3B8', strength: 0.85 },
  env_plate: { color: '#FFE9C4', strength: 0.35 },
};

/**
 * Night practicals: point lights at the modelled fixtures, plus an emissive lift on the
 * window glass and curtains so the house reads as occupied. Everything scales with
 * `tod.lampLevel`, which is 0 in daylight, so nothing changes during the day.
 *
 * The emissive pass walks the scene rather than the individual GLBs: the house and
 * environment meshes are merged by material during the asset build, so there is no per-object
 * handle to hold, and the material instances are shared and stable once loaded.
 */
export function NightLights({ tod }: { tod: TimeOfDayState }) {
  const scene = useThree((s) => s.scene);
  const lights = useRef<(PointLight | null)[]>([]);
  const touched = useRef<{ material: MeshStandardMaterial; color: string; strength: number }[]>([]);
  const lastLevel = useRef(-1);

  useFrame(() => {
    for (const light of lights.current) {
      if (light) light.intensity = light.userData.baseIntensity * tod.lampLevel;
    }

    // Collect the emissive materials once, then only write when the level actually moves.
    if (touched.current.length === 0) {
      scene.traverse((node: Object3D) => {
        const mesh = node as { isMesh?: boolean; material?: MeshStandardMaterial };
        const name = mesh.material?.name;
        if (!mesh.isMesh || !name) return;
        const spec = EMISSIVE[name];
        if (spec && !touched.current.some((e) => e.material === mesh.material)) {
          touched.current.push({
            material: mesh.material as MeshStandardMaterial,
            ...spec,
          });
        }
      });
    }
    if (Math.abs(tod.lampLevel - lastLevel.current) < 0.002) return;
    lastLevel.current = tod.lampLevel;
    for (const entry of touched.current) {
      entry.material.emissive.set(entry.color as unknown as Color);
      entry.material.emissiveIntensity = entry.strength * tod.lampLevel;
    }
  });

  return (
    <group name="night-lights" position={[0, layout.standY, 0]}>
      {LAMPS.map((lamp, index) => (
        <pointLight
          key={lamp.position.join(',')}
          ref={(node) => {
            lights.current[index] = node;
            if (node) node.userData.baseIntensity = lamp.intensity;
          }}
          position={lamp.position}
          color={lamp.color}
          intensity={0}
          distance={lamp.distance}
          decay={2}
        />
      ))}
    </group>
  );
}
