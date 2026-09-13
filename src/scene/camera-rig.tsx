import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { config } from '../config';
import { characterById } from '../data/characters';
import { allLots, layout } from '../data/scene';
import { characterPoses } from '../state/character-poses';
import { useAppStore } from '../state/store';
import { prefersReducedMotion, useReducedMotionRef } from '../utils/reduced-motion';

/** Scratch vectors for the target clamp, the eye check and the follow point; no per-frame allocation. */
const scratchTarget = new Vector3();
const scratchEye = new Vector3();
const follow = new Vector3();

/** Time constant, seconds, of the orbit target easing after a walker: close, never jerky. */
const FOLLOW_TIME = 0.2;

const lots = allLots();
/** True when (x, z) is inside a lot: an eye there sits behind its wall, looking at the wall. */
function inLot(x: number, z: number) {
  for (const r of lots) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
  return false;
}

/**
 * Orbit azimuth that puts the eye over the carriageway nearest (x, z), so a walker is seen
 * from the street and not through a lot wall. Same convention as the characters' yaw: the
 * eye sits toward (sin θ, cos θ) from the target.
 */
function streetward(x: number, z: number) {
  const frontMid = layout.road.startZ + layout.road.depth / 2;
  const sideMid = (layout.streets.side.startX + layout.streets.side.endX) / 2;
  if (Math.abs(z - frontMid) <= Math.abs(x - sideMid)) return z < frontMid ? 0 : Math.PI;
  return x < sideMid ? Math.PI / 2 : -Math.PI / 2;
}

const wrapPi = (a: number) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

