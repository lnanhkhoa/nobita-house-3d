import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { config } from '../config';
import { characterById } from '../data/characters';
import { useAppStore } from '../state/store';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scratch vector for the per-frame target clamp; avoids allocating during a drag. */
const scratchTarget = new Vector3();

/** Orbit with lot-bounded target; flies to the selected character and back on reset. */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
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
      resetToken > 0 && !reducedMotion(),
    );
  }, [resetToken]);

  useEffect(() => {
    const c = controls.current;
    const def = selectedId ? characterById(selectedId) : undefined;
    if (!c) return;
    if (!def) {
      c.setFocalOffset(0, 0, 0, !reducedMotion());
      return;
    }
    const [x, , z] = def.position;
    // Frame the whole figure: eye height at 60% of the body, standing back ~2.9 body-heights.
    const eye = def.height * 0.6;
    const dist = def.height * 2.9;
    // On desktop the info card covers the right third, so shift the subject left of centre.
    const offsetX = window.innerWidth >= 1024 ? def.height * 0.55 : 0;
    c.setFocalOffset(offsetX, 0, 0, !reducedMotion());
    c.setLookAt(x + dist * 0.28, eye + def.height * 0.28, z + dist, x, eye, z, !reducedMotion());
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
        // Keep the orbit target inside the lot so the user cannot pan away from the diorama.
        const c = controls.current;
        if (!c) return;
        // Reuse one scratch vector: this fires every frame during a drag.
        const t = c.getTarget(scratchTarget);
        const { halfWidth, halfDepth } = config.lot;
        const cx = Math.max(-halfWidth, Math.min(halfWidth, t.x));
        const cz = Math.max(-halfDepth, Math.min(halfDepth + 4, t.z));
        const cy = Math.max(0.3, Math.min(8, t.y));
        if (cx !== t.x || cz !== t.z || cy !== t.y) c.setTarget(cx, cy, cz, false);
      }}
    />
  );
}
