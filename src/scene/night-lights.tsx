import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type MeshStandardMaterial, type Object3D, type PointLight } from 'three';
import { layout } from '../data/scene';
import type { TimeOfDayState } from './use-time-of-day';

/** Height of the lamp lens on each utility pole; mirrors `LAMP_H` in streets_build.py. */
const STREET_LAMP_HEIGHT = 4.63;
/** How far the lamp bracket reaches over the carriageway, from the same builder. */
const STREET_LAMP_REACH = 0.85;

/** Warm practicals on Nobita's lot, positioned to match the fixtures modelled in the GLBs. */
const LOT_LAMPS = [
  // Porch lamp beside the front door (`porch_lamp` in house_build.py).
  { position: [3.05, 2.1, 3.95] as const, color: '#FFD9A0', intensity: 9, distance: 7 },
  // Stone lantern in the back corner of the garden (`lantern_*` in env_build.py).
  { position: [6.3, 1.0, -5.9] as const, color: '#FFCE86', intensity: 6, distance: 6 },
  // Spill from the lit ground-floor windows onto the front garden.
  { position: [-1.65, 1.5, 4.4] as const, color: '#FFE0B0', intensity: 5, distance: 8 },
] as const;

/**
 * Street lamps, derived from the same pole table the Blender builder reads, so a pole moved
 * in `scene.ts` takes its light with it. The bracket reaches over the carriageway: the
 * front-street poles face +z, the junction pole on the side street faces -x.
 */
const STREET_LAMPS = layout.streets.poles.map(([x, z]) => {
  const onFrontStreet = z > 0;
  return {
    position: [
      onFrontStreet ? x : x - STREET_LAMP_REACH,
      STREET_LAMP_HEIGHT,
      onFrontStreet ? z + STREET_LAMP_REACH : z,
    ] as [number, number, number],
    color: '#FFE6BC',
    intensity: 14,
    distance: 16,
  };
});

/**
 * Materials lit from within at night, grouped by the subtree they live in.
 *
 * Grouping matters: material names are not unique across the GLBs — `env_plate` alone appears
 * in the environment, the streets and the neighbours — so matching by name over the whole
 * scene once lit every neighbour nameplate and pole plate in the block.
 */
const EMISSIVE_BY_ROOT: Record<string, Record<string, { color: string; strength: number }>> = {
  'house-root': {
    house_glass: { color: '#FFD9A0', strength: 1.15 },
    house_curtain: { color: '#FFE3B8', strength: 0.85 },
  },
  'neighbours-root': {
    // Dimmer than the hero house: the neighbours are backdrop, not subject.
    env_glass: { color: '#FFD49A', strength: 0.8 },
    env_interior: { color: '#FFCF92', strength: 0.55 },
  },
  'streets-root': {
    env_lamp_lens: { color: '#FFF0CC', strength: 2.4 },
  },
};

const TOTAL_TARGETS = Object.values(EMISSIVE_BY_ROOT).reduce(
  (sum, group) => sum + Object.keys(group).length,
  0,
);

interface Captured {
  material: MeshStandardMaterial;
  color: Color;
  strength: number;
  /** What the GLB authored, so daylight restores the original rather than approaching it. */
  originalColor: Color;
  originalIntensity: number;
}

/**
 * Night practicals: point lights at the modelled fixtures, plus an emissive lift on window
 * glass, neighbour windows and the street-lamp lenses. Everything scales with `tod.lampLevel`,
 * which is 0 in daylight, so nothing changes during the day.
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

    // Keep scanning until every target is found: the four GLBs load behind independent
    // Suspense boundaries, so stopping at the first non-empty result would permanently miss
    // whichever files resolved later.
    if (captured.current.length < TOTAL_TARGETS) {
      for (const [rootName, group] of Object.entries(EMISSIVE_BY_ROOT)) {
        scene.getObjectByName(rootName)?.traverse((node: Object3D) => {
          const mesh = node as { isMesh?: boolean; material?: MeshStandardMaterial };
          const material = mesh.material;
          if (!mesh.isMesh || !material?.name) return;
          const spec = group[material.name];
          if (!spec || captured.current.some((entry) => entry.material === material)) return;
          captured.current.push({
            material,
            color: new Color(spec.color),
            strength: spec.strength,
            originalColor: material.emissive.clone(),
            originalIntensity: material.emissiveIntensity,
          });
          // Force a write next frame: without this the dead-band below would skip materials
          // captured after the ease had already settled.
          lastLevel.current = -1;
        });
      }
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
      {[...LOT_LAMPS, ...STREET_LAMPS].map((lamp, index) => (
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
