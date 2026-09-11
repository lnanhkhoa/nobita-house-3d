import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, Vector3 } from 'three';
import { type SkyParams, type TimeOfDayPreset, timeOfDayById } from '../data/time-of-day';
import { useAppStore } from '../state/store';
import { useReducedMotionRef } from '../utils/reduced-motion';

/** Seconds for a preset change to land: long enough to read as a sweep, short enough to feel responsive. */
const EASE_SECONDS = 1.4;

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
  sky: SkyParams;
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
    sky: { ...preset.sky },
    starOpacity: preset.stars ? 1 : 0,
  };
}

// Scratch instances reused every frame; the easing runs on every frame of the app's life.
const scratchVector = new Vector3();
const scratchColor = new Color();

const approach = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Drives the whole scene's time of day. Call this **once**, in `Scene`, and pass the result
 * down: each call installs its own `useFrame`, so calling it per consumer would ease several
 * independent copies of the same state.
 *
 * Runs at priority -1 so it updates before the consumers that read it. R3F only hands the
 * render loop over for priority > 0, so a negative priority orders the callback without
 * disabling automatic rendering.
 */
export function useTimeOfDay(): TimeOfDayState {
  const selected = useAppStore((s) => s.timeOfDay);
  const stateRef = useRef<TimeOfDayState>(null);
  if (stateRef.current === null) {
    // Seed from the initial preset so the very first frame is already correct.
    stateRef.current = stateFrom(timeOfDayById(selected));
  }
  const current = stateRef.current;
  const reduced = useReducedMotionRef();

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
    current.keyIntensity = approach(current.keyIntensity, target.key.intensity, t);
    current.fillIntensity = approach(current.fillIntensity, target.fill.intensity, t);
    current.hemiIntensity = approach(current.hemiIntensity, target.hemisphere.intensity, t);
    current.fogNear = approach(current.fogNear, target.fog.near, t);
    current.fogFar = approach(current.fogFar, target.fog.far, t);
    current.lampLevel = approach(current.lampLevel, target.lampLevel, t);
    current.starOpacity = approach(current.starOpacity, target.stars ? 1 : 0, t);
    // `<Sky>` covers the whole frame, so its scattering has to ease too; swapping it would
    // snap the only thing the viewer actually sees behind the house.
    current.sky.turbidity = approach(current.sky.turbidity, target.sky.turbidity, t);
    current.sky.rayleigh = approach(current.sky.rayleigh, target.sky.rayleigh, t);
    current.sky.mieCoefficient = approach(current.sky.mieCoefficient, target.sky.mieCoefficient, t);
    current.sky.mieDirectionalG = approach(current.sky.mieDirectionalG, target.sky.mieDirectionalG, t);
  }, -1);

  return current;
}
