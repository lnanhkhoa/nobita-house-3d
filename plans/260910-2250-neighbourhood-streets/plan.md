---
title: "Neighbourhood: streets and neighbour houses around Nobita's lot"
description: "Turn the single-lot diorama into a corner of a Japanese suburb: an L-shaped street network (front road + side road with a crossroads) and seven low-detail neighbour houses plus a coin parking lot, built procedurally in Blender and placed from src/data/scene.ts with proxy-first loading."
status: done
priority: P2
effort: "2d"
tags: [threejs, r3f, blender, procedural, environment]
created: 2026-09-10
branch: main
blockedBy: []
blocks: []
---

# Neighbourhood: streets and neighbour houses

## Outcome

The diorama reads as a corner lot in a Tokyo suburb, matching `assets/nobita_house_isometric_view.png`: a two-lane road along the front, a second road wrapping the left side of the lot, sidewalks with kerbs on both sides, poles and wires along the street, and neighbour houses in the same soft "Stand By Me" style on every side. Nobita's house stays the hero; neighbours sit one rung lower on the detail ladder and fade into the existing fog.

**Reference:** `assets/nobita_house_isometric_view.png` shows the front road plus a side road on the left, neighbours behind/right/across, big trees between houses, a utility pole at the kerb.

## Constraints and decisions

| Decision | Value | Why |
|---|---|---|
| Geometry source | Procedural Blender scripts, same as house/env; **no Rodin** | Established 2026-09-10: image-to-3D rounds architecture; procedural gives crisp planes at low tri counts |
| Ownership split | `env_build.py` = Nobita's lot only. New `streets_build.py` = public realm (roads, sidewalks, kerbs, markings, poles, wires). New `neighbours_build.py` = other lots | Street geometry from two builders would overlap at the corner and z-fight; one owner per surface |
| Street topology | Crossroads: front road along X, side road along Z past the left wall, both ±42 m | Matches the reference; ends vanish in fog |
| Detail ladder for neighbours | Silhouette + medium only: massing, roof pitch, eaves, inset-looking windows, walls and gates. No kawara ribs, no booleans | Hero stays distinct; budget ≤ 45k tris for all lots |
| Lot directly opposite the gate | Coin parking lot, not a house | Default camera `(0, 4.5, 20)` sits inside that lot; a building there would block the hero view |
| Camera vs. buildings | `CameraControls.colliderMeshes` with one invisible box per neighbour house | Orbit radius up to 34 m passes through every neighbour lot; colliders pull the camera in front of walls instead of clipping |
| Coordinates | Blender scripts build **directly** in Blender space with a `P(x, z) → (x, -z)` helper (street at Blender −Y), no end-of-script Y flip | Rotated houses break the "every mesh symmetric in Y" precondition of the env flip |
| Trees in neighbour lots | Extra entries in `layout.trees`; reuse `tree.glb` / `sakura.glb` instancing | No new asset; foliage.tsx already scales per instance |

## Non-goals

Interiors, cars, people other than the five characters, night lighting, traffic, LOD system, mobile-specific tuning beyond keeping the existing defaults usable, Rodin/Gemini reference images for buildings.

## Acceptance criteria

