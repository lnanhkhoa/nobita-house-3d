---
phase: 1
title: "Measure the sit clip and the seats"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Measure the `sit` clip and the seats

## Overview
Find out what `sit` actually does to the body, get the numbers the seated offsets need, and
decide how Nobita and the wall-sitters can share the clip. No app code changes in this phase.

## Requirements
- Functional: for `jaian`, `suneo` and `nobita`, record from the `sit` clip at a mid-loop frame,
  in the model's own space (origin at the feet at rest):
  - seat height: lowest point of the pelvis/buttocks above the origin;
  - seat depth: z of the buttocks and of the knees relative to the origin (how far the thighs reach
    forward);
  - lowest foot point (y) and its z.
- Functional: classify the clip as **chair-sit** (hips roughly 0.35–0.5 m up, shins near vertical)
  or **floor-sit** (hips near 0, legs forward or crossed).
- Functional: confirm the seat geometry in the built scene: coping top y 1.67 (`WALL_H` 1.6 +
  coping 0.07 in `scripts/blender/env_build.py`), wall street face z ≈ 5.94, gate opening x 1.35–2.75,
  and the x of the right and left mid-run piers and their caps, so Suneo at x 4.6 and Gian at
  x −1.6 do not sit on a pier cap.

## Architecture
Measure with the Blender MCP (import the GLB, set the `sit` action, sample a frame, read bone and
evaluated-mesh bounds) or in the browser on `/characters` (Sit picked, turntable off, side view).
Blender is preferred: it gives numbers rather than a judgement from a screenshot.

## Related Code Files
- Read: `public/models/characters/{jaian,suneo,nobita}.glb`, `scripts/blender/env_build.py`,
  `src/data/scene.ts`
- Modify: none

## Implementation Steps
1. Import `jaian.glb` into an empty Blender scene; play `sit`; sample a frame mid-loop.
2. Record seat height, seat depth, knee z, lowest foot y and z. Repeat for `suneo` and `nobita`.
3. Classify the clip.
4. Read the pier and coping positions for the front wall runs from `env_build.py`; pick final x for
   Gian and Suneo clear of pier caps (move by up to ±0.4 m if needed, keeping the left-to-right order).
5. Write the numbers into this phase file under a `## Findings` section.
6. **Decision gate** — present to the user and wait:
   - **Chair-sit:** the wall seats work. Nobita on flat ground does not: his hips would hover or his
     legs would sink. Options: (a) Nobita stands instead; (b) a low step or block before the gate,
     about seat height, added in `env_build.py` (a Blender rebuild, previously a non-goal);
     (c) the user downloads a Mixamo floor-sit clip for Nobita.
   - **Floor-sit:** Nobita's seat works. On the wall the legs would lie along the coping instead of
     hanging. Options: (a) accept it; (b) the user downloads a Mixamo chair-sit clip (e.g.
     "Sitting") for Gian and Suneo; (c) Gian and Suneo stand at the wall instead.

## Findings (2026-09-13, Blender bone heads, three space: y up, z forward, origin at the feet)

Rest reference (`idle`, Gian): hips 0.594, knee 0.331, ankle 0.146, toe 0.021.

| `sit`, frame 150 | Hips y / z | Knee y / z | Ankle y / z | Toe y / z |
|---|---|---|---|---|
| Gian | 0.292 / −0.036 | 0.405 / 0.226 | 0.421 / 0.419 | 0.439 / 0.607 |
| Suneo | 0.160 / −0.059 | 0.255 / 0.182 | 0.252 / 0.386 | 0.263 / 0.617 |
| Nobita | 0.104 / −0.035 | 0.204 / 0.233 | 0.192 / 0.460 | 0.202 / 0.668 |

- Hips carry no translation over the loop (constant y): no drift.
- **Clip type: floor-sit.** Hips sink to 0.1–0.3 m and the legs stretch straight out in front at
  knee height (ankle level with or above the knee, toes 0.6–0.67 m forward). Shins never hang.
- On the ground this fits Nobita's seat at the gate.
- On the wall, the legs would stick out level over the street at coping height + ~0.3 m instead of
  hanging down the wall face.
- Seat heights differ by rig (Gian's hips 0.19 m higher than Nobita's): per-character offsets needed.
- Mesh bounds from the import were unusable: the file also carries a stray unit `Icosphere`.
- Piers: mid-run piers at x −3.7 and **4.5**, cap top y 1.76, 0.38 m wide. Gian at x −1.6 is
  clear; Suneo at 4.6 would sit on the cap → move Suneo to x ≈ 5.2 (right run ends at 7.5).

## Success Criteria
- [x] Findings recorded with numbers for all three characters.
- [x] Clip type stated.
- [x] Final x for Gian and Suneo chosen clear of pier caps.
- [x] User has chosen an option at the decision gate; phase 2's seat table updated to match.

## Decision (user, 2026-09-13)
Gian and Suneo get a chair-type Mixamo sit ("Sitting", shins hanging), downloaded by the user and
merged into their GLBs as a new clip. Nobita keeps the existing floor `sit`. Wall-seat offsets
are measured from the new clip once it is merged. Until then the wall sitters' GLBs lack the clip,
and they stand on their `position` (the designed fallback).

## Risk Assessment
- **The three rigs sit differently** (leg ratios differ; Gian is taller). Signal: seat heights differ
  by more than 5 cm. Response: per-character offsets in phase 2, which the design already allows.
- **The clip drifts over its loop** (hips rise or slide). Signal: seat height varies more than 3 cm
  across the loop. Response: use the lowest value, so the character never floats; note it.
