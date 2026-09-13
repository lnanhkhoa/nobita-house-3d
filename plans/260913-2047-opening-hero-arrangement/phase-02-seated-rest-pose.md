---
phase: 2
title: "Home spots and seated rest pose"
status: pending
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Home spots and seated rest pose

## Overview
Move the six home spots to the new arrangement and let a character rest in a looping clip lifted
by an offset, so Gian and Suneo sit on the wall and Nobita sits at the gate.

## Requirements
- Functional: `characters` reordered left to right as Gian, Shizuka, Nobita, Doraemon, Dekisugi,
  Suneo, with the x values from the plan table (adjusted by phase 1 findings).
- Functional: a character with a `rest` pose, at home, loops that clip and has its model moved by
  `rest.offset`. Out walking (only reachable if walk mode is re-enabled), the offset is 0 and the
  clip is stopped: a snap, acceptable while walk mode is hidden.
- Functional: if the GLB lacks `rest.clip`, no offset is applied and the character stands on
  `position`.
- Functional: a seated character plays no `welcome` bow and no procedural greeting hop when
  selected. Standing characters keep today's behaviour.
- Functional: reduced motion keeps the seated pose: the rest clip is shown on a still frame,
  never removed, since a seated character without it would stand floating on the wall.
- Non-functional: `walk-routes.ts`, `walk-clock.ts`, `use-walker.ts` unchanged; walk-route tests
  green with the new spots.

## Architecture
Data (`src/data/characters.ts`):

```ts
export interface RestPose {
  /** Looping clip held while at home, e.g. 'sit'. */
  clip: string;
  /** From `position` (the feet anchor on the sidewalk) to the model origin while resting, metres. */
  offset: [number, number, number];
}
// CharacterDef gains: rest?: RestPose;
```

Wall sitters: `position` at their x on the sidewalk (z ≈ 6.6, y `standY`); `offset` =
`[0, copingTop − standY − seatHeight, wallZ + seatDepthCorrection − position.z]`, from phase 1's
numbers. `copingTop` comes from a new `layout.wall.copingTop` (1.67) mirrored from `env_build.py`,
not a literal in `characters.ts`.

Scene (`src/scene/character.tsx`): a `rest` group between the walker group and the motion group.
The walker still owns only the outer transform.

```
walker group (use-walker: position, yaw)
└─ rest group   position = seated && !moving ? rest.offset : [0,0,0]
   └─ motion group (use-character-motion: breath, sway, hover scale)
      └─ model
```

`ClipProbe` reports `rest: boolean` (the GLB carries `def.rest?.clip`). `seated = !!def.rest && clips.rest`.
`LoadedCharacter` gains a rest-clip effect: when `seated && !moving`, `reset()`, `LoopRepeat`,
`fadeIn(0.2).play()`; under reduced motion, pause at time 0 as the studio does. The welcome
effect returns early when `seated`. `useCharacterMotion` gains `seated`: no greeting hop.

## Related Code Files
- Modify: `src/data/characters.ts` (reorder, positions, `RestPose`, Dekisugi's and Suneo's comments
  where they mention spots), `src/data/scene.ts` (`wall.copingTop`), `src/scene/character.tsx`,
  `src/scene/use-character-motion.ts`, `src/data/characters.test.ts`
- Do not modify: `src/data/walk-routes.ts`, `src/scene/walk-clock.ts`, `src/scene/use-walker.ts`

## Implementation Steps
1. Add `wall.copingTop` to `layout` with a comment pointing at `env_build.py`; extend `scene.test.ts`
   only if it already checks wall numbers against the Blender script.
2. Add `RestPose` and `rest?` to `CharacterDef`; reorder and re-place the six entries; fill `rest`
   for Gian, Suneo and Nobita with phase 1's numbers (or whatever the decision gate chose).
3. Update the comment "Order = left-to-right in the hero reference image" if the image is now
   `assets/home.jpg`.
4. `character.tsx`: rest group, `rest` in `ClipProbe`, rest-clip effect, skip welcome when seated.
5. `use-character-motion.ts`: `seated` option suppresses the greeting hop.
6. Tests in `characters.test.ts`:
   - order and sidewalk anchors still hold (existing test);
   - every `rest.clip` is a clip id in `motions` (`src/data/animations.ts`);
   - a wall sitter's seat (`position + offset`, plus seat height) is within 2 cm of `copingTop`, its
     x inside a front wall run and outside the gate opening.
7. `bun run test`.

## Implementation notes (2026-09-13)
- Done ahead of the chair-sit clip: spots reordered, `RestPose` added, Nobita rests in `sit` with
  offset `[0,0,0]` (the merge script's ground clamp already puts the seat on the floor).
- Gian (x −1.6, z 6.2) and Suneo (x 5.2, z 6.2 — moved off the pier at 4.5) have **no `rest` yet**:
  they stand at the wall foot until `sit-chair` is merged and measured. Then add
  `rest: { clip: 'sit-chair', offset }`, `layout.wall.copingTop`, the `sit-chair` catalog entry in
  `animations.ts`, and the wall-seat test.
- Greeting suppression needed no `seated` option in `use-character-motion.ts`: `greet` in
  `character.tsx` is false while resting, and it feeds both the bow and the procedural hop.
- A parallel session moved Doraemon onto the Mixamo rig (stride 0.51) mid-work; kept.
- Verified: `bun run test` 75/75 (walk-route invariants included), `tsc` clean, biome clean on
  touched files.

## Success Criteria
- [ ] New order and spots in `characters.ts`; all tests green, walk-route tests included.
- [ ] Gian and Suneo seated on the coping, Nobita seated at the gate, in the dev server.
- [ ] Selecting Gian: card opens, he stays seated; selecting Shizuka: bows as before.
- [ ] Reduced motion (OS setting): seated characters still seated.

## Risk Assessment
- **Procedural breath bob and squash fight the clip.** Signal: seated characters bounce on the wall.
  Response: pass `seated` into the breath terms and zero them too.
- **Hover scale (1.025) pivots from the feet anchor, not the seat.** Signal: a hovered wall sitter
  shifts visibly. Response: acceptable at 2.5%; if not, skip hover scale when seated.
- **Camera focus on selection uses `def.position`** (`camera-rig.tsx:98`), so it aims at the sidewalk
  below a wall sitter. Signal: framing looks low. Response: add `rest.offset` to the focus point when
  seated; do not change the default camera (non-goal).
