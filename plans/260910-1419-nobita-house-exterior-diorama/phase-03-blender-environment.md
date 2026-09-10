# Phase 3 — Blender: environment build + house cleanup

## Context
Blender 5.2.1 via MCP. Scripts stored in `scripts/blender/` and executed through `execute_blender_code` so results are reproducible.

## Requirements
- `env_build.py`: ground slab, road + kerb + white line, concrete block wall with breeze-block vents (array modifier), gate posts + wooden gate + nameplate "野比", utility pole + wires (curves), simple shrubs (icospheres w/ displacement) — all under a `ENV` collection, origin at lot centre, +Y up on export.
- Trees: `search_polyhaven_assets` / `search_polypizza_models` for low-poly deciduous trees; import 2, place L and R of house per hero image.
- `house_cleanup.py`: import `assets/raw/house.glb`, Decimate to ≤ 60k tris, recenter pivot to ground bbox centre, scale to 8 m footprint width, apply transforms, rename `House`.
- Export `public/models/house.glb`, `public/models/environment.glb` (glTF, +Y up, Draco off, textures ≤ 2048, meshopt via `scripts/build-assets.mjs`).

## Steps
1. Build env procedurally; screenshot via MCP; iterate against `nobita_house_isometric_view.png`.
2. When house GLB arrives: cleanup → export.
3. `npm run assets:build`.

## Validation
Both GLBs load in the app replacing proxies; tri count and file size in budget; viewport screenshot matches reference massing.

## Rollback
Delete exported GLBs → proxies return.
