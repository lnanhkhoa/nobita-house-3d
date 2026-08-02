---
phase: 8
title: "Editor Mode"
status: pending
priority: P2
dependencies: [4]
effort: "8h"
---

# Phase 8: Editor Mode

## Overview

A dev-only prop placement tool at `?edit=1`: gizmo drag, snap, searchable prop list, numeric readout, bounded undo, and an `EXPORT layout.json` that the production loader reads back **verbatim**. Reached only through a dynamic `import()`, so no editor byte is statically reachable from `main.ts`. Deliberately hostile styling (dark, mono, square, motionless) so it can never be mistaken for production.

## Requirements

| # | Requirement |
|---|---|
| R8.1 | `editor/` is loaded only via `await import()` behind the `?edit=1` check; absent from the prod entry chunk graph. |
| R8.2 | `TransformControls` gizmo: translate (XYZ), rotate (**Y only**), scale (**uniform**) — matching `LayoutEntry`'s single `rotationY` + scalar `scale`. |
| R8.3 | Grid snap toggle: `off / 0.05 / 0.1 / 0.25` m, plus 15° rotation snap. |
| R8.4 | Prop list: all placeable props (`PLACEABLE_PROPS.length`, 54) grouped by room, search by id or name, click to select, "unplaced only" filter. |
| R8.5 | Selected-prop numeric readout, editable, `tabular-nums`, 3 decimals. |
| R8.6 | Undo, bounded stack depth **50**, `Cmd/Ctrl+Z`. No redo — cut as YAGNI, nothing exercises it beyond the keybinding (`plan.md` red-team rulings). |
| R8.7 | Export produces exactly `LayoutEntry[]`; `public/layout.json` round-trips with bit-identical values. |
| R8.8 | Camera/orbit stays usable while the gizmo is active — arbitration is explicit, not accidental. |
| R8.9 | Dev palette per design-guidelines §5.6, gated on `<html data-edit>`, zero animation. |

## Requirements deliberately **not** built

- Editor is **desktop/mouse only**. TransformControls needs hover to pre-resolve the gizmo axis; on touch there is no hover, so the capture-phase arbitration in R8.8 cannot decide before camera-controls claims the pointer. A phone cannot do sub-centimetre placement anyway. `(pointer: coarse)` shows a `POINTER REQUIRED — USE A MOUSE` strip and the gizmo is not attached. This is a dev tool, not a product surface.
- No multi-select, no copy/paste, no prefab grouping, no in-browser save-to-disk. Export → download → move the file. YAGNI.

## Architecture

### Entry & code splitting

`main.ts` (Phase 1) already contains the single call site:

```ts
if (new URLSearchParams(location.search).get('edit') === '1') {
  const { startEditor } = await import('./editor/editor-mode');   // the ONLY reference to editor/
  startEditor(ctx);          // ctx = { scene, camera, renderer, controls, propRegistry, appState }
}
```

Rules that keep R8.1 true and are checkable:
- No file outside `editor/` may `import` from `editor/` — enforced by Phase 9's manifest-walk script (`scripts/assert-prod-split.mjs`), which fails the build if any `editor/` path appears in `main.ts`'s *static* import closure. This project uses Biome, not ESLint (M7 — the original spec asked for an `eslint.config.js` rule, which does not exist here); a lint-time import-boundary rule for one directory isn't worth adding when the manifest walk is a stronger, build-time guarantee that also catches transitive imports a lint pattern could miss.
- `lil-gui`, `stats.js` and `TransformControls` are imported **only** inside `editor/`. `lil-gui` and `stats.js` are `devDependencies`; a static import from prod code would break `npm ci --omit=dev`.
- `editor/editor.css` is imported from `editor-mode.ts` so Vite emits it in the async chunk.
- Editor tunables live in `editor/editor-config.ts`, **not** `src/config.ts` — this removes the only file that Phases 6 and 8 would otherwise both edit while running in parallel.

### Input arbitration (the real conflict)

Both `TransformControls` and `camera-controls` listen for `pointerdown` on `renderer.domElement`. The usual `dragging-changed → controls.enabled = false` pattern fires one event **too late**: the pointerdown that starts a gizmo drag has already started a camera orbit, so the first frame of every drag also rotates the camera.

Fix — a capture-phase gate on the same element. Capture listeners run before the bubble-phase listeners camera-controls registers:

```ts
const gate = (e: PointerEvent) => {
  // TransformControls sets `.axis` during its own pointermove hover pass
  cameraControls.enabled = gizmo.axis === null;
};
dom.addEventListener('pointerdown', gate, /* capture */ true);
gizmo.addEventListener('dragging-changed', (e) => { cameraControls.enabled = !e.value; });
```

