import { describe, expect, it } from 'vitest';
import { DEFAULT_TIME_OF_DAY, timeOfDayById, timesOfDay } from './time-of-day';

describe('time-of-day presets', () => {
  it('has unique ids and a resolvable default', () => {
    const ids = timesOfDay.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_TIME_OF_DAY);
    expect(timeOfDayById(DEFAULT_TIME_OF_DAY).id).toBe(DEFAULT_TIME_OF_DAY);
  });

  it('puts the sun above the horizon by day and below it at night', () => {
    for (const preset of timesOfDay) {
      const [, y] = preset.sun;
      if (preset.id === 'night') expect(y).toBeLessThan(0);
      else expect(y).toBeGreaterThan(0);
    }
  });

  it('lights the lamps only as daylight fades, and stars only at night', () => {
    const level = (id: string) => timesOfDay.find((p) => p.id === id)?.lampLevel ?? -1;
    expect(level('morning')).toBe(0);
    expect(level('dawn')).toBeGreaterThan(0);
    expect(level('sunset')).toBeGreaterThan(level('dawn'));
    expect(level('night')).toBe(1);
    expect(timesOfDay.filter((p) => p.stars).map((p) => p.id)).toEqual(['night']);
  });

  it('keeps every fog range and colour usable', () => {
    for (const preset of timesOfDay) {
      expect(preset.fog.near).toBeGreaterThan(0);
      expect(preset.fog.far).toBeGreaterThan(preset.fog.near);
      expect(preset.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.fog.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
