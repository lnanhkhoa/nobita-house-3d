---
phase: 9
title: "Perf, A11y, QA & Docs"
status: pending
priority: P1
dependencies: [6, 7, 8]
effort: "8h"
---

# Phase 9: Perf, A11y, QA & Docs

## Overview

Closes every global acceptance criterion in `plan.md` with a **command or a number**, not an opinion. Adds the measurement instrumentation the earlier phases assumed, the Vitest suite over pure logic, the cross-device matrix, and the four docs plus the asset-authoring guide the user needs to keep generating Rodin props after this plan ends.

## Requirements

| # | Requirement |
|---|---|
| R9.1 | Perf budget verified with a stated measurement method per metric: draw calls < 120, tris < 80k, texture mem < 40 MB, 60 fps desktop / ≥ 30 fps mid-tier mobile, initial payload < 3 MB gzip. |
| R9.2 | `editor/` proven absent from the prod entry chunk graph by a script over the build output. |
| R9.3 | A11y audit against every line of design-guidelines §8, plus contrast verification and a keyboard-only walkthrough. |
| R9.4 | Cross-browser / device matrix including real mobile Safari. |
| R9.5 | Vitest coverage of all pure logic: bounds math, framing, cutaway hysteresis, manifest integrity, layout round-trip. |
| R9.6 | Docs: `README.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/code-standards.md`, `docs/asset-authoring-guide.md`. |
| R9.7 | Every global criterion in `plan.md` mapped to its proving command. |

## Architecture

### Measurement instrumentation

One dev-only flag, `?stats=1`, mounted from `main.ts` alongside the `?edit=1` branch and code-split the same way (`await import('./core/perf-hud')`). It renders `stats.js` plus a four-line readout sampled every 60 frames:

```ts
const r = renderer.info;
hud.textContent =
  `calls ${r.render.calls}  tris ${r.render.triangles}  ` +
  `geo ${r.memory.geometries}  tex ${r.memory.textures}`;
window.__perf = () => ({ ...r.render, ...r.memory });   // for console assertions
```

`renderer.info.memory.textures` is a **count**, not bytes — texture *memory* cannot be read from three.js and must come from the asset files instead (below).

### Metric → method table

| Metric | Budget | How it is measured | Where the number is recorded |
|---|---|---|---|
| Draw calls | < 120 | `?stats=1`, whole-house view, roof on, cutaway on, after 120 frames. `window.__perf().calls`. Worst case (all rooms visible) is the number that counts. | `docs/codebase-summary.md` §Perf |
| Triangles | < 80k | `window.__perf().triangles`, same view | same |
| Texture memory | < 40 MB | No standalone script (cut as YAGNI — `plan.md` red-team rulings). Phase 4's `scripts/build-assets.mjs` already opens every GLB with `@gltf-transform/core` to report size/triangle counts; it also sums `w×h×4×1.33` (mips) per unique texture and prints the total in the same pass. `npm run assets:build` and read that number. Offline, deterministic, no device needed. | script output committed in the report |
| FPS desktop | 60 | Chrome DevTools → Performance, 10 s continuous orbit at 1440×900. Report p50 and p05 frame time; pass if p05 ≤ 16.7 ms. | same |
| FPS mobile | ≥ 30 | Real device (iPhone 12-class or Pixel 6a-class) over `npm run dev -- --host`, `?stats=1`, 10 s orbit. Record device model + fps. Simulators do not count. | same |
| Initial payload | < 3 MB gzip | `npm run build && du -sh dist && gzip -c dist/assets/index-*.js \| wc -c` plus the sum of the models fetched before `loading.done`. | same |
| Editor absent | — | `scripts/assert-prod-split.mjs` (below) | CI-less: run in the QA pass |

### `scripts/assert-prod-split.mjs`

Requires `build.manifest: true` in `vite.config.ts` (Phase 1 or added here). Walks the **static** `imports` closure from the `src/main.ts` entry and fails if any key matches `/editor/` or `/perf-hud/`; then asserts both appear under some entry's `dynamicImports`. Exit 1 on failure so it can be chained into `npm run verify`.

### Test suite (Vitest, no GL context)

