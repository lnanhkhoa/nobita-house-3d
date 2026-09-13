import { describe, expect, it } from 'vitest';
import { heroLot, houseTransform, houseVariants, inHeroLot, layout } from '../data/scene';
import { gardenClearance } from './firefly-placement';
import {
  BLADE_SPACING,
  isHeroLawn,
  KEEP_OUT_MARGIN,
  LAWN_KEEP_OUTS,
  MAX_HEIGHT,
  MIN_HEIGHT,
  NEIGHBOUR_SPACING,
  neighbourLawn,
  placeLawnBlades,
} from './lawn-placement';

describe('lawn placement', () => {
  const blades = placeLawnBlades(heroLot, isHeroLawn);
  // NaN for a missing entry fails every range check below, so a short array cannot pass.
  const at = (n: number) => ({
    x: blades.base[n * 4] ?? Number.NaN,
    z: blades.base[n * 4 + 1] ?? Number.NaN,
    height: blades.shape[n * 4] ?? Number.NaN,
  });

  it('grows the same lawn on every load', () => {
    const again = placeLawnBlades(heroLot, isHeroLawn);
    expect(again.count).toBe(blades.count);
    expect(again.base).toEqual(blades.base);
    expect(again.shape).toEqual(blades.shape);
  });

  it('covers the open garden densely but stays one affordable draw', () => {
    // ~120 m² of open lawn at one blade per grid cell, minus what the keep-outs remove.
    const perSquareMetre = 1 / (BLADE_SPACING * BLADE_SPACING);
    expect(blades.count).toBeGreaterThan(90 * perSquareMetre * 0.8);
    expect(blades.count).toBeLessThan(50_000);
  });

  it("keeps every blade inside Nobita's wall, off the house, porch and every prop", () => {
    // Collected, not asserted per blade: 40k blades × every keep-out is too many expect calls.
    const strays: { x: number; z: number }[] = [];
    for (let n = 0; n < blades.count; n++) {
      const { x, z } = at(n);
      const inProp = LAWN_KEEP_OUTS.some(
        (r) =>
          x > r.x0 - KEEP_OUT_MARGIN &&
          x < r.x1 + KEEP_OUT_MARGIN &&
          z > r.z0 - KEEP_OUT_MARGIN &&
          z < r.z1 + KEEP_OUT_MARGIN,
      );
      if (!inHeroLot(x, z) || gardenClearance(x, z) < KEEP_OUT_MARGIN || inProp) strays.push({ x, z });
    }
    expect(strays).toEqual([]);
  });

  it('leaves the stepping stones, shed and flower bed bare, and grows in the side yards', () => {
    expect(isHeroLawn(-0.85, 4.35)).toBe(false);
    expect(isHeroLawn(-6.0, -5.6)).toBe(false);
    expect(isHeroLawn(-4.6, 5.3)).toBe(false);
    expect(isHeroLawn(-6.2, 0)).toBe(true);
    expect(isHeroLawn(6.2, 0)).toBe(true);
  });

  it('keeps blade heights to a kept lawn', () => {
    const heights = Array.from({ length: blades.count }, (_, n) => at(n).height);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(MIN_HEIGHT);
    expect(Math.max(...heights)).toBeLessThanOrEqual(MAX_HEIGHT);
  });
});

describe('neighbour lawns', () => {
  const lots = layout.neighbours.map((n) => ({
    n,
    blades: placeLawnBlades(n.lot, neighbourLawn(n), NEIGHBOUR_SPACING),
    house: houseTransform(n).bounds,
  }));

  it('plants every neighbour lot, sparser than Nobita’s', () => {
    for (const { blades } of lots) {
      expect(blades.count).toBeGreaterThan(15_000);
      expect(blades.count).toBeLessThan(35_000);
    }
  });

  it('keeps every blade inside its own lot wall and off the house', () => {
    const strays: string[] = [];
    for (const { n, blades, house } of lots) {
      for (let k = 0; k < blades.count; k++) {
        const x = blades.base[k * 4] ?? Number.NaN;
        const z = blades.base[k * 4 + 1] ?? Number.NaN;
        const inLot = x > n.lot.x0 && x < n.lot.x1 && z > n.lot.z0 && z < n.lot.z1;
        const onHouse = x > house.x0 && x < house.x1 && z > house.z0 && z < house.z1;
        if (!inLot || onHouse) strays.push(`${n.id} ${x},${z}`);
      }
    }
    expect(strays).toEqual([]);
  });

  it('leaves the front door step and the AC unit behind each house bare', () => {
    for (const n of layout.neighbours) {
      const { centre, yaw } = houseTransform(n);
      const v = houseVariants[n.variant];
      const side = n.mirror ? -1 : 1;
      // House-local (along the street, toward it) to world, as neighbours_build.py places them.
      const world = (lx: number, lz: number) =>
        [
          centre[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw),
          centre[1] - lx * Math.sin(yaw) + lz * Math.cos(yaw),
        ] as const;
      const grows = neighbourLawn(n);
      expect(grows(...world(side * v.width * 0.3, v.depth / 2 + 0.35))).toBe(false);
      expect(grows(...world(-side * (v.width / 2 - 0.9), -v.depth / 2 - 0.22))).toBe(false);
      // Beside the step, the lawn runs right up to the house again.
      expect(grows(...world(-side * v.width * 0.3, v.depth / 2 + 0.4))).toBe(true);
    }
  });
});
