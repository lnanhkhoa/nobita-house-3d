---
phase: 4
title: "Integration, performance, docs"
status: pending
priority: P2
effort: "2h"
dependencies: [2, 3]
---

# Phase 4: Integration, performance, docs

## Overview
Verify the three GLBs, the proxies and the camera together; measure performance against the budget; tune fog, shadows and camera limits on the real geometry; update the docs.

## Requirements
- Functional: acceptance criteria 1–6 of `plan.md` hold with real GLBs.
- Non-functional: 60 fps desktop; draw calls ≤ 110; triangles ≤ 650k; `public/models` ≤ 18 MB.

## Architecture
No new modules. Measurement uses the existing dev hook `window.__cam` (`gl.info.render`) in headless Chromium, same method as the 2026-09-10 numbers in `docs/tech-stack.md`.

## Related Code Files
- Modify: `src/scene/scene.tsx` (fog), `src/scene/lighting.tsx` (shadow frustum), `src/config.ts` (camera limits) — tuning only
- Modify: `docs/asset-pipeline.md` (new scripts, helper file, `P()` convention, which script still Y-flips, GLB table)
- Modify: `docs/tech-stack.md` (scene architecture list, coordinate conventions, refreshed performance table)
- Modify: `plans/260910-2250-neighbourhood-streets/plan.md` (acceptance results)
- Create: `plans/reports/perf-<timestamp>-neighbourhood.md` (screenshots at four azimuths + numbers)

## Implementation Steps
1. Proxy/GLB overlay check: temporarily force `availableModels` false for `neighbours.glb` and compare screenshots against the loaded GLB from the same camera; fix any lot whose Blender position drifted from `scene.ts`.
2. Measure fps, draw calls, triangles, payload; fill the table below.
3. Tune: fog start/end so the far ends of the roads vanish before the ground-plane edge; shadow frustum so the hero shadow stays crisp; `maxDistance` so the whole block fits in frame at max zoom-out.
4. Run `bun run lint && bun run typecheck && bun run test && bun run build`.
5. Update the two docs; keep each under 800 lines; do not duplicate script internals, link to the scripts.
6. Write acceptance results into `plan.md`; commit with conventional messages (`feat: street network around the lot`, `feat: neighbour houses and parking lot`, `docs: ...`).

| Metric | Before (2026-09-10) | Budget | After |
|---|---|---|---|
| FPS | 60 | 60 | |
| Draw calls | 76 | ≤ 110 | |
| Triangles | 511k | ≤ 650k | |
| `public/models` | 16 MB | ≤ 18 MB | |

## Success Criteria
- [ ] Table filled; every value inside budget or an accepted deviation is written next to it
- [ ] All six acceptance criteria in `plan.md` checked with evidence in the perf report
- [ ] Docs updated; `bun run build` clean

## Risk Assessment
- Budget miss on triangles: first lever is the extra trees (drop the two least visible), second is tile-course lips on far houses; the hero and characters are not touched.
- Shadow map at 4096 fails on a weaker GPU: fall back to 2048 with the ±24 frustum and note it in `tech-stack.md`.
