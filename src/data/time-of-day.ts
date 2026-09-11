export type TimeOfDayId = 'dawn' | 'morning' | 'sunset' | 'night';

/** drei `<Sky>` scattering parameters. Eased like everything else, because `<Sky>` is a
 * BackSide box around the camera and therefore covers the whole frame. */
export interface SkyParams {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
}

export interface TimeOfDayPreset {
  id: TimeOfDayId;
  label: string;
  /** Sun direction in metres. Drives `<Sky>` and the shadow-casting key light together:
   * if the two ever diverge, the shadows contradict the sky. */
  sun: readonly [number, number, number];
  sky: SkyParams;
  /** Key directional light, the one that casts shadows. */
  key: { color: string; intensity: number };
  /** Bounce fill from the opposite side; never casts. */
  fill: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  background: string;
  fog: { color: string; near: number; far: number };
  stars: boolean;
  /** 0 = lamps off, 1 = full night glow. Drives the point lights and window emissive. */
  lampLevel: number;
}

/** The default, held separately so the fallback never depends on array order. */
const MORNING: TimeOfDayPreset = {
  id: 'morning',
  label: 'Morning',
  sun: [9, 14, 10],
  sky: { turbidity: 4, rayleigh: 1.2, mieCoefficient: 0.004, mieDirectionalG: 0.85 },
  key: { color: '#FFF3DF', intensity: 2.2 },
  fill: { color: '#DCE9FF', intensity: 0.5 },
  hemisphere: { sky: '#CFE6FF', ground: '#8A7A5A', intensity: 0.75 },
  background: '#BFE0FA',
  fog: { color: '#CFE6FA', near: 48, far: 110 },
  stars: false,
  lampLevel: 0,
};

/**
 * Four times of day. The sun swings from a low east at dawn, up and over for morning,
 * down to a low west at sunset, then below the horizon at night where `<Sky>` renders
 * dark and `<Stars>` takes over.
 */
export const timesOfDay: readonly TimeOfDayPreset[] = [
  {
    id: 'dawn',
    label: 'Dawn',
    sun: [-16, 2.6, 9],
    sky: { turbidity: 8, rayleigh: 2.6, mieCoefficient: 0.02, mieDirectionalG: 0.86 },
    key: { color: '#FFC79A', intensity: 1.5 },
    fill: { color: '#9FB6E8', intensity: 0.55 },
    hemisphere: { sky: '#F2C9B4', ground: '#6E6552', intensity: 0.55 },
    background: '#E8BFA8',
    fog: { color: '#E7C6B4', near: 40, far: 105 },
    stars: false,
    lampLevel: 0.35,
  },
  MORNING,
  {
    id: 'sunset',
    label: 'Sunset',
    sun: [17, 3.2, -6],
    sky: { turbidity: 10, rayleigh: 3.2, mieCoefficient: 0.03, mieDirectionalG: 0.9 },
    key: { color: '#FF9A4E', intensity: 1.9 },
    fill: { color: '#7E8FD6', intensity: 0.5 },
    hemisphere: { sky: '#F0A878', ground: '#6B5540', intensity: 0.55 },
    background: '#F0A06A',
    fog: { color: '#EDA478', near: 38, far: 100 },
    stars: false,
    lampLevel: 0.55,
  },
  {
    id: 'night',
    label: 'Night',
    // Below the horizon: `<Sky>` goes dark on its own, no special-casing needed.
    sun: [-10, -4, -8],
    sky: { turbidity: 12, rayleigh: 0.6, mieCoefficient: 0.004, mieDirectionalG: 0.8 },
    // A dim, cool "moon" from the opposite side keeps silhouettes readable.
    key: { color: '#9FB4E8', intensity: 0.55 },
    fill: { color: '#5C6EA8', intensity: 0.28 },
    hemisphere: { sky: '#2C3A63', ground: '#171B26', intensity: 0.35 },
    background: '#0C1326',
    fog: { color: '#111A30', near: 34, far: 95 },
    stars: true,
    lampLevel: 1,
  },
];

export const DEFAULT_TIME_OF_DAY: TimeOfDayId = MORNING.id;

export const timeOfDayById = (id: TimeOfDayId): TimeOfDayPreset =>
  timesOfDay.find((preset) => preset.id === id) ?? MORNING;
