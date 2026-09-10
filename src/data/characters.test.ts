import { describe, expect, it } from 'vitest';
import { characters } from './characters';
import { layout } from './scene';

describe('character data', () => {
  it('has unique kebab-case ids', () => {
    const ids = characters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });
  it('stands on the sidewalk in front of the wall, ordered left to right', () => {
    const sidewalkStart = layout.wall.frontZ;
    const sidewalkEnd = layout.wall.frontZ + layout.sidewalk.depth;
    for (const c of characters) {
      expect(c.position[1]).toBe(layout.standY);
      expect(c.position[2]).toBeGreaterThan(sidewalkStart);
      expect(c.position[2]).toBeLessThan(sidewalkEnd + 0.1);
      expect(c.height).toBeGreaterThan(1);
      expect(c.height).toBeLessThan(1.8);
    }
    const xs = characters.map((c) => c.position[0]);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });
});
