---
title: "Opening arrangement: rest poses, an idle that ends the T-pose, and a sit clip that cannot sit on a wall"
date: 2026-09-13
summary: Six characters placed after assets/home.jpg; floor-only sit clip forces per-character Mixamo downloads for the wall sitters
---

# Opening arrangement: rest poses, an idle that ends the T-pose, and a sit clip that cannot sit on a wall

## What happened
- Goal: on load, arrange the six characters like `assets/home.jpg` — Gian and Suneo on the front wall, Nobita sitting at the gate, Shizuka, Doraemon and Dekisugi standing. Walk mode hidden for now.
- Measured Mixamo `sit` in Blender before writing code: it is a **floor sit** (hips 0.10–0.29 m, legs straight out, toes 0.6–0.67 m forward). Fine for Nobita on the ground, useless on a 1.67 m coping where the shins must hang. Import mesh bounds were garbage (a stray unit Icosphere in the file); bone heads gave the real numbers.
- The right mid-run pier sits at x 4.5 (`env_build.py`), so Suneo moved from 4.6 to 5.2.
- First headless screenshot showed every standing character in a T-pose. Not caused by this change: HEAD GLBs were hand-rigged sculpts carrying only `welcome`; the uncommitted Mixamo GLBs bind in T-pose and the diorama never played `idle`.
- A parallel session moved Doraemon onto the Mixamo rig mid-work; the full-file write of `characters.ts` was refused as stale, re-read, and his stride change kept.
- Chrome extension never connected; verification ran through `agent-browser` headless Chromium instead.

## Decision
- `CharacterDef.rest = { clip, offset }`; `position` stays the sidewalk anchor, so walk-route invariants pass unchanged (75/75 tests).
- At home a character holds its `rest` clip if the GLB has it, else `idle`. The clip starts at full weight on load (a fade-in from bind pose flashes a T-pose). The welcome bow crossfades out of the rest clip and back on the mixer `finished` event; seated characters never greet. Procedural breath and sway are off while a clip rests.
- Walk button removed from the toolbar; walk code, store field and tests kept.
- User wants image-like actions: six per-character Mixamo clips instead of shared ones.

## Next steps
- User downloads into `assets/raw/mixamo-out/dekisugi/anim/`: `sit-wall-laugh`, `sit-wall-talk`, `sit-ground-happy`, `stand-happy`, `stand-calm`, `stand-cheerful` (.fbx, Without Skin, 30 fps, no keyframe reduction).
- Phase 4: merge one clip per GLB, measure the wall-seat offsets, add catalog entries, `wall.copingTop` and the wall-seat test, then a side close-up of the coping.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
