import { useFrame } from '@react-three/fiber';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import type { CharacterDef } from '../data/characters';
import { sampleWalk, type WalkSample } from '../data/walk-routes';
import { poseFor } from '../state/character-poses';
import { useAppStore } from '../state/store';
import { tickWalkClock, walkClock } from './walk-clock';

/** How fast a walker's yaw closes on the route heading, per second: a visible turn, not a snap. */
const TURN_RATE = 8;

const wrapPi = (a: number) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

/**
 * Drives the character's outer group round the walk loop: position from the shared walk
 * clock, yaw turning toward the route heading, and the live pose the camera follows. At home
 * with walk mode off this reproduces the spot and yaw in `characters.ts` exactly.
 * Returns whether the character is out walking; that flips twice per walk, not per frame.
 */
export function useWalker(ref: RefObject<Group | null>, index: number, def: CharacterDef): boolean {
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const sample = useRef<WalkSample>({ x: 0, y: 0, z: 0, heading: 0 });
  const pose = poseFor(def.id);

  // Place the group before its first paint, straight onto the route with no turn.
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const s = sampleWalk(index, walkClock.d, sample.current, walkClock.dir < 0);
    group.position.set(s.x, s.y, s.z);
    group.rotation.set(0, s.heading, 0);
    pose.position.copy(group.position);
    pose.heading = s.heading;
  }, [ref, index, pose]);

  useFrame(({ clock }, delta) => {
    tickWalkClock(clock.elapsedTime, useAppStore.getState().walkMode);
    const group = ref.current;
    if (!group) return;
    const s = sampleWalk(index, walkClock.d, sample.current, walkClock.dir < 0);
    group.position.set(s.x, s.y, s.z);
    const turn = wrapPi(s.heading - group.rotation.y);
    group.rotation.y = wrapPi(group.rotation.y + turn * (1 - Math.exp(-TURN_RATE * delta)));

    pose.position.copy(group.position);
    pose.heading = group.rotation.y;
    const out = walkClock.phase !== 'home';
    pose.moving = out;
    if (out !== movingRef.current) {
      movingRef.current = out;
      setMoving(out);
    }
  });

  return moving;
}