| File | Covers | Key assertions |
|---|---|---|
| `src/utils/bounds.test.ts` | `roomBox`, `houseBox`, `framePose`, `roomAzimuth`, `cutawayDecision` | azimuth sweep 0→2π at 0.25° yields **exactly 2 cutaway transitions per wall**; `framePose().position` outside `houseBox.expandByScalar(0.25)` for 11 rooms × 3 aspect ratios; `roomAzimuth` ≥ 20° off every wall axis |
| `src/data/manifest-integrity.test.ts` | `rooms.ts`, `props.ts`, `hotspots.ts` | every `PropDef.roomId` ∈ rooms; every `HotspotDef.propId` ∈ props; ids unique + kebab-case; every `PropDef.hotspot` has a matching `HotspotDef` and vice-versa; every hotspot `body` is 2–4 sentences; every `PropDef.size` is 3 positive finite numbers; room footprints do not overlap within a floor |
| `src/editor/layout-roundtrip.test.ts` | Phase 8 export ↔ Phase 4 loader | 63 placed objects (all 54 placeable props incl. every `count > 1` instance) survive `applyEntry → toEntry` — object **count** and every per-object transform both intact, matched by `propId#instance`; rotation normalisation idempotent (B2 fix — a same-count/positional comparison over a `count === 1`-only fixture is what let the dropped-`instance` bug ship originally) |
| `src/world/layout-loader.test.ts` | Phase 4 loader | unknown `propId` in `layout.json` is skipped with a warning, never throws; missing `layout.json` boots with props at room centres |

Total ≈ 4 files. No DOM tests, no Playwright — `tech-stack.md` defers E2E, and browser-dependent behaviour is covered by the manual matrix instead of by a fragile headless harness. `scripts/check-contrast.mjs` was cut as YAGNI (below) — it is not a vitest file and was never really part of this count.

### Keyboard-only walkthrough script (run with the mouse unplugged)

1. Load → veil dismisses → focus is on `<h1>`.
2. `Tab` → skip link visible → `Enter` → focus lands in the sr-only room nav.
3. `Tab` through the rail: 12 stops (Whole House + 11 rooms), each with a visible ring, `aria-current` following.
4. `Enter` on "Nobita's Bedroom" → camera flies → `#sr-live` announces the room.
5. `Tab` → view control buttons, `Space` toggles each, `aria-pressed` and the glyph both change, `#sr-live` announces.
6. `Tab` → canvas (nudge) → arrows orbit.
7. `Tab` → pins in room order; occluded pins are skipped entirely.
8. `Enter` on a pin → card opens → focus is inside it → `Tab` cycles within → `Esc` closes → focus is back on that pin.
9. Switch room while a card is open → `Esc` → focus falls back to the active rail row, never `<body>`.
10. `Shift+Tab` all the way back to the skip link with no focus trap outside the card.

### Cross-browser / device matrix

| Target | Version | Specific risks to check |
|---|---|---|
| Chrome desktop (macOS) | current | baseline; perf numbers taken here |
| Safari desktop (macOS) | 26 | `backdrop-filter` on `--panel-bg`, variable-font axes, `isolation:isolate` |
| Firefox desktop | current | `backdrop-filter`, `scroll-snap` chips, focus-ring rendering |
| **iOS Safari (real device)** | current | `100dvh` plinth clipping, `env(safe-area-inset-bottom)`, `touch-action:none` orbit vs page scroll, `inert`, sheet drag vs body bounce, WebGL context loss on backgrounding |
| Android Chrome (real device) | current | mid-tier fps floor, touch-tap vs orbit-drag discrimination |
| Safari/Chrome, `prefers-reduced-motion: reduce` | — | camera cuts instantly, auto-rotate off, pin pulse static |

### Docs deliverables

| File | Contents |
|---|---|
| `README.md` | What it is, IP disclaimer, `npm i` → `npm run dev`, the 5 scripts, `?edit=1` / `?stats=1`, project status, link to the asset guide |
| `docs/codebase-summary.md` | Module map with one line per file, the state contract, the **measured** perf numbers table |
| `docs/system-architecture.md` | Boot sequence, frame loop order (`controls.update → cutaway → pins → render`), data flow diagram, the z-index/pointer-events contract, why the shell is procedural |
| `docs/code-standards.md` | TS strict, no default exports, kebab-case files, DOM-over-framework, `dispose()` on every module that adds listeners or GPU resources, append-only `config.ts` blocks |
| `docs/asset-authoring-guide.md` | The full prop loop, below |

### Asset-authoring loop (the doc that outlives this plan)

