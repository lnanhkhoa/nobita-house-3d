---
phase: 1
title: "Foundation & Scaffold"
status: pending
priority: P1
dependencies: []
effort: "4h"
---

# Phase 1: Foundation & Scaffold

## Overview

Hand-built Vite + TS + three.js scaffold. No `npm create` template — every file below is authored, so nothing unused ships. Ends at: orbit a lit, shadowed empty ground plane at 60fps with a clean `typecheck`/`lint`/`test`.

Deliberately **not** in scope: house geometry, props, UI chrome, loading veil. Phase 1 owns build config, the render core, the state store, and the seed of the type contract.

## Requirements

| # | Requirement | Verified by |
|---|---|---|
| R1 | `package.json` scripts: `dev` `build` `preview` `typecheck` `lint` `format` `test` `assets:build` | `npm run <s>` exits 0 (`assets:build` may no-op — Phase 4 fills it) |
| R2 | TS `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax` | `npm run typecheck` |
| R3 | Renderer matches `docs/tech-stack.md` §Rendering recipe exactly | code review + visual |
| R4 | 4-light rig: hemi ambient, directional key (only shadow caster), fill, rim | one `castShadow=true` in scene |
| R5 | `camera-controls@3.1.2` wired; damped orbit, dolly, truck; `fitToBox` available to Phase 5 | manual orbit |
| R6 | DPR clamped ≤ 2; resize driven by `ResizeObserver`, not `window.onresize` | resize window, no stretch |
| R7 | `app-state.ts` = `EventTarget` store, exactly the 7 fields + `onChange` helper from `plan.md` | unit test |
| R8 | `lil-gui` + `stats.js` **absent** from the prod chunk graph | `npm run build` + grep assertion (SC-8) |
| R9 | Lint/format tool decided (open item in `docs/tech-stack.md`) | `biome.json` exists |
| R10 | All tunables in `src/config.ts`; no magic numbers in `core/` | grep review |
| R11 | `webglcontextlost`/`webglcontextrestored` handled: loss calls `preventDefault()`, stops the render loop, and shows a recoverable message; restore rebuilds/resumes with no reload | `WEBGL_lose_context` extension test |

## Architecture

### Dependency set (versions from `docs/tech-stack.md`; Biome + Vitest npm-verified 2026-08-02)

| Package | Version | Scope | Source |
|---|---|---|---|
| `three` | `0.185.1` | dep | tech-stack |
| `camera-controls` | `3.1.2` | dep | tech-stack |
| `vite` | `8.2.0` | dev | tech-stack |
| `typescript` | `7.0.2` | dev | tech-stack |
| `@types/three` | matching `0.185.x` | dev | — (three ships no bundled types for `examples/jsm`) |
| `lil-gui` | `0.21.0` | dev | tech-stack |
| `stats.js` + `@types/stats.js` | latest | dev | tech-stack |
| `@gltf-transform/cli` | `4.4.2` | dev | tech-stack (used in Phase 4) |
| **`@biomejs/biome`** | **`2.5.6`** | dev | **new — see D1** |
| **`vitest`** | **`4.1.10`** | dev | tech-stack names Vitest, pins no version |

### D1 — Lint/format: **Biome 2.5.6**, not ESLint + Prettier

