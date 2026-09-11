import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, Vector3 } from 'three';
import { type TimeOfDayPreset, timeOfDayById } from '../data/time-of-day';
import { useAppStore } from '../state/store';

/** Seconds for a preset change to land: long enough to read as a sweep, short enough to feel responsive. */
const EASE_SECONDS = 1.4;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Every value the scene eases between. Mutated in place; never triggers a React render. */
export interface TimeOfDayState {
  sun: Vector3;
  keyColor: Color;
  keyIntensity: number;
  fillColor: Color;
  fillIntensity: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiIntensity: number;
  background: Color;
  fogColor: Color;
  fogNear: number;
  fogFar: number;
  lampLevel: number;
  /** Sky scattering is swapped, not eased: the transition is dominated by the sun moving and
   * by the background colour, and blending turbidity through the gap looks no different. */
  sky: TimeOfDayPreset['sky'];
  starOpacity: number;
}

function stateFrom(preset: TimeOfDayPreset): TimeOfDayState {
  return {
    sun: new Vector3(...preset.sun),
    keyColor: new Color(preset.key.color),
    keyIntensity: preset.key.intensity,
    fillColor: new Color(preset.fill.color),
    fillIntensity: preset.fill.intensity,
    hemiSky: new Color(preset.hemisphere.sky),
    hemiGround: new Color(preset.hemisphere.ground),
    hemiIntensity: preset.hemisphere.intensity,
    background: new Color(preset.background),
    fogColor: new Color(preset.fog.color),
    fogNear: preset.fog.near,
    fogFar: preset.fog.far,
    lampLevel: preset.lampLevel,
    sky: preset.sky,
    starOpacity: preset.stars ? 1 : 0,
  };
}

// Scratch instances reused every frame; the easing runs on every frame of the app's life.
const scratchVector = new Vector3();
const scratchColor = new Color();

/**
 * Drives the whole scene's time of day. Call this **once**, in `Scene`, and pass the result
 * down: each call installs its own `useFrame`, so calling it per consumer would ease several
 * independent copies of the same state.
 */
export function useTimeOfDay(): TimeOfDayState {
  const selected = useAppStore((s) => s.timeOfDay);
  const stateRef = useRef<TimeOfDayState>(null);
  if (stateRef.current === null) {
    // Seed from the initial preset so the very first frame is already correct.
    stateRef.current = stateFrom(timeOfDayById(selected));
  }
  const current = stateRef.current;
  const reduced = useRef(prefersReducedMotion());

  useFrame((_, delta) => {
    const target = timeOfDayById(selected);
    // Exponential approach: frame-rate independent and it never overshoots.
    const t = reduced.current ? 1 : Math.min(1, 1 - Math.exp((-delta * 4) / EASE_SECONDS));
    current.sun.lerp(scratchVector.set(...target.sun), t);
    current.keyColor.lerp(scratchColor.set(target.key.color), t);
    current.fillColor.lerp(scratchColor.set(target.fill.color), t);
    current.hemiSky.lerp(scratchColor.set(target.hemisphere.sky), t);
    current.hemiGround.lerp(scratchColor.set(target.hemisphere.ground), t);
    current.background.lerp(scratchColor.set(target.background), t);
    current.fogColor.lerp(scratchColor.set(target.fog.color), t);
    current.keyIntensity += (target.key.intensity - current.keyIntensity) * t;
    current.fillIntensity += (target.fill.intensity - current.fillIntensity) * t;
    current.hemiIntensity += (target.hemisphere.intensity - current.hemiIntensity) * t;
    current.fogNear += (target.fog.near - current.fogNear) * t;
    current.fogFar += (target.fog.far - current.fogFar) * t;
    current.lampLevel += (target.lampLevel - current.lampLevel) * t;
    current.starOpacity += ((target.stars ? 1 : 0) - current.starOpacity) * t;
    current.sky = target.sky;
  });

  return current;
}
