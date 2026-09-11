/** Static scene layout in metres. Origin = centre of the house footprint at ground level. +Y up, street at +Z. */
export const layout = {
  house: {
    footprint: { width: 8.4, depth: 7.2 },
    storeyHeight: 2.8,
    roofHeight: 1.9,
    /** Second storey is set back on the right, like the canon facade. */
    upperOffsetX: -0.6,
    upperWidthScale: 0.82,
  },
  lot: { width: 15, depth: 13, wallHeight: 1.6, wallThickness: 0.22 },
  /** Front wall runs along this z; the gate opening is centred at x = gateX. */
  /** gateX matches the house front door so the gate faces the entrance. */
  wall: { frontZ: 5.8, gateX: 2.05, gateWidth: 1.4 },
  sidewalk: { depth: 1.9, height: 0.12 },
  /** Characters stand on the sidewalk slab, not the road surface. */
  standY: 0.12,
  road: { depth: 6, startZ: 7.7 },
  /**
   * Public realm around the lot: a crossroads made of the front road (along X, the `road`
   * keys above) and a side road (along Z) west of the lot. Both run ±length/2 from the
   * origin and vanish in the fog. `scripts/blender/streets_build.py` mirrors these numbers.
   */
  streets: {
    length: 84,
    /** Side road carriageway, west of the lot's left wall. */
    side: { startX: -15.4, endX: -9.4 },
    /**
     * Radius of the kerb arc at each of the four crossroads corners. Kept under the 1.9 m
     * sidewalk depth so an arc never runs off the far edge of the strip it belongs to.
     */
    kerbRadius: 1.5,
    poleHeight: 8,
    /**
     * Utility poles, [x, z]. Each stands on a sidewalk strip; the two flanking the junction
     * sit clear of the kerb arc, and the wires run pole to pole in the order listed.
     */
    poles: [
      [-16.5, 7.2],
      [-8.45, 7.2],
      [8.6, 7.2],
      [33, 7.2],
      [-8.45, -22],
    ],
  },
  /**
   * Neighbour lots, clockwise from the lot east of Nobita's. `facing` is the direction the
   * front door looks; the house sits `HOUSE_SETBACK` back from that edge of its lot.
   * `offset` shifts it along the street so the row does not read as stamped.
   * `scripts/blender/neighbours_build.py` copies this table.
   */
  neighbours: [
    {
      id: 'east',
      lot: { x0: 7.9, x1: 21.9, z0: -7.2, z1: 5.8 },
      facing: '+z',
      variant: 'gable2',
      offset: 0.6,
      wall: '#F2EEE6',
      roof: '#4A3A2E',
    },
    {
      id: 'east-back',
      lot: { x0: 7.9, x1: 21.9, z0: -21.2, z1: -7.6 },
      facing: '-z',
      variant: 'gable1',
      offset: -0.5,
      wall: '#E4E2DC',
      roof: '#4F5B70',
    },
    {
      id: 'back',
      lot: { x0: -7.5, x1: 7.5, z0: -21.2, z1: -7.6 },
      facing: '-z',
      variant: 'hip2',
      offset: 0.4,
      wall: '#EFE3C6',
      roof: '#5E6B82',
    },
    {
      id: 'west-back',
      lot: { x0: -31.3, x1: -17.3, z0: -21.2, z1: -7.6 },
      facing: '+x',
      variant: 'hip2',
      offset: -0.7,
      wall: '#E6E4E0',
      roof: '#5A4636',
    },
    {
      id: 'west',
      lot: { x0: -31.3, x1: -17.3, z0: -7.2, z1: 5.8 },
      facing: '+x',
      variant: 'gable2',
      offset: 0.5,
      wall: '#F0DCCF',
      roof: '#4F5B70',
    },
    {
      id: 'south-west',
      lot: { x0: -31.3, x1: -17.3, z0: 15.6, z1: 28.6 },
      facing: '-z',
      variant: 'gable1',
      offset: 0.8,
      wall: '#EFE3C6',
      roof: '#4A3A2E',
    },
    {
      id: 'south-east',
      lot: { x0: 9.4, x1: 23.4, z0: 15.6, z1: 28.6 },
      facing: '-z',
      variant: 'hip2',
      offset: -0.6,
      wall: '#F4F1EA',
      roof: '#5E6B82',
    },
  ],
  /**
   * The plot straight across the road from the gate is a coin parking lot, not a house: the
   * default camera at (0, 4.5, 20) stands inside it and a building there would hide the hero.
   */
  parking: { lot: { x0: -7.5, x1: 9, z0: 15.6, z1: 28.6 }, bays: 5 },
  /**
   * Bounding box of `house.glb`, porch included. It is the planting keep-out: a tree whose
   * canopy would reach inside grows through the roof.
   */
  houseBounds: { minX: -4.84, maxX: 4.84, minZ: -4.25, maxZ: 5.45 },
  /**
   * Widest canopy radius each plant model reaches, as a fraction of the height it is scaled
   * to. Measured from the exported GLBs and inflated by the +8% scale jitter `Foliage`
   * applies per instance, so it is the worst case for any one tree.
   */
  canopyRatio: { tree: 0.55, sakura: 0.5 },
  /**
   * Every tree in the block. The first four are Nobita's yard; every neighbour lot carries
   * planting of its own, so no yard reads bare from any orbit. `height` drives the scale
   * applied to whichever model loads, so keep every trunk at least `canopyRatio[kind] *
   * height` clear of the house on its own lot — `scene.test.ts` enforces exactly that.
   * `radius` only sizes the proxy fallback. Trees outside the hero lot cast no shadows, so
   * this table's length is a draw-call cost only.
   */
  trees: [
    { position: [-6.7, 0, 3.0] as const, height: 3.3, radius: 1.3, kind: 'sakura' as const },
    { position: [6.8, 0, 3.5] as const, height: 2.8, radius: 1.1, kind: 'tree' as const },
    { position: [-6.8, 0, -2.0] as const, height: 3.2, radius: 1.3, kind: 'tree' as const },
    { position: [6.7, 0, -6.5] as const, height: 4.8, radius: 1.9, kind: 'tree' as const },
    { position: [9.3, 0, -5.3] as const, height: 4.6, radius: 1.8, kind: 'tree' as const },
    { position: [20.7, 0, 4.3] as const, height: 3.4, radius: 1.3, kind: 'tree' as const },
    { position: [9.5, 0, 4.3] as const, height: 3.0, radius: 1.2, kind: 'sakura' as const },
    { position: [20.4, 0, -9.9] as const, height: 4.0, radius: 1.6, kind: 'tree' as const },
    { position: [20.4, 0, -19.6] as const, height: 4.0, radius: 1.6, kind: 'tree' as const },
    { position: [9.8, 0, -9.7] as const, height: 3.0, radius: 1.2, kind: 'tree' as const },
    { position: [-5.8, 0, -9.8] as const, height: 5.0, radius: 2.0, kind: 'tree' as const },
    { position: [5.9, 0, -9.6] as const, height: 4.4, radius: 1.7, kind: 'sakura' as const },
    { position: [-5.8, 0, -19.6] as const, height: 4.0, radius: 1.6, kind: 'tree' as const },
    { position: [5.9, 0, -19.6] as const, height: 3.4, radius: 1.4, kind: 'tree' as const },
    { position: [-29.5, 0, -19.0] as const, height: 4.2, radius: 1.7, kind: 'tree' as const },
    { position: [-29.5, 0, -11.2] as const, height: 3.8, radius: 1.5, kind: 'tree' as const },
    { position: [-24.5, 0, -9.5] as const, height: 3.0, radius: 1.2, kind: 'sakura' as const },
    { position: [-29.5, 0, 4.4] as const, height: 4.8, radius: 1.9, kind: 'tree' as const },
    { position: [-29.5, 0, -4.0] as const, height: 4.4, radius: 1.8, kind: 'tree' as const },
    { position: [-18.8, 0, 4.7] as const, height: 3.2, radius: 1.3, kind: 'tree' as const },
    { position: [-29.7, 0, 17.2] as const, height: 4.2, radius: 1.7, kind: 'tree' as const },
    { position: [-29.7, 0, 27.0] as const, height: 4.2, radius: 1.7, kind: 'tree' as const },
    { position: [-19.4, 0, 27.2] as const, height: 3.2, radius: 1.3, kind: 'sakura' as const },
    { position: [21.6, 0, 27.0] as const, height: 4.4, radius: 1.7, kind: 'tree' as const },
    { position: [10.7, 0, 27.0] as const, height: 3.6, radius: 1.4, kind: 'tree' as const },
    { position: [21.6, 0, 17.4] as const, height: 4.0, radius: 1.6, kind: 'tree' as const },
  ],
  /**
   * Clipped shrub rows inside a front wall, running along the wall: along X by default,
   * `axis: 'z'` for lots whose gate wall stands on an X edge. Each row stops clear of the
   * gate opening, which `scene.test.ts` keeps outside the house footprint.
   */
  hedges: [
    { start: [-6.4, 0, 5.05] as const, count: 7, spacing: 0.72, height: 0.78, axis: 'x' as const },
    { start: [3.4, 0, 5.05] as const, count: 4, spacing: 0.68, height: 0.72, axis: 'x' as const },
    { start: [9.4, 0, 5.05] as const, count: 6, spacing: 0.75, height: 0.75, axis: 'x' as const },
    { start: [10.2, 0, 16.35] as const, count: 6, spacing: 0.75, height: 0.72, axis: 'x' as const },
    { start: [-18.05, 0, -5.9] as const, count: 5, spacing: 0.75, height: 0.72, axis: 'z' as const },
    { start: [-30.4, 0, 16.35] as const, count: 5, spacing: 0.75, height: 0.75, axis: 'x' as const },
    { start: [-6.6, 0, -20.45] as const, count: 4, spacing: 0.75, height: 0.75, axis: 'x' as const },
    { start: [9.9, 0, -20.45] as const, count: 5, spacing: 0.75, height: 0.72, axis: 'x' as const },
  ],
} as const;

