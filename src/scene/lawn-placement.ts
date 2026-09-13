import {
  houseTransform,
  houseVariants,
  inSandlotBare,
  layout,
  type NeighbourLot,
  type Rect,
  type SandlotEdge,
  sandlotEdge,
  sandlotProps,
} from '../data/scene';
import { gardenClearance } from './firefly-placement';

/**
 * Where every grass blade in the block grows, and its shape. Read by `LawnGrass`, which
 * draws each lot's lawn as one instanced mesh.
 */

/** Grid pitch of the jittered placement on Nobita's lot, metres: ~400 blades per m². */
export const BLADE_SPACING = 0.05;
/**
 * Pitch on the neighbour lots: ~240 blades per m², each widened to keep the same cover. They
 * are seen from further off, and there are seven of them.
 */
export const NEIGHBOUR_SPACING = 0.065;
/** Blades keep this far off anything they would otherwise poke through. */
export const KEEP_OUT_MARGIN = 0.04;
export const MIN_HEIGHT = 0.08;
export const MAX_HEIGHT = 0.19;

/** A box around a point, half-extents in metres. */
function around(x: number, z: number, halfX: number, halfZ = halfX): Rect {
  return { x0: x - halfX, x1: x + halfX, z0: z - halfZ, z1: z + halfZ };
}

/**
 * Everything standing on the lawn, in world x/z. Mirrors the props in
 * `scripts/blender/env_build.py`, whose Blender Y is world z here (it flips Y on export).
 * The house, porch and boundary wall come from `gardenClearance` instead.
 */
export const LAWN_KEEP_OUTS: readonly Rect[] = [
  // Gravel band hugging the house base on both sides and the back.
  { x0: -4.6, x1: 4.6, z0: -3.95, z1: 3.6 },
  around(-6.0, -5.6, 1.2, 0.9), // shed slab
  { x0: -6.2, x1: -3.0, z0: 5.05, z1: 5.55 }, // flower bed
  around(-5.6, 2.0, 0.06), // garden tap post
  around(-5.6, 2.35, 0.275, 0.225), // tap basin
  around(-5.05, 2.25, 0.14), // bucket
  around(6.3, -5.9, 0.24), // stone lantern
  // Stepping stones from the porch toward the garden.
  around(1.05, 4.92, 0.25, 0.2),
  around(0.15, 4.6, 0.225, 0.18),
  around(-0.85, 4.35, 0.25, 0.2),
  around(-1.85, 4.15, 0.225, 0.18),
  // Clothesline posts and the bonsai bench legs.
  around(-2.0, -5.2, 0.05),
  around(1.5, -5.2, 0.05),
  around(4.3, 4.45, 0.04, 0.21),
  around(4.85, 4.45, 0.04, 0.21),
  around(5.4, 4.45, 0.04, 0.21),
];

function inRect(r: Rect, x: number, z: number, margin: number) {
  return x > r.x0 - margin && x < r.x1 + margin && z > r.z0 - margin && z < r.z1 + margin;
}

/** True where a blade may grow on Nobita's lot: in the garden, clear of house and props. */
export function isHeroLawn(x: number, z: number) {
  if (gardenClearance(x, z) < KEEP_OUT_MARGIN) return false;
  return !LAWN_KEEP_OUTS.some((r) => inRect(r, x, z, KEEP_OUT_MARGIN));
}

/** Neighbour lot walls stand on the lot edge; this is the half of them inside the lot. */
const NEIGHBOUR_WALL_HALF = 0.1;
/** Around each neighbour house: the plinth (7 cm proud) and the downpipes (11 cm). */
const NEIGHBOUR_HOUSE_APRON = 0.12;

/**
 * Where a blade may grow on a neighbour lot: inside its wall, clear of the house, the step at
 * its door and the AC unit off its back wall. Both follow `neighbours_build.py`: the step sits
 * a third of the house width off centre toward the door side, 1.5 m wide and 0.7 m out; the
 * AC unit stands 0.9 m in from the other end of the back wall, 0.85 m by 0.36 m.
 */
export function neighbourLawn(n: NeighbourLot) {
  const { bounds, centre, yaw } = houseTransform(n);
  const v = houseVariants[n.variant];
  const inside: Rect = {
    x0: n.lot.x0 + NEIGHBOUR_WALL_HALF,
    x1: n.lot.x1 - NEIGHBOUR_WALL_HALF,
    z0: n.lot.z0 + NEIGHBOUR_WALL_HALF,
    z1: n.lot.z1 - NEIGHBOUR_WALL_HALF,
  };
  const house = around(
    (bounds.x0 + bounds.x1) / 2,
    (bounds.z0 + bounds.z1) / 2,
    (bounds.x1 - bounds.x0) / 2 + NEIGHBOUR_HOUSE_APRON,
    (bounds.z1 - bounds.z0) / 2 + NEIGHBOUR_HOUSE_APRON,
  );
  // House-local (along the street, toward it) to world, as `place()` in the builder does.
  // Yaws are quarter turns, so a local box stays axis-aligned and only swaps its extents.
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  const quarterTurn = Math.abs(s) > 0.5;
  const local = (lx: number, lz: number, halfAlong: number, halfOut: number) =>
    around(
      centre[0] + lx * c + lz * s,
      centre[1] - lx * s + lz * c,
      quarterTurn ? halfOut : halfAlong,
      quarterTurn ? halfAlong : halfOut,
    );
  const side = n.mirror ? -1 : 1;
  const step = local(side * v.width * 0.3, v.depth / 2 + 0.35, 0.75, 0.35);
  const ac = local(-side * (v.width / 2 - 0.9), -v.depth / 2 - 0.22, 0.425, 0.18);
  return (x: number, z: number) =>
    inRect(inside, x, z, -KEEP_OUT_MARGIN) &&
    !inRect(house, x, z, KEEP_OUT_MARGIN) &&
    !inRect(step, x, z, KEEP_OUT_MARGIN) &&
    !inRect(ac, x, z, KEEP_OUT_MARGIN);
}

