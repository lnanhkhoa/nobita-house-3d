---
title: "Per-character resting clips and two dances: the gang now poses like the hero image"
date: 2026-09-13
summary: Six resting clips and two dances merged into every Mixamo GLB; wall sitters placed on the coping; camera frames the lifted body
---

# Per-character resting clips and two dances: the gang now poses like the hero image

## What happened
- The user downloaded six resting clips plus two dances (`house-dancing`, `swing-dancing`). All six characters were re-merged headless with `mixamo_merge.py`: the sixteen shared clips, both dances, and the character's own resting clip, with `RODIN_DIR` set to the sculpt each one ships from. Each GLB now has 19 clips and ships at 1.02–1.20 MB. The previous raw and shipped GLBs are backed up in `assets/raw/backup-260913-2150-clips/`.
- The studio lists both dances without any code change beyond the catalog, because it reads clips off the GLB.
- Measuring the new seats hit the stray importer Icosphere again (every vertex bound came out ±1). Restricting the measurement to meshes parented to the rig fixed it. Mesh "shin" bands were unreliable on knees-up poses, so side-view Workbench renders decided the pose types: Suneo is a clean chair sit (seat 0.25 m); Gian doubles over laughing with his feet tucked under a 0.10–0.14 m seat; Nobita sits on the floor with his knees up.
- Screenshots showed the arrangement matching `assets/home.jpg`. Selecting a wall sitter flew the camera to the sidewalk anchor and cut the head off.

## Decision
- `onWall(seat, originZ, anchorZ)` in `characters.ts` turns a measured seat height into a rest offset on the coping. `layout.wall.copingTop` (1.67) and `midPierX` now mirror `env_build.py`, and a test keeps wall sitters off the gate and pier caps.
- Camera focus adds the rest offset while the character is home.
- Gian's crouch is a property of his clip, not of the offset; it is left as is pending the user's call.

## Next steps
- If Gian should sit with his legs hanging, download a chair-sit laughing clip with a seat near 0.25 m and re-merge Jaian only.
- Tests 79/79, `tsc` and biome are clean. Nothing is committed yet.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
