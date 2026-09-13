---
phase: 4
title: "Per-character resting clips after the image"
status: pending
priority: P2
effort: "3h + manual downloads"
dependencies: [2]
---

# Phase 4: Per-character resting clips after the image

## Overview
Each character holds its own looping action at home, chosen to read like `assets/home.jpg`
(user decision 2026-09-13): Gian and Suneo sit on the wall with shins hanging, Nobita sits on the
ground, Shizuka, Dekisugi and Doraemon stand, each with a distinct action. Replaces the single
`sit-chair` clip planned in phase 1's decision.

## Requirements
- Functional: six new looping clips, one per character, merged only into that character's GLB.
- Functional: `rest.clip` in `characters.ts` points at the character's clip; wall sitters get a
  measured `rest.offset` putting the seat on the coping (y 1.67).
- Functional: a GLB without its clip keeps today's fallback (`idle` standing, or the floor `sit`
  for Nobita until his clip lands).
- Non-functional: each GLB grows by one clip only; record the size delta (budget from the studio
  plan: +1.2 MB over the pre-Mixamo file).

## Manual downloads (user)
Mixamo, on **Dekisugi's auto-rig** (the shared clip source), **Without Skin**, **30 fps**,
**Keyframe Reduction: none**, saved into `assets/raw/mixamo-out/dekisugi/anim/`:

| Character | File (= clip id) | Look for in Mixamo | Must be |
|---|---|---|---|
| Gian | `sit-wall-laugh.fbx` | "Sitting Laughing" | chair sit: thighs level, shins hanging |
| Suneo | `sit-wall-talk.fbx` | "Sitting Talking" | chair sit: thighs level, shins hanging |
| Nobita | `sit-ground-happy.fbx` | a floor sit, knees up, cheerful (preview candidates) | hips on the floor, feet near the body |
| Shizuka | `stand-happy.fbx` | "Happy Idle" | standing loop, feet planted |
| Dekisugi | `stand-calm.fbx` | a calm standing idle, e.g. hands behind back | standing loop, feet planted |
| Doraemon | `stand-cheerful.fbx` | an excited or cheerful standing loop | standing loop, feet planted; no arm above shoulder if his sleeves are fused |

Mixamo titles change; pick by preview against the "Must be" column, keep the file names.

## Architecture
Unchanged app path: `rest.clip` + `rest.offset` (phase 2), `restFor` in `character.tsx`. New ids go
into `motions` in `src/data/animations.ts` (loop: true, `source` = the Mixamo title used), so the
studio lists them and `characters.test.ts` accepts them.

## Related Code Files
- Modify: `src/data/animations.ts`, `src/data/characters.ts`, `src/data/scene.ts`
  (`wall.copingTop`), `src/data/characters.test.ts` (wall-seat test)
- Assets: `public/models/characters/{jaian,suneo,nobita,shizuka,dekisugi,doraemon}.glb` via
  `scripts/blender/mixamo_merge.py` (pass `CLIPS` = the GLB's current clip list + its new clip) and
  `bun run assets:build`, one character at a time (`docs/asset-pipeline.md`)

## Implementation Steps
1. Check all six FBX files exist; list any missing and stop for those characters only.
2. Per character: merge with `CLIPS` extended by its clip; build; copy into `public/models/characters/`;
   confirm the clip list in the GLB and the size delta.
3. Measure the two wall clips in Blender (seat height, knee z, foot y) as in phase 1; compute
   `rest.offset` = `[0, copingTop − standY − seatHeight, wallFaceZ + seatDepth − position.z]`.
4. Add catalog entries, `rest` entries, `wall.copingTop`, and the wall-seat test.
5. `bun run test`, typecheck, lint; screenshot at the default camera; side close-up of the wall.

## Success Criteria
- [ ] Six clips merged; each GLB carries exactly one new clip.
- [ ] Gian and Suneo seated on the coping, shins down the street face, no clipping or gap.
- [ ] Shizuka, Dekisugi, Doraemon each in a distinct standing loop; Nobita seated on the ground.
- [ ] Tests, typecheck, lint green; screenshot matches the plan table.

## Risk Assessment
- **A clip is floor-type when chair-type was needed (or the reverse).** Signal: phase-1 style
  measurement (ankle above knee, hips near 0). Response: ask the user for a replacement download.
- **Merge overwrites `assets/raw/final/characters/<id>.glb`** and parallel sessions touch these GLBs.
  Response: stage explicit paths only; re-read `git status` for the GLB before copying.
- **Doraemon's fused sleeves tear on arm-raising clips.** Signal: mesh stretching at the shoulders in
  the studio. Response: ask for a calmer clip.