```
1. Pick a prop from src/data/props.ts. Copy its `rodinPrompt` verbatim.
2. hyper3d.ai/rodin → Text-to-3D → paste prompt → append the shared style suffix
   "low poly, flat shading, no texture detail, single object, centred, Y-up".
3. Download GLB → assets/raw/<prop-id>.glb   (filename MUST equal PropDef.id)
4. npm run assets:build        # gltf-transform weld → simplify → resize → meshopt
                               # writes public/models/<prop-id>.glb
5. npm run dev -- '?edit=1'    # the proxy box is now the real model
6. Search the prop id in the editor list → click → gizmo to place → snap 0.05
7. Rodin does NOT centre pivots. If the model floats or sinks, fix it in
   src/data/asset-meta.ts (scale / offset / rotation) — never by moving the layout entry.
8. EXPORT layout.json → mv ~/Downloads/layout.json public/layout.json
9. Reload without ?edit=1 → verify → commit public/models/<id>.glb + public/layout.json
```
Plus: the font re-acquisition commands from Phase 7, the `?stats=1` procedure, and a "prop looks wrong" triage table (too big → `AssetMeta.scale`; floating → `offset`; lying on its side → `rotation`; wrong colour → palette material override).

## Related Code Files

**Create**
- `src/core/perf-hud.ts` (dynamic import, `?stats=1`)
- `scripts/assert-prod-split.mjs` (`scripts/texture-budget.mjs` and `scripts/check-contrast.mjs` are cut as YAGNI — see Metric table and Test suite above; texture bytes fold into Phase 4's `build-assets.mjs`, contrast folds into the axe scan below)
- `src/utils/bounds.test.ts`, `src/data/manifest-integrity.test.ts`, `src/world/layout-loader.test.ts`
- `README.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/code-standards.md`, `docs/asset-authoring-guide.md`

**Modify**
- `package.json` — `"verify": "npm run typecheck && npm run lint && npm test && npm run build && node scripts/assert-prod-split.mjs"`
- `vite.config.ts` — `build.manifest = true`
- `src/main.ts` — `?stats=1` dynamic import (same shape as `?edit=1`)

**Read only** — every source file; `plan.md`; `docs/design-guidelines.md` §8.

## Implementation Steps

1. `vite.config.ts` manifest on; write `scripts/assert-prod-split.mjs`; run it — it should already pass if Phase 8 was disciplined. Fix imports, not the script.
2. `perf-hud.ts` + `?stats=1`. Take the draw-call and triangle numbers at the whole-house view and record them **before** any optimisation, so the baseline is honest.
3. If draw calls > 110: apply Phase 5's documented escape hatch (BatchedMesh walls, instant-cut cutaway) or Phase 4's (InstancedMesh for repeated small props: tatami mats, zabuton, jars, shrubs — ~25 of `PROPS.length`). Re-measure. Do not touch anything else.
4. Texture budget: read the total Phase 4's `scripts/build-assets.mjs` already prints from `npm run assets:build` — no standalone script (cut as YAGNI). If low-poly props ship with no textures the number is ~0 — record that rather than skipping the check.
5. Write the four test files. `manifest-integrity.test.ts` first: it is the cheapest and catches Phase 2 data drift that everything downstream assumes.
6. axe DevTools full-page scan in the loaded, card-open, and mobile-sheet states. Fix serious/critical; document any "needs review" item with a reason. This is also the contrast gate (cut the standalone `check-contrast.mjs` as YAGNI — axe already checks every rendered text/background pair against WCAG); if axe flags a pair, cross-check it against the documented ratios (13.7 / 8.4 / 5.2 / 5.1 / 5.7) to localise the failure.
7. Run the keyboard walkthrough. Any step that fails is a Phase 6/7 bug, not a Phase 9 waiver.
8. VoiceOver pass: rotor → all 11 rooms and all 12 hotspots present; canvas announces its `aria-label`; `#sr-live` announcements fire once, not twice.
9. Cross-browser matrix, real devices for the two mobile rows. Log failures with browser + version + repro.
10. Write the docs. `codebase-summary.md` and `system-architecture.md` are written **after** the measurements so the numbers are real. Verify every file path and command in the docs actually exists/runs.
11. Fill the `plan.md` global-criteria mapping table (below) and paste it into the phase report.

### `plan.md` global criteria → proof

| Criterion | Proof |
|---|---|
| Full house renders, zero missing-asset errors | `npm run dev`, console filtered to `error` → 0 lines; `propRegistry.size === PLACEABLE_PROPS.reduce((n,p)=>n+(p.count??1),0)` (63 — H6: the registry holds one entry per placed *instance*, not per `PropDef`, so it is never `PROPS.length` (65) or `PLACEABLE_PROPS.length` (54)) |
| Drop a GLB → `npm run assets:build` → proxy swaps, no code change | Manual with one real prop; recorded in the asset guide |
| 4 toggles + 11 room jumps on desktop and touch | Phase 5 criteria + the mobile matrix rows |
| Pins keyboard-reachable; card is a focus-trapped Esc-closable dialog | Keyboard walkthrough steps 7–9 |
| `?edit=1` places props and exports a layout prod reads verbatim | `layout-roundtrip.test.ts` + Phase 8's manual loop |
| < 120 calls, < 80k tris, 60 / ≥ 30 fps | Metric table above, numbers recorded |
| `typecheck`, `lint`, `test` clean | `npm run verify` exits 0 |

## Success Criteria

- [ ] `npm run verify` exits 0 (typecheck + lint + test + build + prod-split assertion).
- [ ] `node scripts/assert-prod-split.mjs` prints `OK: editor/ and perf-hud/ are dynamic-only` and exits 0.
- [ ] `window.__perf().calls < 120` and `.triangles < 80000` at the whole-house view, recorded verbatim in `docs/codebase-summary.md`.
- [ ] `npm run assets:build` (Phase 4's `scripts/build-assets.mjs`) prints a summed texture total `< 40.0 MB` — no standalone script (cut as YAGNI).
- [ ] DevTools Performance, 10 s desktop orbit: p05 frame time ≤ 16.7 ms.
- [ ] Named real mobile device sustains ≥ 30 fps for a 10 s orbit; device model recorded.
- [ ] `gzip -c dist/assets/index-*.js | wc -c` + first-paint model bytes < 3 MB.
- [ ] axe DevTools: 0 serious, 0 critical, in all three page states (this is also the contrast gate — no standalone `check-contrast.mjs`, cut as YAGNI; cross-check the documented ratios 13.7/8.4/5.2/5.1/5.7 if axe flags a pair).
- [ ] Keyboard walkthrough: all 10 steps pass with the mouse unplugged.
- [ ] Cross-browser matrix: all 6 rows pass or have a logged, accepted defect.
- [ ] `npx vitest run` — 4 files, 0 failures; `manifest-integrity` covers all 11 rooms, all `PROPS` entries (65), 12 hotspots.
- [ ] All 5 docs exist; every command quoted in them runs successfully when pasted into a fresh shell.
- [ ] The `plan.md` criteria mapping table is filled with real numbers, no `TBD`.

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Shell + prop draw calls (35 shell meshes — incl. the 18 per-wall meshes — plus ~63 prop objects ≈ 98) sit inside the renegotiated < 120 budget | L×L | Budget raised to `<120` by the lead (`plan.md` Reconciled contracts #4) — no longer at risk. Escape hatches are pre-written and stay **documented, unbuilt** (BatchedMesh walls; InstancedMesh for the ~25 repeated small props), triggered only if measured frame time misses the fps target, never by a draw-call count. Measure first per step 2-3 above; only optimise if the fps gate actually fails. | — |
| Mobile fps fails only on a device we do not own | M×M | Test on whatever real hardware exists and **record the device**. An untested device class is a stated gap, not a silent pass. | Ship with the gap documented in `README.md`. |
| Fixing an a11y finding late requires reworking Phase 6/7 | M×H | Phases 6 and 7 already carry the a11y assertions as their own success criteria, so Phase 9 audits rather than discovers. Any finding here is a genuine escape. | Fix in the owning phase's file; do not patch around it in Phase 9. |
| Manual perf/QA is not repeatable by another person | M×M | Every step in this file names the exact view, duration and console expression. `?stats=1` makes the numbers self-serve. | — |
| Docs written before measurement contain invented numbers | L×H | Step 11 gates doc-writing on steps 2–10. Any unmeasured cell is written `not measured`, never estimated. | — |
| `manifest-integrity` fails on Phase 2 data (12 hotspots vs the canon report's 8 confirmed) | **H**×L | Expected: the canon report confirms 8 prop hotspots + 4 room-level Tier-2 entries. The test must accept room-level hotspots (`propId` optional) **or** Phase 2 must assign each Tier-2 hotspot a representative prop. Resolve with the lead before writing the test — see Unresolved. | — |

## Unresolved

1. **Tier-2 hotspots.** The canon report lists 8 prop-anchored hotspots and 4 room-level ones (parents' room, kitchen, living room, roof). `HotspotDef.propId` is required in the type contract. Either Phase 2 anchors each Tier-2 hotspot to a representative prop (`prop-51`, `prop-21`, `prop-16`, `prop-47`) — cheapest, no type change — or `propId` becomes optional and Phase 6 grows a room-anchored pin path. design-guidelines §10 Q1 recommends prop-pins only. **Recommend: anchor to a representative prop, no type change, 12 pins.**
2. **Mid-tier mobile device.** Which physical device is the ≥ 30 fps target measured on? Needs to be named before this phase can pass.
