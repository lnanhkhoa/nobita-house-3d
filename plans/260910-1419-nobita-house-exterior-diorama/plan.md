---
title: "Nobita's House — Exterior Diorama with Characters"
description: "Web 3D diorama of Nobita's house exterior with 5 animated Doraemon characters. React + Vite + three.js (R3F). Assets: Gemini-generated reference images → Hyper3D Rodin (manual, user) → Blender (MCP) cleanup → Mixamo rig → GLB."
status: mostly-done — blocked only on user-supplied tree/hedge GLBs
priority: P2
branch: "main"
tags: [threejs, r3f, react, vite, blender, hyper3d, mixamo, doraemon]
created: "2026-09-10T07:19:00.000Z"
supersedes: "plans/260802-1427-nobita-house-dollhouse-diorama (deleted by user 2026-09-10)"
---

# Nobita's House — Exterior Diorama with Characters

## Outcome (accepted 2026-09-10)

Single-page web app: orbit around Nobita's house seen from the street (house, yard, block wall, gate, trees, road, utility pole) in the smooth "Stand By Me Doraemon" 3D look. Five characters (Doraemon, Nobita, Shizuka, Jaian, Suneo) stand in front of the gate, breathing idle animation; click a character → they wave + camera frames them + info card. No interior, no roof toggle, no cutaway.

**Reference art:** `assets/nobita_house_characters_scene.png` (hero composition), `assets/nobita_house_isometric_view.png` (house massing + lot), `assets/Nobis%27_Residence_2017_update.webp` (canonical anime facade), `assets/623df143063739.57e2065f398da.jpg` (photoreal facade, materials).

## Decisions (user, 2026-09-10)

| Decision | Value |
|---|---|
| Scope | Exterior only + 5 characters |
| Art style | Smooth 3D, Stand By Me look (soft shading, simple textures) |
| Stack | React 19 + Vite 8 + TypeScript 7 + three 0.186 + @react-three/fiber 9 + drei 10. Biome. UI English. |
| 3D generation | User has Hyper3D **Creator** plan → no API key. **I generate 2D reference images with Gemini (key in `.env`)**, user runs Rodin image-to-3D on the web UI and drops GLB into `assets/raw/`. |
| Blender | MCP connected (Blender 5.2.1). Used for: import raw GLB, decimate, pivot/scale fix, material cleanup, build yard/wall/gate/road/pole procedurally, place trees (Poly Haven / Poly Pizza), export GLB. |
| Animation | **Procedural idle + in-house torso rig** (user decisions 2026-09-10, twice revised). Breathing/sway stay procedural; selection plays a skeletal `welcome` bow from a 4-bone torso chain rigged in Blender with height-band weights — chosen over Mixamo because the sculpts ship posed with held props. |
| Deployment | None (local `npm run dev`). Unchanged from old plan. |

## Non-goals

Interior rooms, dollhouse toggles, editor mode, i18n, mobile-first chrome from old design doc (kept as style reference only), CI/CD.

## Acceptance criteria

1. `npm run dev` shows the full diorama with proxy placeholders from Phase 1 onward; every real GLB silently replaces its proxy.
2. All 5 characters loop an idle clip; click → wave clip once → back to idle; info card opens with name + 2–3 sentence bio.
3. Camera: orbit/zoom with limits (never below ground, never inside house), click-to-frame fly, Reset View.
4. Desktop 60 fps, mid mobile ≥ 30 fps; total models < 25 MB; triangles < 300k after decimation.
5. Loading screen with progress; credits line (Fujiko Pro attribution).
6. `npm run build`, `npm run lint`, `npm run typecheck` clean.

## Phases

