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
  wall: { frontZ: 5.8, gateX: 0.8, gateWidth: 1.4 },
  sidewalk: { depth: 1.9, height: 0.12 },
  /** Characters stand on the sidewalk slab, not the road surface. */
  standY: 0.12,
  road: { depth: 6, startZ: 7.7 },
  /** Street trees. `height` drives the scale applied to whichever model loads. */
  trees: [
    { position: [-5.4, 0, 2.6] as const, height: 5.2, radius: 2.1 },
    { position: [5.6, 0, 3.4] as const, height: 4.6, radius: 1.9 },
    { position: [-3.0, 0, -4.2] as const, height: 3.4, radius: 1.4 },
  ],
  /** Clipped shrub rows inside the front wall; each row is spaced along X. */
  hedges: [
    { start: [-6.4, 0, 5.05] as const, count: 7, spacing: 0.72, height: 0.78 },
    { start: [3.4, 0, 5.05] as const, count: 4, spacing: 0.68, height: 0.72 },
  ],
  pole: { position: [8.6, 0, 7.2] as const, height: 8 },
} as const;