export type HouseVariant = 'hip2' | 'gable2' | 'gable1';
/** Direction a house's front door looks. No lot needs `-x`: nothing faces away from the block. */
export type Facing = '+z' | '-z' | '+x';

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface NeighbourLot {
  id: string;
  lot: Rect;
  facing: Facing;
  variant: HouseVariant;
  offset: number;
  wall: string;
  roof: string;
}

/** Distance from the facing lot edge to the front wall of the house standing on it. */
export const HOUSE_SETBACK = 3.2;

/**
 * The three neighbour house shapes, shared by the R3F proxy and `neighbours_build.py`.
 * `width` runs along the street, `depth` away from it. Roof sizes already include the 0.5 m
 * eave overhang; heights are `span / 2 * tan(25°)` for the 25° pitch the whole block uses.
 * `ridge` is the length of the ridge line along `ridgeAxis`; equal to the roof size on that
 * axis it makes a gable, shorter it makes a hip.
 */
export const houseVariants = {
  hip2: {
    storeys: 2,
    width: 7.5,
    depth: 6.5,
    /** Upper storey is pulled in on all four sides by this much. */
    upperInset: 0.6,
    groundHeight: 2.75,
    eaveHeight: 5.3,
    roof: { width: 7.3, depth: 6.3, height: 1.47, ridge: 1.0, ridgeAxis: 'x' as const },
  },
  gable2: {
    storeys: 2,
    width: 8.0,
    depth: 6.0,
    upperInset: 0,
    groundHeight: 2.75,
    eaveHeight: 5.3,
    roof: { width: 9.0, depth: 7.0, height: 1.63, ridge: 9.0, ridgeAxis: 'x' as const },
  },
  gable1: {
    storeys: 1,
    width: 8.5,
    depth: 6.5,
    upperInset: 0,
    groundHeight: 2.75,
    eaveHeight: 2.75,
    /** Gable end faces the street, so the ridge runs away from it. */
    roof: { width: 9.5, depth: 7.5, height: 2.22, ridge: 7.5, ridgeAxis: 'z' as const },
  },
} satisfies Record<HouseVariant, unknown>;