/**
 * Orbit with a block-bounded target; flies to the selected character, follows it while it
 * walks, and flies back on reset.
 */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const reduced = useReducedMotionRef();
  /** Whether last frame tracked a walker; the follow point is re-seeded when tracking starts. */
  const tracking = useRef(false);
  /** Street the tracked walker was last nearest, and whether a swing to its side is due. */
  const street = useRef<number | null>(null);
  const swingDue = useRef(false);
  const selectedId = useAppStore((s) => s.selectedCharacterId);
  const resetToken = useAppStore((s) => s.resetToken);
  const autoRotate = useAppStore((s) => s.autoRotate);
  const cameraColliders = useAppStore((s) => s.cameraColliders);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (import.meta.env.DEV)
      (window as unknown as { __cam: unknown }).__cam = { camera, controls, scene, gl };
  }, [camera, scene, gl]);

  // The orbit radius reaches across every neighbour lot, so without colliders the camera
  // flies through their walls. camera-controls raycasts these and pulls the eye in front.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.colliderMeshes = cameraColliders;
  }, [cameraColliders]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const { position, target } = config.camera;
    c.setLookAt(
      position[0],
      position[1],
      position[2],
      target[0],
      target[1],
      target[2],
      resetToken > 0 && !prefersReducedMotion(),
    );
  }, [resetToken]);

  useEffect(() => {
    const c = controls.current;
    const def = selectedId ? characterById(selectedId) : undefined;
    if (!c) return;
    if (!def) {
      c.setFocalOffset(0, 0, 0, !prefersReducedMotion());
      return;
    }
    // Frame the character where it is now: out walking, that is not its spot.
    const pose = characterPoses.get(def.id);
    const live = pose?.position;
    // At home a resting pose can lift the body off its sidewalk anchor, onto the wall: frame the
    // body, not the pavement under it.
    const rest = pose?.moving ? undefined : def.rest?.offset;
    const x = (live?.x ?? def.position[0]) + (rest?.[0] ?? 0);
    const z = (live?.z ?? def.position[2]) + (rest?.[2] ?? 0);
    // Frame the whole figure: eye height at 60% of the body, standing back ~2.9 body-heights,
    // a little to the right. Out on the walk that spot can fall inside a lot, behind its
    // wall; then look from the street instead, at the same distance.
    const eye = (rest?.[1] ?? 0) + def.height * 0.6;
    const dist = def.height * 2.9;
    const reach = Math.hypot(dist * 0.28, dist);
    let azimuth = Math.atan2(0.28, 1);
    if (inLot(x + reach * Math.sin(azimuth), z + reach * Math.cos(azimuth))) azimuth = streetward(x, z);
    // On desktop the info card covers the right third, so shift the subject left of centre.
    const offsetX = window.innerWidth >= 1024 ? def.height * 0.55 : 0;
    c.setFocalOffset(offsetX, 0, 0, !prefersReducedMotion());
    c.setLookAt(
      x + reach * Math.sin(azimuth),
      eye + def.height * 0.28,
      z + reach * Math.cos(azimuth),
      x,
      eye,
      z,
      !prefersReducedMotion(),
    );
  }, [selectedId]);

  useEffect(() => {
    let raf = 0;
    const spin = () => {
      controls.current?.rotate(0.0025, 0, false);
      raf = requestAnimationFrame(spin);
    };
    if (autoRotate) raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const { selectedCharacterId: id, autoRotate: spinning } = useAppStore.getState();
    const pose = id ? characterPoses.get(id) : undefined;
    const def = id ? characterById(id) : undefined;
    if (!pose?.moving || !def) {
      tracking.current = false;
      return;
    }

    // Track the selected walker. The follow point eases from wherever the target is drawn
    // now, and `moveTo` without a transition shifts target and eye together: the user's orbit
    // angle and distance survive, dragging keeps working, and the fly-in's orbit animation
    // runs on untouched. (A transitioned `moveTo` would queue a rest listener every frame.)
    if (!tracking.current) {
      c.getTarget(follow, false);
      tracking.current = true;
      street.current = null;
    }
    const k = reduced.current ? 1 : 1 - Math.exp(-delta / FOLLOW_TIME);
    follow.x += (pose.position.x - follow.x) * k;
    follow.y += (def.height * 0.6 - follow.y) * k;
    follow.z += (pose.position.z - follow.z) * k;
    c.moveTo(follow.x, follow.y, follow.z, false);

    // Turning onto another street can leave the eye behind a lot wall; swing it round to the
    // street side once, the first time that happens. A drag in the meantime means the user
    // chose that angle, and Auto-rotate owns the azimuth, so neither gets overridden.
    const side = streetward(pose.position.x, pose.position.z);
    if (side !== street.current) {
      street.current = side;
      swingDue.current = true;
    }
    if (c.currentAction !== 0 || spinning) swingDue.current = false;
    const eye = c.getPosition(scratchEye);
    if (swingDue.current && inLot(eye.x, eye.z)) {
      swingDue.current = false;
      c.rotateAzimuthTo(c.azimuthAngle + wrapPi(side - c.azimuthAngle), !reduced.current);
    }
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={config.camera.minDistance}
      maxDistance={config.camera.maxDistance}
      minPolarAngle={config.camera.minPolarAngle}
      maxPolarAngle={config.camera.maxPolarAngle}
      // Damping is input latency: at the old 0.35/0.28 the camera took 1.16 s to settle and
      // had covered 6% of a rotation after 50 ms, which reads as lag even at a solid 60 fps.
      // Dragging stays nearly 1:1; the longer smoothTime only shapes the scripted fly-to.
      smoothTime={0.16}
      azimuthRotateSpeed={0.7}
      polarRotateSpeed={0.7}
      truckSpeed={0.9}
      draggingSmoothTime={0.07}
      boundaryFriction={0.2}
      onChange={() => {
        // Keep the orbit target inside the block so the user cannot pan away from the diorama.
        const c = controls.current;
        if (!c) return;
        // Reuse one scratch vector: this fires every frame during a drag. The box already
        // takes in the whole walk (`walk-routes.test.ts` holds it to that), so a tracked
        // walker is never clamped.
        const t = c.getTarget(scratchTarget);
        const { x0, x1, z0, z1 } = config.targetBounds;
        const cx = Math.max(x0, Math.min(x1, t.x));
        const cz = Math.max(z0, Math.min(z1, t.z));
        const cy = Math.max(0.3, Math.min(8, t.y));
        if (cx !== t.x || cz !== t.z || cy !== t.y) c.setTarget(cx, cy, cz, false);
      }}
    />
  );
}
