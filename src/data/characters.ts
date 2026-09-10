import { layout } from './scene';

export interface CharacterDef {
  id: string;
  name: string;
  /** Label for chips and roster buttons. */
  shortName: string;
  jpName: string;
  /** Canon height in metres; drives proxy size and GLB normalisation in Blender. */
  height: number;
  /** Feet position on the sidewalk, metres. Street is +Z, house is at the origin. */
  position: [number, number, number];
  /** Yaw in radians; 0 faces +Z (toward the default camera). */
  rotationY: number;
  /** Signature colour used for the proxy body and the info-card eyebrow. */
  color: string;
  bio: string;
}

// Order = left-to-right in the hero reference image.
export const characters: CharacterDef[] = [
  {
    id: 'shizuka',
    name: 'Shizuka Minamoto',
    shortName: 'Shizuka',
    jpName: '源 静香',
    height: 1.38,
    position: [-3.6, layout.standY, 7.4],
    rotationY: 0.12,
    color: '#F07EA8',
    bio: 'The kind, level-headed girl next door and the one person who never gives up on Nobita. Loves baths, sweet potatoes and the violin, though nobody survives her playing.',
  },
  {
    id: 'doraemon',
    name: 'Doraemon',
    shortName: 'Doraemon',
    jpName: 'ドラえもん',
    height: 1.29,
    position: [-1.8, layout.standY, 7.6],
    rotationY: 0.05,
    color: '#0A9DE8',
    bio: 'A cat-shaped robot sent from the 22nd century by Nobita’s great-great-grandson to steer his ancestor toward a better future. Carries every gadget in his four-dimensional pocket, is terrified of mice, and would do anything for a dorayaki.',
  },
  {
    id: 'nobita',
    name: 'Nobita Nobi',
    shortName: 'Nobita',
    jpName: '野比 のび太',
    height: 1.4,
    position: [0, layout.standY, 7.7],
    rotationY: 0,
    color: '#F5C21B',
    bio: 'Lazy, clumsy and hopeless at school, yet unbeatable at shooting and cat’s cradle. Nobita’s big heart is the reason Doraemon stays, and this is his house.',
  },
  {
    id: 'jaian',
    name: 'Takeshi "Gian" Goda',
    shortName: 'Gian',
    jpName: '剛田 武',
    height: 1.57,
    position: [1.9, layout.standY, 7.5],
    rotationY: -0.08,
    color: '#F0801E',
    bio: 'The neighbourhood strongman and self-appointed singer. "What’s yours is mine, what’s mine is mine" — but when it truly matters, Gian is the friend who never runs.',
  },
  {
    id: 'suneo',
    name: 'Suneo Honekawa',
    shortName: 'Suneo',
    jpName: '骨川 スネ夫',
    height: 1.35,
    position: [3.7, layout.standY, 7.4],
    rotationY: -0.15,
    color: '#5CB85C',
    bio: 'Rich, vain and quick to brag about whatever his family bought this week. Gian’s sidekick, Nobita’s rival, and secretly the most sensitive of the group.',
  },
];

export const characterById = (id: string) => characters.find((c) => c.id === id);
