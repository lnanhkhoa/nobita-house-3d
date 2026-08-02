---
phase: 4
title: "Asset Pipeline & Loader"
status: pending
priority: P1
dependencies: [2]
effort: "8h"
---

# Phase 4: Asset Pipeline & Loader

## Overview

Two halves that meet at one JSON file.

**Offline:** `scripts/build-assets.mjs` optimises raw Rodin GLBs and emits `public/models/manifest.json`.
**Runtime:** `world/prop-registry.ts` reads that manifest and, per `PropDef`, either loads the real GLB or builds a palette proxy box. `world/layout-loader.ts` positions everything.

The whole point is that **day 1 renders 63 proxy objects and adding one `.glb` upgrades exactly one prop with zero code change.**

## Requirements

| # | Requirement | Verified by |
|---|---|---|
| R1 | `npm run assets:build` is idempotent; unchanged inputs are skipped | SC-2 |
| R2 | Per-asset before/after bytes + triangles printed | SC-1 |
| R3 | Every placeable prop renders — real or proxy — with zero 404s | SC-4 |
| R4 | `AssetMeta` correction applied (Rodin does not centre pivots) | SC-6 |
| R5 | bbox sanity check vs `PropDef.size`, loud warn at > 2× | SC-7 |
| R6 | Unplaced props auto-placed inside their room, deterministically | SC-5 |
| R7 | Loading progress drives `appState.loading` | SC-8 |

## Architecture

### The manifest is the seam

A browser cannot test for `public/models/<id>.glb` without a HEAD request per prop (54 requests, 54 red 404s in the console on a fresh clone). So the build script writes the index:

```jsonc
// public/models/manifest.json — generated, committed
{ "version": 1,
  "assets": {
    "prop-01": { "bytes": 41822, "tris": 1180, "texBytes": 18300, "srcHash": "9f2c…" }
  } }
```

`texBytes` folds in what would otherwise have been a separate `scripts/texture-budget.mjs` walker (cut as YAGNI — `plan.md` §Red-team rulings): `build-assets.mjs` already opens every GLB to count triangles, so summing the byte length of every `images[]`/`bufferViews[]` entry referenced by a texture is the same parse pass, not a second one. `resize --width 1024 --height 1024` in the pipeline already bounds the worst case; `texBytes` is only for the printed report and manifest, not a gate.

Runtime: `fetch('models/manifest.json')` once → `Record<propId, AssetInfo>`. Missing file / bad JSON ⇒ `{}` ⇒ all proxies, `console.info` (never `error` — an assetless clone is a supported state). This is also what makes `loading.total` knowable before any GLB is fetched.

### Verified `@gltf-transform/cli@4.4.2` facts (checked against the published bundle, 2026-08-02)

| Command | Flags actually present | Note |
|---|---|---|
| `weld` | **none** | v4 welds bitwise-exactly; the `--tolerance` in older docs is gone. `simplify` *requires* a welded input. |
| `simplify` | `--ratio <0-1>` `--error <frac>` `--lock-border <bool>` | ratio = fraction of vertices **kept** |
| `resize` | `--width <px>` `--height <px>` `--filter` | "Maximum width/height" — upscales nothing |
| `meshopt` | `--level medium\|high` (default `high`) + `--quantize-*` | `medium` chosen: `high` quantises normals harder, which shows on flat-shaded facets |
| `inspect` | `--format pretty\|csv\|md` (default `pretty`) | **no JSON output** |

`inspect` having no JSON mode kills the obvious stats path. Rather than parse CSV, the script reads triangle **and texture** stats straight out of the GLB: parse the 12-byte header, read the JSON chunk, sum `Math.floor(accessor.count / 3)` over `meshes[].primitives[].indices` (fall back to `POSITION` count when non-indexed) for `tris`, and sum `bufferViews[i].byteLength` for every `bufferView` referenced by `images[].bufferView` for `texBytes`. One parse, two numbers. ~40 lines, no dependency, exact, and still correct after meshopt compression because `accessor.count` and `bufferViews` both survive in the JSON chunk.

### Pipeline