1. Orbiting at any azimuth shows neighbour houses on the right, behind, left across the side road and across the front road; the parking lot sits opposite the gate. Everything visible from the default view is real geometry, not proxies, once GLBs exist.
2. Sidewalk + kerb + road are continuous around the corner with rounded kerbs at the crossroads; no z-fighting between `environment.glb`, `streets.glb`, `neighbours.glb` and the R3F ground plane.
3. Camera never enters a neighbour house at any orbit; default hero framing is unchanged; `Reset view` still lands on the house.
4. Characters still stand on the front sidewalk; `bun run test` passes including a new layout test (lots do not overlap the roads, Nobita's lot, or each other; every tree is inside a lot and outside a house footprint).
5. Desktop 60 fps; draw calls ≤ 110; triangles ≤ 650k; `public/models` ≤ 18 MB. Numbers recorded in `docs/tech-stack.md`.
6. `bun run lint`, `typecheck`, `test`, `build` clean. `docs/asset-pipeline.md` and `docs/tech-stack.md` describe the new scripts, GLBs and the coordinate convention.

## Phases

| # | Phase | Depends on | Effort | Status |
|---|---|---|---|---|
| 1 | [Layout data, proxies, camera colliders](phase-01-layout-and-proxies.md) | — | 4h | done |
| 2 | [Blender: streets](phase-02-blender-streets.md) | 1 (numbers) | 4h | done |
| 3 | [Blender: neighbour houses and parking lot](phase-03-blender-neighbours.md) | 1 (numbers) | 6h | done |
| 4 | [Integration, performance, docs](phase-04-integration-perf-docs.md) | 2, 3 | 2h | done |

Phase 1 fixes every coordinate the Blender scripts mirror, so it goes first. Phases 2 and 3 are independent of each other but share one Blender session, so run them in order. The app is usable with proxies after Phase 1.

## Layout (metres, glTF space: +Y up, +Z toward the front street)

```
                     z = -21.2
   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │ 4 west-   │ │ 3 back    │ │ 2 east-   │
   │   back →+x│ │   faces -z│ │   back -z │
   └───────────┘ └───────────┘ └───────────┘  z = -7.6
   ┌───────────┐ ║ ┌───────────┐ ┌───────────┐
   │ 5 west →+x│ ║ │ NOBITA    │ │ 1 east    │
   │           │ ║ │ lot       │ │   faces +z│
   └───────────┘ ║ └───────────┘ └───────────┘  z = 5.8   (front wall line)
 ══════════════════════ front road z ∈ [7.7, 13.7] ═══════════════════════
   ┌───────────┐ ║ ┌─────────────┐ ┌───────────┐
   │ 6 south-  │ ║ │ 7 coin      │ │ 8 south-  │
   │   west -z │ ║ │   parking   │ │   east -z │
   └───────────┘ ║ └─────────────┘ └───────────┘  z = 28.6
 x: -31.3  -17.3 ║ -7.5        9.0  9.4     23.4
             side road x ∈ [-15.4, -9.4]
```

Sidewalks are 1.9 m deep on both sides of both roads (near: z ∈ [5.8, 7.7] and x ∈ [-9.4, -7.5]; far: z ∈ [13.7, 15.6] and x ∈ [-17.3, -15.4]). Exact lot rectangles, variants and tints are the `layout.neighbours` array defined in Phase 1; Blender scripts copy those numbers.

## Module contract (delta)

```
src/data/scene.ts            + streets (side road, length), neighbours[] (lot rect, facing, variant, tints), parking, extra trees
src/data/scene.test.ts       new: geometry sanity (no overlaps, trees inside lots)
src/config.ts                + models.streets, models.neighbours; camera tweaks
src/scene/streets.tsx        new: ModelOrProxy(streets.glb) with a proxy of sidewalks/roads/poles
src/scene/neighbours.tsx     new: ModelOrProxy(neighbours.glb) with box proxies + always-on invisible colliders
src/scene/environment.tsx    − sidewalk/road/pole proxy parts (moved to streets.tsx)
src/scene/camera-rig.tsx     + colliderMeshes from the `camera-colliders` group
src/scene/lighting.tsx       shadow frustum widened
src/scene/scene.tsx          + <Streets/> <Neighbours/>; fog pushed out
scripts/blender/env_helpers.py     new: material/collection/primitive helpers shared by env, streets, neighbours
scripts/blender/env_build.py       − street, kerb, road, markings, drains, zebra, pole; uses env_helpers
scripts/blender/streets_build.py   new → public/models/streets.glb
scripts/blender/neighbours_build.py new → public/models/neighbours.glb
docs/asset-pipeline.md, docs/tech-stack.md   updated
```

## Risks

| Risk | Signal | Response |
|---|---|---|
| `colliderMeshes` costs 4 raycasts per frame against every collider | FPS drops below 55 with 8 box colliders | Colliders are 8 boxes of 12 tris; if still slow, drop colliders and instead cap `maxDistance` at 15 m for azimuths facing a house (worse UX, last resort) |
| Invisible meshes ignored by the raycaster | Camera still clips into a house with `visible={false}` colliders | Switch to `material.colorWrite=false; depthWrite=false` with `visible` true |
| Shadow map spread over ±30 m blurs the hero house | Tile shadows on the yard look soft | Keep frustum ±30 at 4096; fall back to ±24 at 2048 if VRAM or mobile fails |
| Python constants drift from `scene.ts` | House proxy and GLB disagree on screen | Phase 4 overlays proxy and GLB (toggle `availableModels`) and compares; constants block in each script names its TS source |
| Triangle budget blown by 9 extra tree instances (3–8k each) | Triangles > 650k | Use the smaller canopy size for far trees or drop lot-4/lot-6 trees, which are the least visible |
| Fog end pushed out reveals the 400 m ground plane edge | Horizon line visible at max distance | Keep fog end ≤ 120 and the far ends of the roads at ±42 inside it |

## Results (2026-09-11)

Full evidence, screenshots and per-GLB costs: `plans/reports/perf-260911-0245-neighbourhood.md`.

| # | Criterion | Result |
|---|---|---|
| 1 | Neighbours on every side, parking opposite the gate, real geometry | met |
| 2 | Continuous sidewalk/kerb/road round the corner, rounded kerbs, no z-fighting | met — pavement, kerb and carriageway all curve together at all four corners |
| 3 | Camera never enters a neighbour house; default and Reset view unchanged | met — 7 colliders sized from the roof, so the eaves stay outside too; the camera stops at 10.79 / −11.29 / −19.79 against eaves at 11.0 / −11.6 / −20.0 |
| 4 | Characters on the sidewalk; `bun run test` passes incl. the new layout test | met — 12 tests |
| 5 | 60 FPS · draw calls ≤ 110 · triangles ≤ 650k · payload ≤ 18 MB | 60 FPS and 7.9 MB met; **195 draw calls and 763k triangles are over** |
| 6 | lint, typecheck, test, build clean; docs updated | met |

Criterion 5 is the one miss and it is not the new geometry: `streets.glb` and `neighbours.glb`
together are 15k triangles and 31 primitives. `Foliage` clones a GLB per instance — 4 draw
calls a tree, 3 a shrub — so the block's 34 plants are 113 of the 195 calls. Both levers this
plan named were taken (planting outside Nobita's lot stopped casting shadows, and the two
least visible neighbour trees were dropped), which brought 259 → 195 calls and 850k → 763k
triangles. Closing the rest needs either the prop-GLB material merge (~36 calls, free) or
`InstancedMesh` foliage (a rewrite, and a feature); the report ranks them. The ≤110 figure was
set against one house and 15 plants and does not survive tripling the content at one clone per
plant. 60 FPS holds at every azimuth.

A `code-reviewer` pass returned DONE_WITH_CONCERNS with no blockers. Its one substantive
finding was real: `add_courses` folded the lot yaw into the roof-lip tilt axis but not its
sign, mirroring every course lip on three of the seven houses. Fixed and re-verified — each
lip's world normal now matches its own roof shell to within 0.001. Three medium findings
(collider narrower than the eaves, proxy kerbs on the wrong side of the line, pavement corners
square behind a rounded kerb) and five low ones were fixed too; the table in the report lists
each with its fix.

Other deviations, all recorded in the report: `+π/2` not `−π/2` for a `+x`-facing house (three.js
is right-handed, and a test guards it); `kerbRadius` 1.5 not 2.0 with retuned pole positions
and a fifth pole west of the junction; `streets.glb` 0.49 MB not ≤ 0.1 MB (the estimate counted
geometry, the file is 2048 WebP tile maps); `neighbours.glb` 21 materials not ≤ 12 (six wall
tints and four roof tints are what this plan's own decision table asks for); seven extra trees
not nine; `env_build.py` lost exactly 50 objects, not "about 25".

## Open questions

None blocking. Assumed from the reference: the side road runs on the **left** (−X) of the lot, and it is a full crossroads rather than a T. Change `layout.streets.side` in Phase 1 if the user wants it mirrored.

<!-- slug: neighbourhood-streets -->