export interface HousePlacement {
  centre: readonly [number, number];
  /** Radians about +Y. 0 faces +Z, the same convention as the characters. */
  yaw: number;
  /** Ridge height above ground: the collider box and the fog/shadow budget both use it. */
  height: number;
  /** World-space footprint of the ground storey, after `yaw`. Roof overhang excluded. */
  bounds: Rect;
}

/**
 * Where the house on a lot stands. Proxy geometry, the camera colliders, the layout test and
 * `neighbours_build.py` all derive from this one function so they cannot drift apart.
 */
export function houseTransform(n: NeighbourLot): HousePlacement {
  const v = houseVariants[n.variant];
  const { x0, x1, z0, z1 } = n.lot;
  let cx: number;
  let cz: number;
  let yaw: number;
  if (n.facing === '+z') {
    cx = (x0 + x1) / 2 + n.offset;
    cz = z1 - HOUSE_SETBACK - v.depth / 2;
    yaw = 0;
  } else if (n.facing === '-z') {
    cx = (x0 + x1) / 2 + n.offset;
    cz = z0 + HOUSE_SETBACK + v.depth / 2;
    yaw = Math.PI;
  } else {
    // Rotating +Z by +π/2 about Y lands on +X (three.js is right-handed).
    cz = (z0 + z1) / 2 + n.offset;
    cx = x1 - HOUSE_SETBACK - v.depth / 2;
    yaw = Math.PI / 2;
  }
  const alongX = n.facing === '+x' ? v.depth : v.width;
  const alongZ = n.facing === '+x' ? v.width : v.depth;
  return {
    centre: [cx, cz],
    yaw,
    height: v.eaveHeight + v.roof.height,
    bounds: {
      x0: cx - alongX / 2,
      x1: cx + alongX / 2,
      z0: cz - alongZ / 2,
      z1: cz + alongZ / 2,
    },
  };
}