```
assets/raw/<id>.glb                      (gitignored, human-downloaded)
  ├ weld                                  → $TMP/1.glb
  ├ simplify --ratio 0.5 --error 0.001    → $TMP/2.glb
  ├ resize --width 1024 --height 1024     → $TMP/3.glb
  └ meshopt --level medium                → public/models/<id>.glb   (committed)
                                          + manifest entry
```

Skip rule: `sha256(raw file)` compared to `manifest.assets[id].srcHash`. Match **and** output exists ⇒ skip. `--force` overrides. Cache lives in the manifest itself — one artifact, no second cache file to desync.

### `prop-registry.ts`

```ts
export interface PropInstance {
  def: PropDef;
  index: number;              // 0..count-1
  key: string;                // `${def.id}#${index}`  ← layout + editor identity
  object: THREE.Group;        // STABLE wrapper; child swaps proxy ↔ GLB
  isProxy: boolean;
}
export async function buildPropRegistry(
  props: readonly PropDef[], onProgress: (loaded: number, total: number) => void,
): Promise<Map<string, PropInstance>>;   // keyed by PropInstance.key
```

The wrapper `Group` is the stable identity for layout transforms, raycasting (Phase 6) and the editor gizmo (Phase 8). `userData = { kind: 'prop', propId, instanceKey, roomId, hotspotId }`. **Layout transforms are applied to the wrapper; normalisation transforms are applied to the child.** Keeping those two on separate objects is what makes an asset swap a no-op for the layout file.

Skips `def.builtBy === 'shell'` entirely. Iterates `def.count ?? 1`.

### GLB normalisation order — exact, because order changes the result

1. `gltf.scene` → child of a fresh `Group`.
2. Apply `asset.rotation` (radians, XYZ) to the child.
3. `updateMatrixWorld(true)`; `box = new Box3().setFromObject(child)`.
4. Apply `asset.scale` (default 1) to the child; multiply `box` by the same scalar.
5. **Recentre:** translate the child by `(-cx, -box.min.y, -cz)` — X/Z centred, Y **floored**. Feet on the ground beats centre-of-mass for furniture, and it means `LayoutEntry.position.y` is almost always the room floor height.
6. Apply `asset.offset` last (the human's manual nudge, in final units).
7. **Sanity:** `r = max over axes of max(actual/expected, expected/actual)` vs `def.size`. `r > 2` ⇒
   `console.warn('[asset] prop-12 bbox 2.4×0.9×1.9 vs expected 1.0×0.4×0.8 (2.4x) — set asset.scale ≈ 0.42')`.
   Warn only, never throw: a wrong-scale prop must still be visible so it can be fixed.
8. `asset.paletteOverride` set ⇒ replace every material with `paletteMaterial(key)`. Optional escape hatch for the "style drift across 65 assets" risk in `plan.md`; ~8 lines.
9. `traverse`: `castShadow = receiveShadow = true`, `frustumCulled = true`.

### Proxy boxes

`BoxGeometry(...def.size)` translated so `min.y = 0` (same convention as a normalised GLB — a swap must not move the prop). Material from `world/materials.ts` (Phase 3), colour by a small `propId → PaletteKey` map with a `woodLight` default. Shared materials ⇒ ≤ 13 material instances for all 63 proxies.

> **Deviation from brief: no 3D text labels on proxies in prod.** 63 label sprites = 63 draw calls + a font atlas, for a debug affordance. Instead: labels are drawn by `editor/prop-list.ts` in Phase 8 (`?edit=1`), where the DOM list already names every prop and selecting a row highlights its box. Zero prod cost, better readability. If a label is wanted while orbiting outside edit mode, that is a Phase 7 pin, not a sprite.

### `layout-loader.ts`

```ts
export interface LayoutFile { version: 1; entries: LayoutEntry[]; }   // LayoutEntry gains `instance?: number`
export async function applyLayout(registry: Map<string, PropInstance>): Promise<void>;
```

`fetch('layout.json')` → for each entry, key = `${propId}#${instance ?? 0}` → set wrapper `position`, `rotation.y`, uniform `scale`. Unknown key ⇒ `console.warn`, skip (a stale layout must not break the app).

**Auto-placement fallback** for any instance with no entry — deterministic so two runs produce identical scenes and an editor diff is meaningful:

```
for each room, take unplaced instances sorted by key (stable)
  cell = max footprint among them, + 0.10 gap
  cols = max(1, floor((room.w - 0.30) / cell.x))
  i-th instance → x = room.x + 0.15 + (i % cols + 0.5) * cell.x
                  z = room.z + 0.15 + (floor(i / cols) + 0.5) * cell.z
                  y = FLOOR_Y[room.floor]
  if the grid overflows the room depth, wrap and log once per room
```

Props land visible, upright, inside their own room — never a heap at the origin. `gf-yard` uses the same code with the lot rect.

## Related Code Files

| Path | Action |
|---|---|
| `scripts/build-assets.mjs` | create (replaces the Phase 1 stub) |
| `src/world/prop-registry.ts` | create |
| `src/world/layout-loader.ts` | create |
| `src/utils/dispose.ts` | create — `disposeObject(root)` used by registry + Phase 3 |
| `src/data/types.ts` | modify — `LayoutEntry.instance?: number` |
| `src/main.ts` | modify — build registry, apply layout, add to scene |
| `public/models/.gitkeep`, `public/layout.json` | create — `{"version":1,"entries":[]}` so the first fetch is a clean 200 |
| `.gitignore` | `assets/raw/` (already) |
| `src/world/layout-loader.test.ts` | create — SC-5 |

## Implementation Steps

1. **`build-assets.mjs`** — `node:fs` + `node:crypto` + `node:child_process.execFileSync`. Resolve the CLI via `node_modules/.bin/gltf-transform` (not bare `gltf-transform`, which relies on PATH). Steps: read existing manifest → glob `assets/raw/*.glb` → per file compute sha256 → skip if unchanged and output exists → run the 4 commands through `fs.mkdtempSync(os.tmpdir())` → write output → record `{bytes, tris, texBytes, srcHash}` → write manifest sorted by key (stable diffs) → print table:
   ```
   prop-01  1.42 MB → 41.8 KB  (-97.1%)   18420 → 1180 tris   17.9 KB tex
   prop-12  skipped (unchanged)
   3 built · 12 skipped · 0 failed · public/models 612 KB (589 KB tex)
   ```
   A non-zero exit from any `gltf-transform` step ⇒ log the asset id + stderr, leave the previous output in place, continue, and exit 1 at the end. One bad download must not block 14 good ones.
2. **`glbStats(path)`** — GLB header parse as described, returns `{ tris, texBytes }`. Unit-test it against a known file once assets exist; until then guard with `try/catch → { tris: null, texBytes: null }`.
3. **`utils/dispose.ts`** — traverse, dispose geometries, skip shared materials (they belong to `world/materials.ts`), dispose textures owned by loaded GLBs.
4. **Loader setup** (module scope, once):
   ```ts
   import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
   import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
   const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setPath('models/');
   ```
   Relative `setPath` (no leading `/`) so `base` changes never break it.
5. **`prop-registry.ts`** — fetch manifest → `total = Σ(count)` over placeable props → for each instance, `manifest.assets[def.id]` present ? `loader.loadAsync(id + '.glb')` : proxy. Real GLBs are loaded **once per `propId`** and `.clone(true)` for instances 2..n — never fetch the same file twice. `onProgress` after each. Failure to load a present asset ⇒ warn + fall back to a proxy (never leave a hole).
6. **`layout-loader.ts`** — as specced; auto-placement in a pure exported function `autoPlace(instances, room)` so it is unit-testable without three.js side effects.
7. **`main.ts`** — `appState.set({loading:{total,loaded:0,done:false}})` → build registry with `onProgress` → `applyLayout` → `appState.set({loading:{…,done:true}})`.
8. **Manual swap test** — drop any Rodin `.glb` into `assets/raw/prop-12.glb`, `npm run assets:build`, reload: only the kotatsu changes.

## Success Criteria

