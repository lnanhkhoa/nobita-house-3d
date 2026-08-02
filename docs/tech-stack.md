# Tech Stack — nobita-house-3d

Locked 2026-08-02. All versions verified against npm registry on that date (not from model memory).

## Product decisions (input to every choice below)

| Decision | Value |
|---|---|
| Scope | Ground floor + 2nd floor (Nobita's room, parents' room, hallway, landing) + yard |
| Interaction | Dollhouse — orbit, toggle roof / 2F / wall cutaway, click hotspot → camera fly + info card |
| Art style | Low-poly stylized, flat/faceted shading, fixed 8-colour palette |
| Asset source | Hyper3D Rodin **web UI, manual** — human generates + downloads GLB |
| Prop placement | **In-app editor mode** (`?edit=1`) → export `layout.json`; prod build reads JSON only |
| Bootstrapping | Auto-generated box proxies for every prop with no GLB yet — app runs from day 1 |
| UI language | English only (no i18n layer); JP kana room subtitles kept as decoration via subsetted Noto Sans JP |
| Hotspot density | All 12+ hotspots kept in data; pins rendered only for currently-visible floor/room |
| Wall cutaway | Single global auto-cutaway (walls facing camera fade). No per-wall control. |
| Deployment | None for now — local `npm run dev` only. `base: '/'`, no CI/CD. |

## Runtime

| Layer | Choice | Version | Why |
|---|---|---|---|
| Build | `vite` | 8.2.0 | Fast HMR, native TS, zero-config static output |
| Language | `typescript` | 7.0.2 | Strict mode; 3D math + many modules make types load-bearing |
| 3D engine | `three` | 0.185.1 | WebGL renderer (see rejection note) |
| Camera | `camera-controls` | 3.1.2 | Damped `setLookAt` promises, solid touch/pointer handling, focal-offset support. Note: planning rejected its `fitToBox` — it preserves the *current* azimuth, which lands the camera inside walls. Room framing uses own pure math instead. |
| Model loading | `GLTFLoader` + `MeshoptDecoder` | (bundled in `three/examples`) | No extra dep |
| UI | Plain DOM + CSS | — | UI is a handful of panels; a framework buys nothing |
| State | Plain TS module + `EventTarget` | — | ~6 pieces of state (active room, roof on, floor filter, selected hotspot, edit mode, loading) |

## Dev-only

| Tool | Version | Use |
|---|---|---|
| `lil-gui` | 0.21.0 | Editor mode panel, lighting tweaks |
| `stats.js` | latest | FPS/ms HUD |
| `TransformControls` | `three/examples` | Drag-place props in `?edit=1` |

## Asset toolchain (offline, not shipped)

| Tool | Version | Use |
|---|---|---|
| `@gltf-transform/cli` | 4.4.2 | `weld → simplify → resize → meshopt` on raw Rodin exports |

Pipeline:
1. Generate in Rodin web UI (text-to-3D preferred — more style-consistent across 65 props than image-to-3D).
2. Download GLB → `assets/raw/<asset-id>.glb` (gitignored).
3. `npm run assets:build` → optimized GLB in `public/models/<asset-id>.glb` (committed).
4. Per-asset metadata (scale, pivot offset, rotation fix, room, hotspot flag) lives in the asset manifest — **Rodin does not centre pivots**, so this correction layer is mandatory, not optional.
5. Place in world via `?edit=1` → export `layout.json`.

## Rendering recipe

- Materials: `MeshStandardMaterial` with `flatShading` for props; `MeshToonMaterial` reserved for character-like assets.
- Lights: hemisphere ambient + directional key (casts shadow) + soft fill + rim. No PCFSoft on every light.
- Shadows: single directional shadow map for the diorama; baked shadow plane under the base.
- Colour: `THREE.ColorManagement` enabled, `outputColorSpace = SRGBColorSpace`, neutral tone mapping (filmic curves mud the flat palette).
- Texture strategy: one shared palette texture / vertex colours where possible — low-poly does not need per-prop maps.

## Performance budget (mobile Safari + Chrome, ~65 props)

| Metric | Target |
|---|---|
| Draw calls | < 120 (revised — see below) |
| Triangles | < 80k |
| Texture memory | < 40 MB |
| FPS | 60 desktop, ≥ 30 mid-tier mobile |
| Initial payload (JS + first models) | < 3 MB gzipped |

## Rejected, with reason

| Rejected | Reason |
|---|---|
| `WebGPURenderer` / TSL | No measurable win at this scene size; adds renderer-migration risk and a thinner ecosystem for the postprocessing/controls used here. WebGL path is fully sufficient. |
| React / react-three-fiber | Scene is imperative and static-ish; a reconciler adds bundle + indirection for no gain. |
| `three-mesh-bvh` | Raycast target set is ~15 hotspot proxies, not a dense mesh. Revisit only if profiling shows raycast cost. |
| `pmndrs/postprocessing` | Flat low-poly style needs no SSAO/bloom stack. Reconsider only if an outline pass is added. |
| Draco compression | Meshopt decodes faster with a much smaller decoder; low-poly meshes compress fine either way. |
| `zustand` / `nanostores` | Six state fields. YAGNI. |

The original `< 50` draw-call target came from a generic best-practices article, not from this scene's composition. Planning measured the real shape: ~32 for the shell (exterior walls must stay individually addressable for cutaway) + ~63 prop objects ≈ 95. Roughly 100 draw calls of trivial low-poly geometry is not a real constraint on a modern mobile GPU, and forcing `BatchedMesh` to hit an arbitrary number would break per-instance raycasting and the layout editor for no measured gain. **Budget renegotiated to `< 120`; triangle count is the meaningful gate.** `BatchedMesh` / `InstancedMesh` remain documented, unbuilt escape hatches triggered by measured frame time.

## Resolved during planning

| Item | Decision |
|---|---|
| Lint/format | **Biome 2.5.6** over ESLint + Prettier. One package vs six; its Rust parser never loads `typescript`, so the Go-native `typescript@7.0.2` cannot break linting. No framework lint plugins needed here, so ESLint's ecosystem advantage buys nothing. |
| Test runner | Vitest, for pure logic only — bounds/framing math, manifest integrity, layout round-trip. No E2E harness; browser behaviour covered by a manual device matrix + keyboard walkthrough. |
| Deployment | Deferred by user decision. Revisit before any public release (needs `base` path + CI). |

## Attribution

Fan project. Doraemon © Fujiko Pro / Shogakukan / TV Asahi. Personal / portfolio use only — commercial use would require a licence.
