# Phase 1 — Foundation scaffold + proxy scene

## Context
Empty `src/`, `public/`. Old plan's docs remain in `docs/` (stack doc to be rewritten in Phase 6; design tokens reused).

## Requirements
- Vite 8 + React 19 + TS 7 strict + Biome; scripts: dev, build, preview, lint, typecheck, test (vitest, logic only).
- R3F `<Canvas>` with drei `OrbitControls` (polar/distance limits), hemisphere + directional light with shadow, sky colour bg, ground plane.
- Proxy geometry for every asset in `data/scene.ts` and `data/characters.ts`: house = boxes (2 storeys + hipped roof wedge), wall = thin box ring, characters = capsule + sphere head, colour per character.
- `model-or-proxy.tsx`: attempts `useGLTF(path)`; if fetch fails → proxy. Must not throw in Suspense loop (preflight `fetch(HEAD)` cached in store).
- Runs on day 1: `npm run dev` shows the composition of `nobita_house_characters_scene.png` in boxes.

## Files
`package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `index.html`, `src/main.tsx`, `src/app.tsx`, `src/config.ts`, `src/data/*`, `src/scene/*`, `src/state/store.ts`, `src/styles/tokens.css`, `src/styles/app.css`.

## Steps
1. Scaffold deps at the versions in plan; `npm install`.
2. Data files with real-world metres: lot 14 × 12 m, house footprint 8 × 7 m, wall height 1.6 m, characters 1.0–1.35 m (Doraemon 1.29 canon).
3. Proxy scene + lighting + controls.
4. Vitest smoke test on data integrity (unique ids, paths under /models).

## Validation
`npm run dev` renders; `lint`, `typecheck`, `test`, `build` clean.

## Risk / rollback
None; greenfield.