Net effect: pointer over a gizmo handle ⇒ camera disabled before either library sees the event; pointer anywhere else ⇒ camera orbits normally, gizmo untouched. `dragging-changed` restores control on release and covers the case where a drag ends outside the canvas.

`three` r185 note: `TransformControls` is no longer an `Object3D`; add its helper — `scene.add(gizmo.getHelper())`, and `scene.remove(gizmo.getHelper()); gizmo.dispose()` on teardown. **Verify in step 1** — if `getHelper` is absent on the installed r185.1, fall back to `scene.add(gizmo)`.

### Constraint enforcement (`LayoutEntry` fidelity)

`LayoutEntry` has one `rotationY` and one scalar `scale`, so the gizmo must not be able to author anything else:

```ts
gizmo.addEventListener('objectChange', () => {
  const o = gizmo.object!;
  if (mode === 'rotate') { o.rotation.x = 0; o.rotation.z = 0; }
  if (mode === 'scale')  { o.scale.setScalar(o.scale.x); }
});
// rotate mode: gizmo.showX = gizmo.showZ = false; gizmo.showY = true
```
Without this, a user can author a rotation the exporter silently discards — the round-trip test would pass while the scene visibly changes on reload. Named because it is a *silent* failure.

### Undo

No redo (cut as YAGNI — nothing exercises it beyond the keybinding; add back only if placement sessions demonstrate a real need):

```ts
interface Snapshot { propId: string; before: LayoutEntry; after: LayoutEntry }
const undo: Snapshot[] = [];   // push on commit, shift() when length > 50
```
A *commit* is: `dragging-changed → false`, a numeric input `change`, a snap-value change that moves the object, or a "place unplaced prop" action. Continuous drag frames are **not** committed — one drag = one undo step. Depth 50 chosen as ~10 minutes of placement work; unbounded would leak across a long session. Once the stack is at depth 50, the oldest commit is `shift()`ed off on the next push — that commit is now permanently unrecoverable, which is why the acceptance criterion below talks about the *last* 50, not "every" prop.

### Export / round-trip

```ts
// editor/layout-export.ts
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;              // kills float noise in git diffs
const norm = (y: number) => r4(((y % TAU) + TAU) % TAU);          // canonical [0, 2π)
export function toEntry(o: THREE.Object3D): LayoutEntry {
  return { propId: o.userData.propId,
           instance: o.userData.instanceKey ?? 0,                // B2 — see below
           position: [r4(o.position.x), r4(o.position.y), r4(o.position.z)],
           rotationY: norm(o.rotation.y),
           scale: r4(o.scale.x) };
}
export function exportLayout(placed: THREE.Object3D[]): string {
  return JSON.stringify(
    placed.map(toEntry).sort((a, b) => a.propId === b.propId ? a.instance - b.instance : a.propId.localeCompare(b.propId)),
    null, 2) + '\n';
}
```

**B2 (blocker, red-team) — the exporter must carry `instance`.** Phase 4 keys prop instances `${propId}#${index}` and resolves `${propId}#${instance ?? 0}` on load (`layout-loader.ts`). The original `toEntry` returned `{propId, position, rotationY, scale}` with no `instance`, and `exportLayout` sorted by `propId` alone — so all instances of a `count > 1` prop exported as separate rows that were indistinguishable except by array position, and the loader's `${propId}#${instance ?? 0}` lookup collapsed every one of them onto index `0`: silent data loss on reload for every prop with `count > 1` (prop-17 ×4, prop-26 ×3, prop-42 ×2, prop-43 ×4 — 13 instances total). `instance` is an additive optional field on `LayoutEntry` (`plan.md` module contract) precisely for this; the fix is to actually populate and sort by it, above.

Preconditions the exporter asserts at runtime (throw, do not warn):
- Every placed prop's parent is the flat `propsGroup` at the origin with identity transform, so `object.position` **is** the world position. If Phase 4 ever nests props, export silently writes local coords into a world-coords file.
- `o.userData.propId` exists and matches a `PropDef`.
- `o.userData.instanceKey` is a non-negative integer, `< (prop.count ?? 1)`, and unique among placed objects sharing that `propId` — this is exactly the invariant B2 breaks if it silently defaults to `0` for everything.
- `scale.x === scale.y === scale.z` (guaranteed by the gizmo constraint, asserted anyway).

