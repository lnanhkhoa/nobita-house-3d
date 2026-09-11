import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type MeshStandardMaterial, type Object3D, type PointLight } from 'three';
import type { TimeOfDayState } from './use-time-of-day';

/** Warm practicals, positioned to match the fixtures already modelled in the GLBs. */
const LAMPS = [
  // Porch lamp on the house, beside the front door (`porch_lamp` in house_build.py).
  { position: [3.05, 2.1, 3.95] as const, color: '#FFD9A0', intensity: 9, distance: 7 },
  // Stone lantern in the back corner of the garden (`lantern_*` in env_build.py).
  { position: [6.3, 1.0, -5.9] as const, color: '#FFCE86', intensity: 6, distance: 6 },
  // Spill from the lit ground-floor windows onto the front garden.
  { position: [-1.65, 1.5, 4.4] as const, color: '#FFE0B0', intensity: 5, distance: 8 },
] as const;

/**
 * Materials lit from within at night, and how hot each glows at full lamp level.
 *
 * Only house materials: material names are not unique across the GLBs, so matching by name
 * over the whole scene lit every neighbour nameplate and utility-pole plate in the block.
 * The search is scoped to the house subtree for the same reason.
 */
const EMISSIVE: Record<string, { color: string; strength: number }> = {
  house_glass: { color: '#FFD9A0', strength: 1.15 },
  house_curtain: { color: '#FFE3B8', strength: 0.85 },
};

const EMISSIVE_NAMES = Object.keys(EMISSIVE);

interface Captured {
  material: MeshStandardMaterial;
  color: Color;
  strength: number;
  /** What the GLB authored, so daylight restores the original rather than approaching it. */
  originalColor: Color;
  originalIntensity: number;
}

/**
 * Night practicals: point lights at the modelled fixtures, plus an emissive lift on the
 * window glass and curtains so the house reads as occupied. Everything scales with
 * `tod.lampLevel`, which is 0 in daylight, so nothing changes during the day.
 */
export function NightLights({ tod }: { tod: TimeOfDayState }) {
  const scene = useThree((s) => s.scene);
  const lights = useRef<(PointLight | null)[]>([]);
  const captured = useRef<Captured[]>([]);
  const lastLevel = useRef(-1);

  useFrame(() => {
    for (const light of lights.current) {
      if (light) light.intensity = light.userData.baseIntensity * tod.lampLevel;
    }

    // Keep scanning until every target is found: the house and environment load behind
    // independent Suspense boundaries, so stopping at the first non-empty result would
    // permanently miss whichever GLB resolved second.
    if (captured.current.length < EMISSIVE_NAMES.length) {
      const house = scene.getObjectByName('house-root');
      house?.traverse((node: Object3D) => {
        const mesh = node as { isMesh?: boolean; material?: MeshStandardMaterial };
        const material = mesh.material;
        if (!mesh.isMesh || !material?.name) return;
        const spec = EMISSIVE[material.name];
        if (!spec || captured.current.some((entry) => entry.material === material)) return;
        captured.current.push({
          material,
          color: new Color(spec.color),
          strength: spec.strength,
          originalColor: material.emissive.clone(),
          originalIntensity: material.emissiveIntensity,
        });
        // Force a write on the next frame: without this the dead-band below would skip
        // materials captured after the ease had already settled.
        lastLevel.current = -1;
      });
    }

    if (Math.abs(tod.lampLevel - lastLevel.current) < 0.002) return;
    lastLevel.current = tod.lampLevel;
    for (const entry of captured.current) {
      if (tod.lampLevel < 0.01) {
        // Restore exactly, rather than asymptotically approaching the original.
        entry.material.emissive.copy(entry.originalColor);
        entry.material.emissiveIntensity = entry.originalIntensity;
      } else {
        entry.material.emissive.copy(entry.color);
        entry.material.emissiveIntensity = entry.strength * tod.lampLevel;
      }
    }
  });

  return (
    <group name="night-lights">
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