/**
 * Where a blade may grow on the sandlot: inside its walls and fence (the open edge runs to
 * the sidewalk), off the worn patches and out from under the pipes, rings and bamboo. Grass
 * runs right under the two trees and the bushes, as it does on every lot.
 */
export function sandlotLawn() {
  const { lot } = layout.sandlot;
  const inset = (edge: SandlotEdge) => {
    const kind = sandlotEdge(edge);
    return kind === 'wall' ? NEIGHBOUR_WALL_HALF : kind === 'fence' ? 0.03 : 0;
  };
  const inside: Rect = {
    x0: lot.x0 + inset('-x'),
    x1: lot.x1 - inset('+x'),
    z0: lot.z0 + inset('-z'),
    z1: lot.z1 - inset('+z'),
  };
  const props = Object.values(sandlotProps());
  return (x: number, z: number) =>
    inRect(inside, x, z, -KEEP_OUT_MARGIN) &&
    !inSandlotBare(x, z) &&
    !props.some((p) => inRect(p, x, z, KEEP_OUT_MARGIN));
}

/** Deterministic pseudo-random in [0,1) from two integers and a channel. */
function rand(i: number, j: number, channel: number) {
  const x = Math.sin(i * 127.1 + j * 311.7 + channel * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Smooth field in [0,1] over the lawn, a few metres per swell. Drives height and tint
 * together, so the lawn rolls in soft drifts instead of flickering blade to blade.
 */
export function lawnSwell(x: number, z: number) {
  const s =
    0.5 * Math.sin(x * 0.9 + z * 0.4) +
    0.3 * Math.sin(x * 0.37 - z * 1.1 + 1.3) +
    0.2 * Math.sin(-x * 1.7 + z * 0.8 + 4.1);
  return 0.5 + 0.5 * s;
}

export interface LawnBlades {
  count: number;
  /** Per blade: x, z, yaw, wind phase. */
  base: Float32Array;
  /** Per blade: height, width, lean (tip offset as a fraction of height), tint. */
  shape: Float32Array;
}

/**
 * Jittered grid over `area`, keeping the cells where `grows` allows a blade: even coverage
 * with no clumps or bald spots, and the same lawn on every load. The grid is indexed from the
 * world origin, so two lots never repeat each other's pattern.
 */
export function placeLawnBlades(
  area: Rect,
  grows: (x: number, z: number) => boolean,
  spacing = BLADE_SPACING,
): LawnBlades {
  const i0 = Math.floor(area.x0 / spacing);
  const j0 = Math.floor(area.z0 / spacing);
  const cols = Math.ceil(area.x1 / spacing) - i0;
  const rows = Math.ceil(area.z1 / spacing) - j0;
  const base = new Float32Array(cols * rows * 4);
  const shape = new Float32Array(cols * rows * 4);
  // Fewer blades, each wider, so a sparser lot still reads as full cover.
  const widen = spacing / BLADE_SPACING;
  let count = 0;
  for (let i = i0; i < i0 + cols; i++) {
    for (let j = j0; j < j0 + rows; j++) {
      const x = (i + rand(i, j, 0)) * spacing;
      const z = (j + rand(i, j, 1)) * spacing;
      if (!inRect(area, x, z, 0) || !grows(x, z)) continue;
      const swell = lawnSwell(x, z);
      const k = count * 4;
      base[k] = x;
      base[k + 1] = z;
      base[k + 2] = rand(i, j, 2) * Math.PI * 2;
      base[k + 3] = rand(i, j, 3) * Math.PI * 2;
      const height = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * (0.65 * swell + 0.35 * rand(i, j, 4));
      shape[k] = height;
      shape[k + 1] = (0.028 + 0.018 * rand(i, j, 5)) * widen;
      shape[k + 2] = 0.15 + 0.35 * rand(i, j, 6);
      shape[k + 3] = 0.86 + 0.14 * swell + 0.1 * (rand(i, j, 7) - 0.5);
      count++;
    }
  }
  return { count, base: base.subarray(0, count * 4), shape: shape.subarray(0, count * 4) };
}
