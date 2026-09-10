import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useRef } from 'react';
import type { Group } from 'three';

/** One greeting cycle: crouch, hop, settle. */
const GREET_SECONDS = 0.95;
const BREATH_HZ = 1.55;
const SWAY_HZ = 0.62;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Options {
  /** Character height in metres; motion amplitudes scale with it. */
  height: number;
  /** Offsets the idle cycle so the group never breathes in lockstep. */
  phase: number;
  selected: boolean;
  hovered: boolean;
}

/**
 * Procedural idle for un-rigged meshes: a breathing bob with a matching squash, a slow sway,
 * a lift on hover, and a one-shot hop when the character is selected. Replaces skeletal
 * animation because the Rodin sculpts ship posed and unskinned.
 */
export function useCharacterMotion(ref: RefObject<Group | null>, opts: Options) {
  const { height, phase, selected, hovered } = opts;
  const greetStart = useRef<number | null>(null);
  const reduced = useRef(prefersReducedMotion());

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      reduced.current = query.matches;
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Re-trigger the greeting every time this character becomes the selected one.
  useEffect(() => {
    greetStart.current = selected ? -1 : null;
  }, [selected]);

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;

    if (reduced.current) {
      group.position.y = 0;
      group.scale.setScalar(1);
      return;
    }

    const now = clock.elapsedTime;
    if (greetStart.current === -1) greetStart.current = now;

    const t = now * Math.PI * 2 + phase;
    const breath = Math.sin(t * BREATH_HZ);
    let lift = breath * 0.006 * height;
    let squash = 1 - breath * 0.007;
    let yaw = Math.sin(t * SWAY_HZ) * 0.022;

    const start = greetStart.current;
    if (start !== null) {
      const p = (now - start) / GREET_SECONDS;
      if (p >= 1) {
        greetStart.current = null;
      } else {
        // Anticipation dip, then a hop that lands softly.
        const hop = Math.sin(Math.PI * p) ** 1.4;
        const dip = p < 0.18 ? Math.sin((p / 0.18) * Math.PI) * 0.35 : 0;
        lift += (hop - dip) * 0.075 * height;
        squash *= 1 + dip * 0.06 - hop * 0.035;
        yaw += Math.sin(p * Math.PI * 2) * 0.16;
      }
    }

    const targetScale = hovered ? 1.025 : 1;
    const scale = group.scale.x + (targetScale - group.scale.x) * 0.15;

    group.position.y = lift;
    group.rotation.y = yaw;
    group.scale.set(scale, scale * squash, scale);
  });
}