- [ ] **SC-1** `npm run assets:build` on ≥1 raw GLB prints per-asset before/after bytes, triangles, **and texture bytes**, plus a totals line; output GLB is smaller and lower-poly than the input.
- [ ] **SC-2** Running it twice in a row: second run prints `skipped (unchanged)` for every asset, exits 0, and `git status --porcelain public/models` is empty.
- [ ] **SC-3** `node -e "JSON.parse(require('fs').readFileSync('public/models/manifest.json'))"` exits 0; keys are sorted; every key resolves to a `PropDef` id.
- [ ] **SC-4** `npm run dev` with an **empty** `public/models/`: 63 proxy objects in the scene, DevTools Network shows **0** requests with status 404, console has 0 errors.
- [ ] **SC-5** Unit test on `autoPlace`: with zero layout entries, every returned position lies inside its room footprint inset by 0.15 m; running it twice yields byte-identical results (determinism).
- [ ] **SC-6** With one real GLB present: that prop is a `Mesh` tree (not a `BoxGeometry`), its world bbox `min.y` is within 0.01 of its wrapper's `position.y`, and `registry.get('prop-12#0')!.isProxy === false` while all others stay `true`.
- [ ] **SC-7** Feed a deliberately 5×-oversized GLB → exactly one `console.warn` matching `/\[asset\] prop-\d+ bbox .* — set asset\.scale/`.
- [ ] **SC-8** `appState.get().loading` reaches `{total: 63, loaded: 63, done: true}`; `loaded` is monotonically non-decreasing across the run.
- [ ] **SC-9** Deleting `public/layout.json` still boots (auto-placement path), one `console.info`, no error.
- [ ] **SC-10** `npm run typecheck`, `npm run lint`, `npm test` clean.

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| `gltf-transform` CLI flags differ from the bundle inspection | L×M | Flags verified against the published `4.4.2` bundle (table above); the chain lives in one `PIPELINE` array so a spelling fix is one line. Step 0 for the implementer: `npx gltf-transform help simplify`. | edit `PIPELINE` |
| `simplify --ratio 0.5` destroys a low-poly Rodin mesh that was already at 8k faces | **H×M** | `--error 0.001` caps distortion regardless of ratio; Rodin's text-to-3D default is ~18k quads so 50% is safe. Per-asset override: `assets/raw/<id>.json` `{ "simplifyRatio": 0.9 }` read by the script if present. | raise the global ratio; re-run is idempotent |
| Rodin exports arrive uncentred / rotated / mis-scaled | **H×M** | The `AssetMeta` correction layer is mandatory from day 1, not retrofitted (`plan.md` risk). SC-7's warn tells the human the exact `scale` to type. Phase 8's editor shows the corrected transform live. | per-prop `asset` field |
| Manifest and `public/models/` desync (hand-deleted GLB, stale manifest) | M×M | Registry treats a failed `loadAsync` as "proxy + warn", so a desync degrades instead of breaking. `--force` rebuilds from scratch. | `rm manifest.json && npm run assets:build -- --force` |
| Inverted normals / non-manifold Rodin meshes (researcher report §2) | M×M | Out of scope for an automated fix — it needs Blender `Shift+N`. Detect cheaply: after load, if a mesh has `material.side === FrontSide` and looks hollow, the human sees it immediately in the scene. Document the Blender fix in the Phase 9 asset README. | `material.side = DoubleSide` per prop via `paletteOverride` path |
| 63 individual prop meshes sit inside the renegotiated `<120` draw-call budget (35 shell + ~63 props ≈ 98) | L×L | Budget raised to `<120` by the lead (`plan.md` Reconciled contracts #4) — no longer at risk. `InstancedMesh` for repeated small props stays a **documented, unbuilt** Phase 9 escape hatch (preserves per-instance ids so raycast + editor keep working), triggered only if measured frame time misses the fps target, never by a draw-call count. | — |
| `.clone(true)` on a meshopt-decoded GLTF shares geometry but also shares materials that a later `paletteOverride` would mutate globally | M×M | Clone then, if `paletteOverride` is set, assign a fresh shared palette material (not a mutated clone). Never mutate a loaded material in place. | — |
| Loading many GLBs in parallel stalls the first paint on mobile | M×L | Sequential `for await` with `onProgress`; the loading veil (Phase 7) covers it. Batch-parallelism is a Phase 9 tuning knob. | `Promise.all` in chunks of 4 |
| `public/layout.json` committed with editor-mode noise (huge floats) | L×L | Phase 8's exporter rounds to 3 decimals; noted here so both phases agree. | — |