Round-trip fidelity test (Vitest, no GL) — the fixture is the point of the test, not an afterthought: generate one `LayoutEntry` per **placed object**, derived from every `PLACEABLE_PROPS` entry's `count` (63 objects total — 54 props, 13 of them multi-instance: prop-17 ×4, prop-26 ×3, prop-42 ×2, prop-43 ×4), with each instance of the *same* `propId` given both a distinct `instance` index **and** a distinct position, so instance 0 and instance 1 of prop-17 are never at the same spot → `applyEntry(obj, e)` (the *production* loader from Phase 4, imported directly, which resolves each `Object3D` by `${propId}#${instance ?? 0}`) → `toEntry(obj)`. Assert **both**: (a) `placed.length === entries.length` (63) — a naive re-implementation that de-duplicated by `propId` would silently drop rows, and this catches it — and (b) every output entry, resolved by its own `propId#instance` key (never by array position or by `propId` alone), `toEqual`s the input entry for *that exact instance*. This second assertion is what B2 needs: the original spec generated only **one** entry per `propId` (65 total, one per `PropDef`), so no two entries ever shared a `propId` and the "four rows collapse onto `#0`" failure mode had no way to occur inside the test — the bug only manifests when `toEntry` must disambiguate *multiple* objects sharing a `propId`, which is exactly what this fixture forces by construction. Plus a normalisation test: `toEntry` on an object with `rotation.y = -0.5` yields `≈ 5.7832`, and a second round-trip is idempotent.

### UI

Right column 300 px, markup ported from `docs/wireframe/desktop.html` lines 452–495. `document.documentElement.dataset.edit = ''` gates every rule in `editor.css`. Prod chrome is hidden (`#ui-root [data-prod-chrome]{display:none}`) except `#pin-layer`, which stays as a visual reference. `lil-gui` keeps its own root at z 1001 for lighting; ours stops at 1000 by design.

## Related Code Files

**Create**
- `src/editor/editor-mode.ts` — `startEditor(ctx)`, teardown, hazard strip, `data-edit`, coarse-pointer bail-out.
- `src/editor/transform-gizmo.ts` — TransformControls wiring, mode switching, snap, arbitration gate, constraint enforcement.
- `src/editor/prop-list.ts` — search, grouping, unplaced filter, selection, numeric readout.
- `src/editor/layout-export.ts` — `toEntry`, `exportLayout`, download, undo stack (no redo — cut as YAGNI).
- `src/editor/editor-config.ts` — `{ snapSteps: [0, 0.05, 0.1, 0.25], rotationSnapDeg: 15, undoDepth: 50, defaultSnap: 0.05 }`.
- `src/editor/editor.css` — dev palette, gated on `html[data-edit]`.
- `src/editor/layout-roundtrip.test.ts`

**Modify**
- `src/main.ts` (Phase 1) — the `?edit=1` block must already exist as a stub; Phase 8 only fills the import target. If Phase 1 did not ship it, Phase 8 adds it and is the **only** phase to edit `main.ts` after Phase 1.

**Read only**
- `src/world/layout-loader.ts`, `prop-registry.ts`, `src/data/{types,props,rooms}.ts`, `docs/design-guidelines.md` §5.6, `docs/wireframe/desktop.html`.

## Implementation Steps

1. **Verify two API facts first** (15 min): (a) does `TransformControls` in `three@0.185.1` expose `getHelper()`; (b) does a capture-phase `pointerdown` listener on `renderer.domElement` fire before camera-controls' handler. Both are load-bearing; both are one console log. Record the answers in the phase report.
2. `editor-mode.ts`: bail on `matchMedia('(pointer: coarse)').matches` with the strip. Otherwise set `data-edit`, import `editor.css`, mount hazard strip + 3 px inset ring + the 300 px column, hide prod chrome, return a `dispose()`.
3. `transform-gizmo.ts`: construct, `scene.add(gizmo.getHelper())`, wire the capture gate and `dragging-changed`, mode buttons (`translate|rotate|scale`), axis visibility per mode, `objectChange` constraint clamp.
4. Snap: `setTranslationSnap(step || null)`, `setRotationSnap(degToRad(15))`, `setScaleSnap(0.05)`. `off` passes `null`, not `0`.
5. `prop-list.ts`: render all `PLACEABLE_PROPS` (54 — excludes the 11 `builtBy:'shell'` rows, which have no `PropInstance` and cannot be selected) grouped by `roomId` (room order, upstairs-first, matching the rail). Search filters on `id + ' ' + name` lowercased substring. "Unplaced only" filter = props with no entry in the loaded layout.
6. Selecting an **unplaced** prop places it at the current camera target with `rotationY: 0, scale: 1`, marks `userData.placed = true`, and pushes an undo commit — otherwise it is invisible and un-draggable.
7. Numeric readout: 9 inputs bound to the selection, 3 decimals, `tabular-nums`. `change` writes back through the same commit path as a drag (one code path for undo). Rotation shown in **degrees**, stored in radians — label the column `ROT°` so nobody mis-reads it.
8. Undo per Architecture — `Cmd/Ctrl+Z` only, no redo (cut as YAGNI). Keyboard handler on `window`, `preventDefault`, ignored while an `<input>` has focus.
9. `layout-export.ts`: `toEntry` / `exportLayout` + the runtime assertions. Download via `Blob` + `URL.createObjectURL` + `<a download="layout.json">`; revoke the URL.
10. Write `layout-roundtrip.test.ts` **before** wiring the export button. It imports the production `applyEntry` from `world/layout-loader.ts` — if that is not exported as a pure function, ask Phase 4 to expose it rather than duplicating the logic here (duplication is exactly how round-trip fidelity rots).
11. `editor.css` from wireframe lines 205–239, all rules under `html[data-edit]`. `transition:none !important` inside `.editor`.
12. `lil-gui` panel for lighting + `showProxies` + `grid`, positioned left of the editor column.
13. Manual loop check: place `prop-12` (kotatsu) in `gf-living`, export, copy to `public/layout.json`, reload **without** `?edit=1`, confirm identical position.

