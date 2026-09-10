import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { config } from '../config';
import { characterById } from '../data/characters';
import { useAppStore } from '../state/store';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Orbit with lot-bounded target; flies to the selected character and back on reset. */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const selectedId = useAppStore((s) => s.selectedCharacterId);
  const resetToken = useAppStore((s) => s.resetToken);
  const autoRotate = useAppStore((s) => s.autoRotate);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (import.meta.env.DEV)
      (window as unknown as { __cam: unknown }).__cam = { camera, controls, scene, gl };
  }, [camera, scene, gl]);

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
      smoothTime={0.35}
      boundaryFriction={0.2}
      onChange={() => {
        // Keep the orbit target inside the lot so the user cannot pan away from the diorama.
        const c = controls.current;
        if (!c) return;
        const t = c.getTarget(new Vector3());
        const { halfWidth, halfDepth } = config.lot;
        const cx = Math.max(-halfWidth, Math.min(halfWidth, t.x));
        const cz = Math.max(-halfDepth, Math.min(halfDepth + 4, t.z));
        const cy = Math.max(0.3, Math.min(8, t.y));
        if (cx !== t.x || cz !== t.z || cy !== t.y) c.setTarget(cx, cy, cz, false);
      }}
    />
  );
}
