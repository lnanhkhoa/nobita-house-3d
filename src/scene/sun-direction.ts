import type { Vector3 } from 'three';

/**
 * Highest elevation the sun is *drawn* at. The orbit camera always looks slightly down at a
 * target near the ground, so the top of the frame sits at ~14 degrees, while the morning sun is
 * at 46: drawn truthfully it would never be on screen. The disc keeps the true azimuth, so it
 * lines up with the shadows, but drops to this elevation. At 9.5 degrees it landed in the top
 * ~45 px of the frame, under the title card and toolbar; at 7 its ~2.2 degree disc clears
 * both. The key light in `Lighting` still uses the true sun vector.
 */
export const SUN_MAX_ELEVATION = (7 * Math.PI) / 180;

/** Writes the drawn sun direction into `out`: true azimuth, elevation capped for display. */
export function displaySunDirection(sun: Vector3, out: Vector3) {
  out.copy(sun).normalize();
  const cap = Math.sin(SUN_MAX_ELEVATION);
  if (out.y > cap) {
    const across = Math.hypot(out.x, out.z) || 1;
    const scale = Math.cos(SUN_MAX_ELEVATION) / across;
    out.set(out.x * scale, cap, out.z * scale);
  }
  return out;
}