/** Nobita's lot. The hero yard is lit and shadowed to a higher standard than the block. */
export const heroLot: Rect = {
  x0: -layout.lot.width / 2,
  x1: layout.lot.width / 2,
  z0: layout.wall.frontZ - layout.lot.depth,
  z1: layout.wall.frontZ,
};

export function inHeroLot(x: number, z: number): boolean {
  return x >= heroLot.x0 && x <= heroLot.x1 && z >= heroLot.z0 && z <= heroLot.z1;
}

/**
 * `allLots` and `onSidewalk` below have no runtime caller: they exist so `scene.test.ts` can
 * state the layout invariants — every lot disjoint from every road, every pole on pavement —
 * against the same numbers the scene is built from, instead of against a copy.
 */

/** Every lot in the block that a tree may stand on, Nobita's included. */
export function allLots(): Rect[] {
  return [heroLot, ...layout.neighbours.map((n) => n.lot), layout.parking.lot];
}

/** True when (x, z) is on one of the four sidewalk strips, junction corners included. */
export function onSidewalk(x: number, z: number): boolean {
  const { sidewalk, road, streets, lot, wall } = layout;
  const half = streets.length / 2;
  if (Math.abs(x) > half || Math.abs(z) > half) return false;
  const nearFront = z >= wall.frontZ && z <= wall.frontZ + sidewalk.depth;
  const farFront = z >= road.startZ + road.depth && z <= road.startZ + road.depth + sidewalk.depth;
  const nearSide = x >= streets.side.endX && x <= -lot.width / 2;
  const farSide = x >= streets.side.startX - sidewalk.depth && x <= streets.side.startX;
  // A strip stops at the kerb of the road that crosses it.
  const acrossSideRoad = x > streets.side.startX && x < streets.side.endX;
  const acrossFrontRoad = z > road.startZ && z < road.startZ + road.depth;
  if ((nearFront || farFront) && !acrossSideRoad) return true;
  return (nearSide || farSide) && !acrossFrontRoad;
}
