export type TimeOfDayId = 'dawn' | 'morning' | 'sunset' | 'night';

export interface TimeOfDayPreset {
  id: TimeOfDayId;
  label: string;
  /** Sun direction in metres. Drives the sky's sun glow and the shadow-casting key light
   * together: if the two ever diverge, the shadows contradict the sky. */
  sun: readonly [number, number, number];
  /**
   * Sky colour straight overhead. The horizon deliberately has no field of its own: it is the
   * fog colour, so the fogged ground meets the sky without a seam at any time of day.
   */
  zenith: string;
  /** Halo around the sun on the dome; 0 hides it. Strongest when the sun is low. */
  sunGlow: { color: string; strength: number };
  /** The visible sun disc; 0 hides it (night). */
  sunDisc: { color: string; strength: number };
  /** Cloud billboards: tint follows the light (pink dawn, lit-orange sunset); 0 hides them. */
  clouds: { tint: string; opacity: number };
  /** Key directional light, the one that casts shadows. */
  key: { color: string; intensity: number };
  /** Bounce fill from the opposite side; never casts. */
  fill: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  fog: { color: string; near: number; far: number };
  stars: boolean;
  /** 0 = lamps off, 1 = full night glow. Drives the point lights and window emissive. */
  lampLevel: number;
}

/** The default, held separately so the fallback never depends on array order. Sky blue is
 * matched to the hero reference, whose sky above the rooftops measures #78BEFC. */
const MORNING: TimeOfDayPreset = {
  id: 'morning',
  label: 'Morning',
  sun: [9, 14, 10],
  zenith: '#6AB4F6',
  sunGlow: { color: '#FFF4DC', strength: 0.3 },
  sunDisc: { color: '#FFFBEE', strength: 1 },
  clouds: { tint: '#FFFFFF', opacity: 0.96 },
  key: { color: '#FFF3DF', intensity: 2.2 },
  fill: { color: '#DCE9FF', intensity: 0.5 },
  hemisphere: { sky: '#CFE6FF', ground: '#8A7A5A', intensity: 0.75 },
  fog: { color: '#CFE6FA', near: 48, far: 110 },
  stars: false,
  lampLevel: 0,
};

/**
 * Four times of day. The sun swings from a low east at dawn, up and over for morning,
 * down to a low west at sunset, then below the horizon at night.
 */
export const timesOfDay: readonly TimeOfDayPreset[] = [
  {
    id: 'dawn',
    label: 'Dawn',
    sun: [-16, 2.6, 9],
    zenith: '#6D86C4',
    sunGlow: { color: '#FFC89A', strength: 0.9 },
    sunDisc: { color: '#FFE2BC', strength: 1 },
    clouds: { tint: '#F7C6BE', opacity: 0.88 },
    key: { color: '#FFC79A', intensity: 1.5 },
    fill: { color: '#9FB6E8', intensity: 0.55 },
    hemisphere: { sky: '#F2C9B4', ground: '#6E6552', intensity: 0.55 },
    fog: { color: '#E7C6B4', near: 40, far: 105 },
    stars: false,
    lampLevel: 0.35,
  },
  MORNING,
  {
    id: 'sunset',
    label: 'Sunset',
    sun: [17, 3.2, -6],
    zenith: '#4A5AA6',
    sunGlow: { color: '#FF9A4E', strength: 1.1 },
    sunDisc: { color: '#FFB57C', strength: 1 },
    clouds: { tint: '#F6A97E', opacity: 0.9 },
    key: { color: '#FF9A4E', intensity: 1.9 },
    fill: { color: '#7E8FD6', intensity: 0.5 },
    hemisphere: { sky: '#F0A878', ground: '#6B5540', intensity: 0.55 },
    fog: { color: '#EDA478', near: 38, far: 100 },
    stars: false,
    lampLevel: 0.55,
  },
  {
    id: 'night',
    label: 'Night',
    sun: [-10, -4, -8],
    zenith: '#03060F',
    sunGlow: { color: '#000000', strength: 0 },
    sunDisc: { color: '#000000', strength: 0 },
    // Clouds off so the stars read against a clear sky.
    clouds: { tint: '#2A3350', opacity: 0 },
    // A dim, cool "moon" from the opposite side keeps silhouettes readable.
    key: { color: '#9FB4E8', intensity: 0.55 },
    fill: { color: '#5C6EA8', intensity: 0.28 },
    hemisphere: { sky: '#2C3A63', ground: '#171B26', intensity: 0.35 },
    fog: { color: '#111A30', near: 34, far: 95 },
    stars: true,
    lampLevel: 1,
  },
];

export const DEFAULT_TIME_OF_DAY: TimeOfDayId = MORNING.id;

export const timeOfDayById = (id: TimeOfDayId): TimeOfDayPreset =>
  timesOfDay.find((preset) => preset.id === id) ?? MORNING;
