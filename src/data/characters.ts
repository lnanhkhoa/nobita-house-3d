import { layout } from './scene';

/** A looping clip a character holds at home instead of standing, and where it puts the body. */
export interface RestPose {
  /** Clip name inside the GLB. A GLB without it leaves the character standing on `position`. */
  clip: string;
  /** From `position` to the model origin while resting, metres: lifts a sitter onto a seat. */
  offset: [number, number, number];
}

export interface CharacterDef {
  id: string;
  name: string;
  /** Label for chips and roster buttons. */
  shortName: string;
  jpName: string;
  /** Canon height in metres; drives proxy size and GLB normalisation in Blender. */
  height: number;
  /**
   * One full walking stride (two steps) in metres: the ground a character covers per cycle
   * of its `walk` clip, measured off the rigged mesh in Blender (`rig_welcome.py` prints it).
   * These legs have no knee, so a swing covers less ground than a real stride of the same
   * height. Sets the step rate of the procedural gait and the playback rate of the clip.
   */
  stride: number;
  /**
   * Feet position on the sidewalk, metres. Street is +Z, house is at the origin. Also the
   * character's home on the walk loop, so it stays on the pavement even for a sitter whose
   * `rest` pose lifts the body elsewhere.
   */
  position: [number, number, number];
  /** Yaw in radians; 0 faces +Z (toward the default camera). */
  rotationY: number;
  /** Held at home instead of the standing pose. */
  rest?: RestPose;
  /** Signature colour used for the proxy body and the info-card eyebrow. */
  color: string;
  bio: string;
}

/**
 * Rest offset that sits a character on the front-wall coping. `seat` is the clip's seat height
 * above the model origin (the lowest skin under the hips, measured in Blender over the whole
 * loop); `originZ` is where the model origin goes so the seat rests on the coping's street edge
 * with the thighs overhanging it; `anchorZ` is the character's sidewalk `position` z.
 */
const onWall = (seat: number, originZ: number, anchorZ: number): [number, number, number] => [
  0,
  layout.wall.copingTop - layout.standY - seat,
  originZ - anchorZ,
];

