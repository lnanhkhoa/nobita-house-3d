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

## Findings (2026-09-13)
- All six merged headless, plus `house-dancing` and `swing-dancing` in every GLB (user request):
  19 clips each, 1.02–1.20 MB shipped. Backup: `assets/raw/backup-260913-2150-clips/`.
- Seat heights on the character mesh (stray importer Icosphere excluded): Suneo `sit-wall-talk`
  0.248–0.256 m, a clean chair sit; Gian `sit-wall-laugh` 0.103–0.142 m, doubled over laughing
  with the feet tucked under the seat; Nobita `sit-ground-happy` seat 0.038 m, knees up.
- Offsets: `onWall(0.25, 5.74, 6.2)` for Suneo, `onWall(0.12, 5.72, 6.2)` for Gian; both others 0.
- Default-camera screenshot matches the table. Gian reads as crouching on the coping rather than
  sitting with legs hanging: the clip's low seat, not the offset.
- Camera fly-to on a wall sitter aimed at the sidewalk anchor and cut the head off: focus now adds
  the rest offset.

## Fixes after user review (2026-09-13)
- **Report:** Nobita's and Dekisugi's animations looked broken in the scene.
- **Diagnosis, the merge ruled out:**
  - Stick-figure renders of the source FBX clips match the merged GLB renders.
  - The new downloads share one skeleton (leg 26.5, arm 28.4) that differs from the old clips' rig
    (leg 39.2), but its full rest rotations, bone roll included, are within ~10° of Dekisugi's rig
    everywhere except the feet (~35°). That can twist a foot; it cannot raise a knee.
  - The poses are the clips' own content.
- **Dekisugi:** `stand-calm` is a wall lean with one foot propped behind (the rearmost skin 2.5 cm
  behind the origin, shoulders 2 cm in front). It read as a broken crouch in the open. Moved back
  against the wall (user's call): z 5.94, facing square.
- **Nobita:** `sit-ground-happy` sits cross-legged holding a foot; on his short legs the shoes
  pass through each other. Back to the floor `sit` (user decision). `sit` leans on its hands 0.59 m
  behind the origin, which pushed them through the gate leaf at z 6.3, so z moved to 6.4.
- **Tighter group (user request):** Gian −1.6 → 0.2, Shizuka −0.3 → 0.95, Suneo 5.2 → 4.03,
  Dekisugi 3.4 → 3.33.
  - Clearances come from each resting clip's width measured over its whole loop.
  - Dekisugi–Suneo is 0.70 m apart, under the 0.75 m previously proven; the walk-route tests pass
    (79/79).
  - Screenshots show no body through the posts, the pier or each other.

## Success Criteria
- [x] Six clips merged; each GLB carries exactly one new resting clip (plus the two dances).
- [x] Suneo seated on the coping, shins down the street face.
- [x] Gian seated on the wall, laughing. His clip crouches on the coping instead of hanging the
      legs; the user kept it as is (2026-09-13) — it reads right from the default camera.
- [x] Shizuka, Dekisugi, Doraemon each in a distinct standing loop; Nobita seated on the ground.
- [x] Tests (79), typecheck, lint green; screenshot matches the plan table.

## Risk Assessment
- **A clip is floor-type when chair-type was needed (or the reverse).** Signal: phase-1 style
  measurement (ankle above knee, hips near 0). Response: ask the user for a replacement download.
- **Merge overwrites `assets/raw/final/characters/<id>.glb`** and parallel sessions touch these GLBs.
  Response: stage explicit paths only; re-read `git status` for the GLB before copying.
- **Doraemon's fused sleeves tear on arm-raising clips.** Signal: mesh stretching at the shoulders in
  the studio. Response: ask for a calmer clip.
