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
   * Yard trees. `height` drives the scale applied to whichever model loads, so keep every
   * trunk at least `canopyRatio[kind] * height` away from `houseBounds` — the shed, gate and
   * clothesline leave the four pockets used here. `radius` only sizes the proxy fallback.
   */
  trees: [
    { position: [-6.7, 0, 3.0] as const, height: 3.3, radius: 1.3, kind: 'sakura' as const },
    { position: [6.8, 0, 3.5] as const, height: 2.8, radius: 1.1, kind: 'tree' as const },
    { position: [-6.8, 0, -2.0] as const, height: 3.2, radius: 1.3, kind: 'tree' as const },
    { position: [6.7, 0, -6.5] as const, height: 4.8, radius: 1.9, kind: 'tree' as const },
  ],
  /** Clipped shrub rows inside the front wall; each row is spaced along X. */
  hedges: [
    { start: [-6.4, 0, 5.05] as const, count: 7, spacing: 0.72, height: 0.78 },
    { start: [3.4, 0, 5.05] as const, count: 4, spacing: 0.68, height: 0.72 },
  ],
  pole: { position: [8.6, 0, 7.2] as const, height: 8 },
} as const;
