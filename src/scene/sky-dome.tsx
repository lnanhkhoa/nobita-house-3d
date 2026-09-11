import { Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Color, Fog, Points } from 'three';
import type { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky.js';
import type { TimeOfDayState } from './use-time-of-day';

/** Shader uniform bag, narrowed just enough to write into it without `any`. */
type Uniforms = Record<string, { value: unknown } | undefined>;

/**
 * Sky, stars, background and fog for the active time of day. `<Sky>` and the key light in
 * `Lighting` read the same eased sun vector, so shadows always agree with where the sun
 * appears. Everything is written imperatively per frame: switching the time of day changes
 * no React state below `Scene`, so there is no reconciliation during the transition.
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

    const uniforms = (sky.current?.material as { uniforms?: Uniforms } | undefined)?.uniforms;
    if (uniforms) {
      (uniforms.sunPosition?.value as Pick<Color, 'copy'> | undefined)?.copy(tod.sun as unknown as Color);
      if (uniforms.turbidity) uniforms.turbidity.value = tod.sky.turbidity;
      if (uniforms.rayleigh) uniforms.rayleigh.value = tod.sky.rayleigh;
      if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = tod.sky.mieCoefficient;
      if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = tod.sky.mieDirectionalG;
    }

    if (stars.current) {
      // The starfield material is a custom shader without a usable opacity input, so the
      // stars are toggled once the sky has darkened enough to hide the pop.
      stars.current.visible = tod.starOpacity > 0.4;
    }
  });

  return (
    <>
      <Sky ref={sky} distance={4500} sunPosition={tod.sun.toArray()} />
      <Stars ref={stars} radius={200} depth={70} count={2400} factor={5} saturation={0} fade speed={0.3} />
    </>
  );
}