## Success Criteria

- [ ] `npx vitest run src/editor/layout-roundtrip.test.ts` passes: the 63-object fixture (all 54 placeable props, including all four `count > 1` props with a distinct `instance` index *and* a distinct position per instance) survives `applyEntry → toEntry` with **both** `placed.length === entries.length` (63) and every output entry, resolved by its own `propId#instance` key, matching the input entry for that exact instance — see B2 in Architecture for why a `count === 1`-only fixture cannot catch a dropped `instance` field. `rotationY = -0.5` normalises to `5.7832` and is idempotent on a second pass.
- [ ] `npm run build && node -e "const m=require('./dist/.vite/manifest.json'); const seen=new Set(); (function w(k){if(seen.has(k))return; seen.add(k); (m[k].imports||[]).forEach(w)})('src/main.ts'); console.log([...seen].filter(k=>k.includes('editor')))"` prints `[]`.
- [ ] `grep -c 'EDIT MODE' dist/assets/index-*.js` returns `0`; the string appears in exactly one non-entry chunk.
- [ ] `?edit=1`: dragging a gizmo arrow moves **only** the prop — the camera azimuth logged before and after the drag is identical to 4 dp.
- [ ] `?edit=1`: dragging anywhere off the gizmo orbits normally; the selected prop's transform is unchanged.
- [ ] Rotate mode shows only the Y ring; after a rotate, `obj.rotation.x === 0 && obj.rotation.z === 0`. Scale mode: `obj.scale.x === obj.scale.y === obj.scale.z`.
- [ ] Snap `0.25`: every exported `position[0]` and `position[2]` is a multiple of `0.25` (`node -e` over the exported JSON).
- [ ] 60 consecutive drags then 60 undos restores the last 50 (the earliest 10 commits were `shift()`ed off the bounded stack and are not recoverable — this is expected, not a bug: M10); `undoStack.length === 0` after the 50 valid undos, and the 51st undo is a no-op.
- [ ] Full manual loop: place a prop → export → `cp ~/Downloads/layout.json public/layout.json` → reload without `?edit=1` → prop is in the same spot (screenshot diff, ±2 px).
- [ ] `?edit=1` on a phone shows the pointer-required strip and no gizmo.
- [ ] Production page (no query string) has `document.documentElement.dataset.edit === undefined` and `document.querySelector('.editor') === null`.

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Editor code reaches the prod chunk graph via a stray import | M×H | The manifest-walk criterion above (mechanical, build-time — no ESLint needed, this project is on Biome per M7) catches it, and `lil-gui`/`stats.js` being `devDependencies` means a static prod import fails `npm ci --omit=dev` independently. | Move the offending helper into `utils/`. |
| Gizmo drag also orbits the camera (arbitration race) | **H×M** | Capture-phase gate, verified by the "azimuth identical to 4 dp" criterion rather than by feel. | Modal fallback: a `G` key toggles "gizmo mode" that hard-disables camera input while active. |
| Export writes local coords because Phase 4 nests props under a room group | M×**H** | Exporter asserts the parent chain is identity at runtime and throws. Silent corruption is the failure to prevent. | Switch `toEntry` to `getWorldPosition`/`getWorldQuaternion` decomposition. |
| `rotationY` normalisation makes round-trip non-idempotent | M×M | Canonicalise in `toEntry`; test asserts idempotence on the second pass, not just the first. | Store raw radians and drop normalisation. |
| `TransformControls` API drift in r185 (`getHelper`, `dispose`) | M×M | Step 1 verifies before any wiring. | `scene.add(gizmo)` legacy path. |
| Duplicated apply logic between loader and editor lets prod and editor diverge | M×H | Editor imports the production `applyEntry`; the round-trip test uses the production function, not a copy. | — |
| Undo captures a continuous drag as 60 steps | L×L | Commit on `dragging-changed → false` only. | — |