| Axis | Biome | ESLint + Prettier |
|---|---|---|
| Install | 1 package, 1 config | 6+ packages (`eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `eslint-config-prettier`, plugins), 2 configs |
| TS 7 risk | **Zero** — own Rust parser, never loads `typescript` | `typescript-eslint` must support the TS 7 (Go-native) compiler; historically lags majors by weeks |
| Speed | ~10–35x on lint+format | baseline |
| What we lose | type-aware rules (`no-floating-promises`) | — |

We have **no framework lint plugins** (no React/Vue/a11y-JSX), so ESLint's plugin ecosystem — its only real advantage — buys nothing. The lost type-aware rules are covered by `tsc --noEmit` plus a codebase of ~25 small modules. **Decision: Biome.** Reversible in ~30 min if a type-aware rule becomes load-bearing.

### Boot data flow (`main.ts`)

```
config.ts ──┐
            ├─> createRenderer(canvas) ─> WebGLRenderer
            ├─> createScene()          ─> Scene + 4 lights + ground plane
            ├─> createCameraRig(canvas, renderer) ─> { camera, controls }
            └─> startLoop({renderer, scene, camera, controls}) ─> rAF
appState ── standalone; nothing in core/ reads it in Phase 1 (Phase 5 subscribes)
```

`main.ts` also ships **stubbed** `?edit=1` and `?stats=1` dynamic-import branches from Phase 1 onward — each is a guarded check on `location.search` awaiting a dynamic `import()` that is a no-op today. This gives `main.ts` exactly one owner for both call sites; Phase 8 (editor) and Phase 9 (perf-hud) each fill in their own branch's import path without adding a new branch, avoiding a three-way conflict on this file.

`main.ts` is the **only** module allowed to import from more than one folder. `core/*` never imports `ui/`, `world/` or `state/`.

### `app-state.ts` contract — frozen; Phases 5–9 code against this

```ts
import type { FloorId } from '../data/types';

export type FloorFilter = FloorId | 'all';

export interface AppState {
  activeRoom: string | null;          // RoomDef.id, null = whole house
  floorFilter: FloorFilter;           // 'all' = show both storeys
  roofOn: boolean;
  cutawayOn: boolean;
  autoRotate: boolean;                // view-controls needs it for aria-pressed
  selectedHotspot: string | null;     // HotspotDef.id
  loading: { total: number; loaded: number; done: boolean };
}

export interface StateChange {
  prev: Readonly<AppState>;
  next: Readonly<AppState>;
  changed: ReadonlyArray<keyof AppState>;   // shallow-compared keys only
}

export const appState: {
  get(): Readonly<AppState>;
  set(patch: Partial<AppState>): void;      // shallow merge; no-op + no event if nothing changed
  subscribe(fn: (c: StateChange) => void): () => void;   // returns unsubscribe
  onChange<K extends keyof AppState>(key: K, cb: (next: AppState[K], prev: AppState[K]) => void): () => void;
};
```

Rules: `set` is synchronous, fires **one** `change` event per call, and skips the event entirely when the shallow diff is empty (prevents feedback loops when a UI control echoes state back). `onChange(key, cb)` is a thin filter over that same event, not a second channel: it calls `subscribe` once and invokes `cb(next[key], prev[key])` only when `changed.includes(key)`. 7 fields, one batched event per `set()` — YAGNI still holds.

`FloorId` lives in `src/data/types.ts`. **Phase 1 creates that file containing only `export type FloorId = 'ground' | 'second';`**; Phase 2 appends the rest. Sequential ownership (2 depends on 1) so there is no concurrent edit.

### Dev-only gating (R8)

```ts
// core/loop.ts
if (import.meta.env.DEV) {
  const { default: Stats } = await import('stats.js');   // dynamic — dropped from prod graph
  stats = new Stats();
  document.body.appendChild(stats.dom);
}
```

Vite statically replaces `import.meta.env.DEV` with `false` in `build`, the branch is dead-code-eliminated, and the dynamic import is therefore never emitted as a chunk. Static `import Stats from 'stats.js'` would **not** be eliminated — never use it. Same pattern for `lil-gui` (Phase 8) and the whole `src/editor/` folder.

## Related Code Files

Create (all new; repo has no `src/` content today):

| Path | Purpose |
|---|---|
| `package.json` `tsconfig.json` `vite.config.ts` `biome.json` | build + tooling |
| `index.html` | canvas + `#ui-root` + font links |
| `src/main.ts` | boot |
| `src/config.ts` | all tunables |
| `src/style.css` | design tokens (§3 of `docs/design-guidelines.md`, verbatim) + reset + z/pointer-events layering (§4) |
| `src/vite-env.d.ts` | `/// <reference types="vite/client" />` |
| `src/core/renderer.ts` `scene-lighting.ts` `camera-rig.ts` `loop.ts` | render core |
| `src/state/app-state.ts` | store |
| `src/data/types.ts` | **seed only**: `FloorId` |
| `src/state/app-state.test.ts` | Vitest |
| `.gitignore` | add `node_modules dist assets/raw .biome-cache` |

## Implementation Steps

1. **`package.json`** — `"type": "module"`, deps above. Scripts:
   `dev: vite` · `build: tsc --noEmit && vite build` · `preview: vite preview` · `typecheck: tsc --noEmit` · `lint: biome check .` · `format: biome check --write .` · `test: vitest run` · `assets:build: node scripts/build-assets.mjs` (Phase 4 authors the script; until then it must exist as a 1-line stub that exits 0).
2. **`tsconfig.json`** — `target ES2022`, `module preserve`, `moduleResolution bundler`, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `noEmit`, `types: ["vite/client"]`, `include: ["src", "vite.config.ts", "scripts"]`, `allowJs` for `scripts/*.mjs`.
3. **`biome.json`** — `formatter: { indentStyle: "space", indentWidth: 2, lineWidth: 100 }`, `linter.rules.recommended: true`, `javascript.formatter.quoteStyle: "single"`, `files.includes: ["**", "!dist", "!assets/raw", "!public/models"]`.
4. **`vite.config.ts`** — `base: '/'`, `server.port: 5173`, `build.outDir: 'dist'`, `build.target: 'es2022'`, `build.manifest: true` (Phase 9's `scripts/assert-prod-split.mjs` reads `dist/.vite/manifest.json`). Add the Vitest block here (one config file, not two): `test: { environment: 'node', include: ['src/**/*.test.ts'] }`. `environment: 'node'` is correct — every test in this project is pure logic (state, layout math, data integrity); nothing needs a DOM. Revisit only if Phase 7 adds DOM tests.
5. **`index.html`** — `<canvas id="scene">` with the `role="img"` + `aria-label` string from `docs/design-guidelines.md` §8, then `<div id="gl-lost" hidden role="alert">Rendering paused — restoring…</div>` (R11's recoverable-message overlay), then `<div id="ui-root"></div>`, then `<script type="module" src="/src/main.ts">`. Font `<link>` per design-guidelines §2.
6. **`src/style.css`** — paste the `:root` token block from design-guidelines §3 verbatim (single source of truth for UI colour; **do not** duplicate these into TS). Add: `html,body{margin:0;height:100%;overflow:hidden;background:var(--paper-200)}`, `#scene{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none;z-index:var(--z-canvas)}`, `#ui-root{position:fixed;inset:0;pointer-events:none;z-index:var(--z-chrome)}`. Add `#gl-lost{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--paper-200);color:var(--ink-900);z-index:var(--z-chrome);font:inherit}#gl-lost[hidden]{display:none}` — sits above the canvas, below nothing else needs to render while the GPU context is gone.
7. **`src/config.ts`** — every tunable, typed `as const`:
   ```ts
   export const RENDER = { maxDpr: 2, antialias: true, shadowMapSize: 2048 } as const;
   export const CAMERA = { fov: 35, near: 0.1, far: 200, start: { pos: [11, 9, 13], target: [3.6, 1.2, 4.1] } } as const;
   export const CONTROLS = { smoothTime: 0.35, minDistance: 2.5, maxDistance: 42,
                             minPolarAngle: 0.15, maxPolarAngle: Math.PI * 0.49 } as const;
   export const LIGHT = { hemiSky: 0xbfd8ef, hemiGround: 0x8a7f6a, hemiIntensity: 0.55,
                          keyIntensity: 2.1, fillIntensity: 0.45, rimIntensity: 0.35 } as const;
   export const FEATURES = { stats: true, autoRotate: false } as const;
   ```
   `fov: 35` (not 50) — a narrow FOV is what makes a diorama read as a *model* rather than an interior; it also reduces the wall-cutaway workload in Phase 5. `maxPolarAngle < π/2` stops the camera going under the ground plane. `CONTROLS.maxDistance: 42` (not the earlier 30) — the whole-lot orbit view (Phase 5's `lotBox`, `plan.md` Reconciled contracts / red-team H2) needs to pull the camera back far enough to frame the full ~13.65 m yard, not just the house.

   **`config.ts` ownership (append-only, cross-phase).** Phase 1 owns and exports `CAMERA` and `CONTROLS` — no later phase may redeclare or restructure either object (a redeclaration is a TS2451 duplicate-symbol error, and a restructure silently orphans whichever tunable moved). Later phases add their own **new**, separately-named `const` blocks instead: Phase 5 may add `export const CUTAWAY = {...}` for its cutaway-specific tunables; Phase 6 may add `export const HOTSPOT = {...}` for pin/probe tunables. Neither may touch `CAMERA`, `CONTROLS`, `RENDER`, `LIGHT`, or `FEATURES`. If a later phase needs to widen an *existing* Phase-1 tunable (as this phase just did for `maxDistance`), that is a one-line edit to this file, flagged in that phase's report — not a shadow copy.
8. **`src/core/renderer.ts`** — exactly the tech-stack recipe:
   ```ts
   THREE.ColorManagement.enabled = true;                 // module-level, before any Color is built
   const renderer = new THREE.WebGLRenderer({ canvas, antialias: RENDER.antialias, alpha: false });
   renderer.setPixelRatio(Math.min(devicePixelRatio, RENDER.maxDpr));
   renderer.outputColorSpace = THREE.SRGBColorSpace;
   renderer.toneMapping = THREE.NeutralToneMapping;      // Khronos PBR-neutral: preserves flat palette
   renderer.toneMappingExposure = 1.0;
   renderer.shadowMap.enabled = true;
   renderer.shadowMap.type = THREE.PCFSoftShadowMap;     // renderer-level; only the key light casts
   ```
   Export `resize(w, h)` that calls `setPixelRatio` again — DPR changes when a window moves between displays.

   **WebGL context loss (R11).** No phase owns this by default, and iOS Safari drops the WebGL context routinely on tab backgrounding — without `preventDefault()` the loss is permanent for the rest of the session (blank canvas, no error). Wire it in the same module:
   ```ts
   const lostCbs = new Set<() => void>();
   const restoredCbs = new Set<() => void>();
   canvas.addEventListener('webglcontextlost', (e) => {
     e.preventDefault();                       // mandatory — without this the browser never restores the context
     lostCbs.forEach((fn) => fn());
   }, false);
   canvas.addEventListener('webglcontextrestored', () => restoredCbs.forEach((fn) => fn()), false);
   ```
   Export `onContextLost(fn)` / `onContextRestored(fn)` alongside `resize`. `main.ts` wires: on loss → `loop.stop()` + reveal the `#gl-lost` overlay (index.html, step 5); on restore → hide the overlay + `loop.resume()`. No manual GPU-resource rebuild is needed here — three.js keeps CPU-side copies of every geometry/texture and re-uploads them lazily on the next `render()` call after restore; Phase 1's scene (a plane + 4 lights) and every later phase's shell/prop geometry follow the same lazy-reupload path, so this handler needs no per-phase update as the scene grows.
9. **`src/core/scene-lighting.ts`** — `createScene()` returns a `Scene` with `background = new Color(palette sky #87CEEB)` and:
   - `HemisphereLight(hemiSky, hemiGround, 0.55)`
   - `DirectionalLight(0xfff2e0, 2.1)` at `(8, 12, 6)`, `castShadow = true`, ortho shadow camera framed to the lot (`left/right/top/bottom = ±10`, `near 1`, `far 40`), `shadow.mapSize 2048`, `shadow.bias -0.0005`, `shadow.normalBias 0.02`
   - `DirectionalLight(0xdce9ff, 0.45)` at `(-7, 5, -6)`, no shadow (fill)
   - `DirectionalLight(0xffffff, 0.35)` at `(-3, 4, -10)`, no shadow (rim)
   - temporary 20×20 `MeshStandardMaterial({color: 0x6B8E23, roughness: 1})` ground plane, `receiveShadow`, `name: 'temp-ground'` — **Phase 3 deletes it** and replaces it with the yard.
10. **`src/core/camera-rig.ts`** — `CameraControls.install({ THREE })` at module scope, `PerspectiveCamera(CAMERA.fov, 1, near, far)`, apply `CONTROLS`, `controls.setLookAt(...CAMERA.start.pos, ...CAMERA.start.target, false)`. Export `{ camera, controls }`.
11. **`src/core/loop.ts`** — `Clock`; each frame `const dt = Math.min(clock.getDelta(), 0.1)` (clamp so a backgrounded tab does not jump the damping), `controls.update(dt)`, `renderer.render(scene, camera)`. `ResizeObserver` on `document.body` → `renderer.resize` + `camera.aspect` + `updateProjectionMatrix`. Dev-only Stats per the R8 pattern. Return `{ stop(), resume() }`: `stop()` cancels the rAF handle (used for HMR disposal **and** by `renderer.onContextLost`); `resume()` calls `clock.getDelta()` once to discard the stale elapsed time (avoids a large `dt` jump on the first frame back) then restarts the rAF loop — used by `renderer.onContextRestored`.
12. **`src/state/app-state.ts`** — implement the contract above over a private `EventTarget` + `CustomEvent<StateChange>`.
13. **`src/main.ts`** — import `./style.css`, boot in order, `import.meta.hot?.dispose(() => loop.stop())`; add stub `?edit=1` / `?stats=1` dynamic-import branches (no-op today; Phases 8/9 fill them in). Wire R11: `const glLost = document.getElementById('gl-lost')!; renderer.onContextLost(() => { loop.stop(); glLost.hidden = false; }); renderer.onContextRestored(() => { glLost.hidden = true; loop.resume(); });`
14. **`src/state/app-state.test.ts`** — assert: initial shape; `set` merges shallowly; a no-op `set` fires **no** event; `changed` lists only real diffs; `subscribe` returns a working unsubscribe.
15. Run `npm run format && npm run lint && npm run typecheck && npm test && npm run build`.

## Success Criteria

- [ ] `npm run dev` serves on :5173; canvas fills viewport; orbit/dolly/truck are damped and never clip below the ground plane.
- [ ] Chrome DevTools **Performance** ≥ 58 fps median over a 10 s orbit at 1920×1080.
- [ ] `npm run typecheck` → exit 0, zero diagnostics.
- [ ] `npm run lint` → exit 0.
- [ ] `npm test` → 5/5 app-state assertions pass.
- [ ] `npm run build` → exit 0.
- [ ] **SC-8:** `! grep -rlE "stats\.js|lil-gui" dist/assets/` exits 0 (no match) **and** `ls dist/assets/*.js | wc -l` shows no chunk whose name contains `stats` or `lil`.
- [ ] `node -e "const s=require('fs').statSync('dist/assets/'+require('fs').readdirSync('dist/assets').find(f=>f.endsWith('.js')));"` — total `dist/assets/*.js` gzipped < 700 KB (`gzip -c dist/assets/*.js | wc -c`); three.js alone is ~600 KB gz, so this is the headroom check, not a stretch goal.
- [ ] `src/data/types.ts` exports `FloorId` and nothing else.
- [ ] Resizing the window (and dragging it to a 1x-DPR display) never distorts the render.
- [ ] **SC-10 (R11):** `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` → within one frame the render loop stops, `#gl-lost` is no longer `hidden`, and no uncaught error is thrown. Calling `.restoreContext()` on the same extension → `#gl-lost` becomes `hidden` again, the loop resumes, and the next frame renders without error or a visible pop/jump.

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| TypeScript `7.0.2` is the Go-native compiler — a major; flag/behaviour drift vs 5.x | M×M | We use `tsc --noEmit` only (Vite/esbuild does the transpile), so the blast radius is one script. Pin exactly. | `npm i -D typescript@5` — no source changes needed |
| `@biomejs/biome@2.5.6` is a **new dependency** not listed in `docs/tech-stack.md` | M×L | Justified in D1; it *replaces* 6 packages rather than adding to them. `biome.json` is the only artifact. | Delete `biome.json`, install ESLint+Prettier; no `src/` change |
| `@types/three` version skews from `three@0.185.1` and breaks `examples/jsm` imports | M×M | Pin `@types/three` to the same minor; if unavailable, add a 5-line local `.d.ts` shim for the two `examples/jsm` modules Phase 4 needs | shim file |
| Vite 8 (Rolldown) tree-shakes `import.meta.env.DEV` branches differently than Rollup, leaking dev tools | L×H | SC-8 is a **mechanical gate on every build**, not a review item. If it fails, move `stats`/`lil-gui` behind a `?debug=1` dynamic import from a separate entry. | — |
| `NeutralToneMapping` still desaturates the flat palette | M×L | Swap `renderer.toneMapping = THREE.NoToneMapping` — one line in `renderer.ts`; judged visually in Phase 3 against `house-ground.webp` | one line |
| `PCFSoftShadowMap` + 2048 map costs too much on mid-tier mobile | M×M | `RENDER.shadowMapSize` is a config knob; Phase 9 owns the mobile budget. Fallback path is `BasicShadowMap` at 1024. | config edit |
| `data/types.ts` touched by both Phase 1 and 2 | L×L | Strictly sequential (Phase 2 `dependencies: [1]`). Phase 1 writes one line and never returns to the file. | — |
