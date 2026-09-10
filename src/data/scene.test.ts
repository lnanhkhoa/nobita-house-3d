import { describe, expect, it } from 'vitest';
import { layout } from './scene';

const { houseBounds: house, canopyRatio, lot, wall } = layout;

/** Shortest horizontal distance from a point to the house keep-out box; 0 when inside it. */
function distanceToHouse(x: number, z: number) {
  const dx = Math.max(house.minX - x, 0, x - house.maxX);
  const dz = Math.max(house.minZ - z, 0, z - house.maxZ);
  return Math.hypot(dx, dz);
}

describe('yard layout', () => {
  it('keeps every tree canopy clear of the house', () => {
    for (const tree of layout.trees) {
      const [x, , z] = tree.position;
      expect(distanceToHouse(x, z)).toBeGreaterThan(canopyRatio[tree.kind] * tree.height);
    }
  });
  it('plants every trunk inside the lot walls', () => {
    const halfW = lot.width / 2 - lot.wallThickness;
    for (const tree of layout.trees) {
      const [x, , z] = tree.position;
      expect(Math.abs(x)).toBeLessThan(halfW);
      expect(z).toBeLessThan(wall.frontZ - lot.wallThickness);
      expect(z).toBeGreaterThan(wall.frontZ - lot.depth + lot.wallThickness);
    }
  });
});
