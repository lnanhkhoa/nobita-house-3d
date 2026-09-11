/** Camera, scene and feature tunables. Metres, +Y up, street is at +Z. */
export const config = {
  camera: {
    /** Default hero framing: street level, slightly above eye height, looking at the house. */
    position: [0, 4.5, 20] as const,
    target: [0, 1.6, 0] as const,
    fov: 38,
    minDistance: 5,
    // Far enough to frame the whole block, not so far that the fogged road ends show.
    maxDistance: 38,
    /** Never look from below ground (max polar) or straight down (min polar). */
    minPolarAngle: Math.PI * 0.12,
    // Slightly higher floor than before: at the far orbit 0.49π grazes the neighbour walls.
    maxPolarAngle: Math.PI * 0.47,
  },
  /** Lot half-extents; OrbitControls target is clamped inside this box. */
  lot: { halfWidth: 9, halfDepth: 8 },
  models: {
    house: '/models/house.glb',
    environment: '/models/environment.glb',
    streets: '/models/streets.glb',
    neighbours: '/models/neighbours.glb',
    characterDir: '/models/characters',
    tree: '/models/props/tree.glb',
    hedge: '/models/props/hedge.glb',
    sakura: '/models/props/sakura.glb',
  },
} as const;