| # | Phase | Depends on | Owner | Status |
|---|---|---|---|---|
| 1 | [Foundation scaffold + proxy scene](phase-01-foundation-scaffold.md) | — | me | **done** |
| 2 | [Reference image generation (Gemini) + Rodin handoff](phase-02-reference-images.md) | — | me → user | **done** — defaults moved to Flash 1K, three views |
| 3 | [Blender: environment and house](phase-03-blender-environment.md) | — | me (MCP) | **done** — both built procedurally; Rodin not used for architecture |
| 4 | [Character pipeline: Rodin → Blender → GLB](phase-04-character-pipeline.md) | 2 (character GLBs) | me ↔ user | **done** — all 5 shipped, Gian recoloured to canon |
| 5 | [Web app: scene, animation, interaction, UI](phase-05-web-app.md) | 1; assets from 3, 4 arrive incrementally | me | **done** |
| 6 | [Perf, polish, docs](phase-06-perf-polish-docs.md) | 3, 4, 5 | me | **done** — see acceptance results below |

Phases 1 and 2 run first, in parallel. 3, 4, 5 overlap: web work continues on proxies while the user runs Rodin/Mixamo.

## Acceptance results (2026-09-10)

1. ✅ Proxy-first loading; every delivered GLB replaced its proxy with no code change.
2. ✅→adjusted: idle + select reaction ship as **procedural** motion (user decision after the sculpts arrived posed and unskinned); info cards work.
3. ✅ Orbit limits, click-to-frame fly with focal offset, Reset view.
4. Partial: payload 16 MB < 25 ✅; triangles 511k > 300k target, accepted at 60 FPS desktop (measured, M4 headless Chromium; levers documented in tech-stack.md). Mobile untested.
5. ✅ Loading veil with progress; credits line.
6. ✅ `build`, `lint`, `typecheck`, `test` clean (bun).

Foliage: built procedurally in Blender (`plants_build.py`) after Rodin failed on leaf detail; no outstanding assets. Root README intentionally not created — repository rules forbid markdown outside `plans/`/`docs/` without an explicit request; run instructions live in `docs/tech-stack.md`.

## Module contract

```
src/
  main.tsx                 React root
  app.tsx                  <Canvas> + <Ui/>
  config.ts                camera limits, model paths, feature flags
  data/characters.ts       CharacterDef[] (id, name, bio, spawn pos/rot, palette colour for proxy)
  data/scene.ts            house/env model paths, spawn transforms
  scene/                   R3F components: house.tsx · environment.tsx · character.tsx · lighting.tsx · camera-rig.tsx · ground.tsx
  scene/model-or-proxy.tsx loads GLB via useGLTF; on 404 renders proxy geometry
  state/store.ts           zustand: selectedCharacterId, loading, cameraTarget
  ui/                      loading-veil.tsx · info-card.tsx · view-controls.tsx · credits.tsx
  styles/tokens.css        paper/ink tokens from docs/design-guidelines.md §3
scripts/
  gen-ref-images.mjs       Gemini image gen → assets/ref/<id>/*.png
  build-assets.mjs         gltf-transform over assets/raw/final → public/models
  blender/*.py             bpy scripts run through MCP (kept in repo for reproducibility)
assets/raw/                Rodin + Mixamo downloads (gitignored)
assets/ref/                generated 2D refs (committed, small)
public/models/*.glb        optimized, committed
```

## Risks

| Risk | Mitigation |
|---|---|
| Rodin character mesh not in T/A-pose → Mixamo auto-rig fails | Reference images explicitly prompt A-pose, arms away from body, feet apart; Phase 4 has a Blender pose-fix fallback |
| ~~Doraemon rigs badly in Mixamo~~ | Resolved by dropping rigging entirely; all characters use procedural motion |
| ~~Rodin house has fused windows/roof~~ | Resolved by not using Rodin for the house at all; `house_build.py` models it procedurally |
| 600k-tri Rodin meshes ×6 | Decimate to ≤ 30k per character, ≤ 60k house in Blender before export |
| Gemini image style drift between characters | One shared style prefix + same seed-like phrasing; generate a contact sheet first for user approval |
| Poly Haven and Poly Pizza integrations are disabled in the Blender addon | Trees and shrubs are built procedurally in `scripts/blender/env_build.py` instead; no external asset dependency |
| drei `SoftShadows` fails to compile on three 0.186 (`vogelDiskSample: function already has a body`), rendering the whole scene white | Removed; the scene uses the default PCF shadow map |