// Order = left-to-right in `assets/home.jpg`, gathered tight round the gate (x 1.35–2.75), with
// Dekisugi added where Suneo stands in the image and Suneo moved onto the wall (user decisions
// 2026-09-13). Each character holds its own resting clip, downloaded to match the image.
//
// Spacing: neighbours in this list are at least 0.7 m apart in x. They share one walk loop at
// a fixed distance apart, and round its 0.45 m fillets 0.7 m of path still leaves ~0.63 m
// between them, over the 0.6 m walk-route test. The clearances quoted below come from each
// resting clip's measured width over its whole loop.
export const characters: CharacterDef[] = [
  {
    id: 'jaian',
    name: 'Takeshi "Gian" Goda',
    shortName: 'Gian',
    jpName: '剛田 武',
    height: 1.57,
    // Mixamo humanoid rig on Dekisugi's shared clips: the `walk` root travel the merge script
    // strips on his rig (0.80 m) times his leg ratio (1.236). Estimated, like Shizuka's.
    stride: 0.99,
    // Anchored at the foot of the wall left of the gate. Laughing he spans x −0.51..+0.46, so
    // his right side stays 0.43 m clear of the left gate post (x 1.09–1.35, 1.85 m tall).
    position: [0.2, layout.standY, 6.2],
    rotationY: 0,
    // On the wall, laughing. `sit-wall-laugh` rocks the seat between 0.10 and 0.14 m, so the
    // middle is used; it tucks the feet back under the seat, where they disappear into the wall.
    rest: { clip: 'sit-wall-laugh', offset: onWall(0.12, 5.72, 6.2) },
    color: '#F0801E',
    bio: 'The neighbourhood strongman and self-appointed singer. "What’s yours is mine, what’s mine is mine" — but when it truly matters, Gian is the friend who never runs.',
  },
  {
    id: 'shizuka',
    name: 'Shizuka Minamoto',
    shortName: 'Shizuka',
    jpName: '源 静香',
    height: 1.38,
    // Mixamo humanoid rig on Dekisugi's shared clips: the source `walk` travel (0.97 m) times
    // her leg ratio (1.023). Estimated, like Suneo's — the ground clamp keeps the toe from
    // resting still long enough to measure.
    stride: 0.99,
    // Below and right of Gian, as in the image. Her right side (x +0.32) stays 0.16 m clear of
    // Nobita's body, and her head (1.46 m) passes under Gian's lowest point on the wall (1.55 m).
    position: [0.95, layout.standY, 6.7],
    rotationY: 0.1,
    rest: { clip: 'stand-happy', offset: [0, 0, 0] },
    color: '#F07EA8',
    bio: 'The kind, level-headed girl next door and the one person who never gives up on Nobita. Loves baths, sweet potatoes and the violin, though nobody survives her playing.',
  },
  {
    id: 'nobita',
    name: 'Nobita Nobi',
    shortName: 'Nobita',
    jpName: '野比 のび太',
    height: 1.4,
    // Mixamo humanoid rig on Dekisugi's shared clips: the `walk` root travel the merge script
    // strips on his rig (0.71 m) times his leg ratio (1.432). Estimated, like Jaian's.
    stride: 1.02,
    // Sitting on the ground in front of the gate in the floor `sit`, legs straight out. The
    // clip leans back on its hands 0.59 m behind the origin, so z 6.4 keeps them in front of the
    // gate leaf (z 5.8); the toes reach 7.13, still on the sidewalk. Not `sit-ground-happy`
    // (user decision 2026-09-13): that clip sits cross-legged holding a foot, and on his short
    // legs the big shoes pass through each other and the seat rides on the shins, 4 cm up.
    position: [1.7, layout.standY, 6.4],
    rotationY: 0,
    rest: { clip: 'sit', offset: [0, 0, 0] },
    color: '#F5C21B',
    bio: 'Lazy, clumsy and hopeless at school, yet unbeatable at shooting and cat’s cradle. Nobita’s big heart is the reason Doraemon stays, and this is his house.',
  },
  {
    id: 'doraemon',
    name: 'Doraemon',
    shortName: 'Doraemon',
    jpName: 'ドラえもん',
    height: 1.29,
    // Mixamo humanoid rig on Dekisugi's shared clips since 2026-09-13: the `walk` root travel
    // the merge script strips on his rig (0.66 m) times his leg ratio (0.766). Estimated.
    stride: 0.51,
    position: [2.45, layout.standY, 6.6],
    rotationY: -0.1,
    rest: { clip: 'stand-cheerful', offset: [0, 0, 0] },
    color: '#0A9DE8',
    bio: 'A cat-shaped robot sent from the 22nd century by Nobita’s great-great-grandson to steer his ancestor toward a better future. Carries every gadget in his four-dimensional pocket, is terrified of mice, and would do anything for a dorayaki.',
  },
  {
    id: 'dekisugi',
    name: 'Hidetoshi Dekisugi',
    shortName: 'Dekisugi',
    jpName: '出木杉 英才',
    height: 1.42,
    // Mixamo humanoid rig: the ground his `walk` clip covers per cycle, measured in Blender
    // from the planted toe's speed on the posed rig (1.05 m left, 1.09 m right). Full-length
    // stride, unlike the knee-less rigs.
    stride: 1.07,
    // Leaning back on the wall right of the gate. `stand-calm` is a wall lean with one foot
    // propped behind him: the propped foot reaches 2.5 cm behind the origin and the shoulders sit
    // 2 cm in front of it, so the origin goes 2.5 cm off the wall's street face (z 5.91) and he
    // faces the street square, or one shoulder would sink into the blocks. Out in the open the
    // same clip reads as a broken, one-legged crouch. His left side (x −0.27) stays 5 cm clear of
    // the right gate post (x 2.75–3.01).
    position: [3.33, layout.standY, 5.94],
    rotationY: 0,
    rest: { clip: 'stand-calm', offset: [0, 0, 0] },
    color: '#3FA08C',
    bio: 'Top of the class, kind to everyone, and effortlessly good at everything Nobita is not. The only rival Doraemon’s gadgets cannot beat, which is exactly why Nobita worries about him and Shizuka.',
  },
  {
    id: 'suneo',
    name: 'Suneo Honekawa',
    shortName: 'Suneo',
    jpName: '骨川 スネ夫',
    // Dekisugi's height, not Suneo's canon 1.35 m (user decision 2026-09-13): at 1.35 m the
    // sculpt's big head, hands and shoes read as a stunted body.
    height: 1.42,
    // Mixamo humanoid rig on Dekisugi's shared clips, at Dekisugi's stride (user decision
    // 2026-09-13). The source `walk` travel times his leg ratio estimates 0.92 m, so if his feet
    // slide in walk mode, that is the number to try.
    stride: 1.07,
    // Anchored at the foot of the wall between Dekisugi and the mid-run pier (x 4.34–4.66). He
    // spans x −0.41..+0.26 talking: his left side stays 7 cm clear of Dekisugi's head, which sits
    // at the height his hanging feet reach, and his hands stop short of the pier.
    position: [4.03, layout.standY, 6.2],
    rotationY: 0,
    // On the wall, talking: a clean chair sit, seat 0.25 m above the origin all loop long, shins
    // hanging down the street face.
    rest: { clip: 'sit-wall-talk', offset: onWall(0.25, 5.74, 6.2) },
    color: '#5CB85C',
    bio: 'Rich, vain and quick to brag about whatever his family bought this week. Gian’s sidekick, Nobita’s rival, and secretly the most sensitive of the group.',
  },
];

export const characterById = (id: string) => characters.find((c) => c.id === id);
