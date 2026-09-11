# Tech Stack — nobita-house-3d

Rewritten 2026-09-10 for the exterior-diorama direction. Supersedes the 2026-08-02 dollhouse-interior stack; decision history lives in `plans/260910-1419-nobita-house-exterior-diorama/`.

## Product shape

Single-page web diorama: orbit Nobita's house from a corner of a Japanese suburb, six characters on the sidewalk with procedural idle motion, click a character → camera fly + info card. Exterior only, English UI, local dev only.

The block is a crossroads: a front road along X, a side road along Z past the left wall, seven neighbour lots and a coin parking lot opposite the gate. Nobita's house stays the hero; neighbours sit one rung lower on the detail ladder and fade into the fog.

## Runtime

| Layer | Choice | Version | Why |
|---|---|---|---|
| Package manager / runner | bun | 1.4 | User preference; scripts run with `bun` |
| Build | vite | 8.2 | Fast HMR, zero-config static output |
| Language | typescript | 7.0 | Strict mode |
| UI framework | react + react-dom | 19.2 | Pinned `~19.2` — `@react-three/fiber@9` declares `react >=19 <19.3` |
| 3D | three | 0.186 | WebGL renderer |
| React bridge | @react-three/fiber | 9.7 | Declarative scene graph, per-frame hooks |
| Helpers | @react-three/drei | 10.7 | `CameraControls`, `useGLTF`, `useProgress`, `Sky` |
| State | zustand | 5 | Selected character, model availability, camera reset token |
| Lint/format | Biome | 2.5 | Single tool, no plugin stack |
| Tests | vitest | 4 | Data-integrity tests only |

Known trap: drei `<SoftShadows>` fails to compile against three 0.186 (`vogelDiskSample: function already has a body`) and whites out the whole canvas. Default PCF shadows are used instead.

## Asset pipeline

Gemini reference images → Hyper3D Rodin (manual, user) → Blender via MCP → gltf-transform. The full runbook, including the recolour tooling and the procedural house/environment builders, is `docs/asset-pipeline.md`.

## Scene architecture

```
src/
  app.tsx                Canvas + UI roots; preflights model URLs (HEAD) so missing GLBs
                         render as proxies instead of breaking Suspense
  config.ts              camera limits, model paths
  data/scene.ts          every coordinate in the block, in metres: lot, streets, the seven
                         neighbour lots, parking, planting. `houseTransform` derives a
                         neighbour house's centre, yaw, ridge height and world footprint from
                         its lot; the proxy, the camera colliders, the layout test and
                         `neighbours_build.py` all read it, so they cannot drift apart
  data/characters.ts     ids, heights, bios, spawn positions
  scene/                 house, environment, streets, neighbours, foliage, character,
                         lighting, camera-rig
  scene/environment.tsx  Nobita's lot only — yard, wall, gate
  scene/streets.tsx      every surface outside a lot wall: roads, sidewalks, kerbs, markings,
                         poles
  scene/neighbours.tsx   the other lots, the parking lot, and the always-mounted
                         `camera-colliders` group
  scene/model-or-proxy   GLB when it exists on the server, placeholder otherwise
  scene/use-character-motion  procedural idle: breath bob+squash, sway, hover lift, select hop
  state/store.ts         zustand store + model preflight
  ui/                    loading veil, info card, view controls, roster, credits
scripts/
  gen-ref-images.mjs     Gemini image generation (Flash 1K, 3 views; Pro/2K behind flags)
  recolor-character-texture.py  per-character HSV recolour rules
  build-assets.mjs       dedup → flatten+join (non-characters) → weld → resize → meshopt
  blender/               env_helpers.py (shared) · env_build.py · streets_build.py ·
                         neighbours_build.py · house_build.py · plants_build.py ·
                         prep_character.py · export_glb.py
```

Conventions that bite:

- glTF is +Y up with the street at +Z. Blender is Z-up and its exporter maps Blender +Y to glTF −Z.
- `streets_build.py` and `neighbours_build.py` convert with `P(x, z, y) → (x, −z, y)` at the point of use. `house_build.py` constructs facing −Y. `env_build.py` is the **only** script that flips Y as its last step — anything added after that loop exports mirrored.
- `add_box()`-style helpers bake translation into the mesh, so rotating an object afterwards spins it about its own origin, not the assembly's. `neighbours_build.py` sidesteps this: houses are laid out in a local frame and `place()` rotates the frame before translating. Its yaws are quarter turns only, so the rotation is an axis swap that never has to touch a mesh.
- Rotating +Z by **+π/2** about +Y lands on +X (three.js is right-handed). Both `houseTransform` and `neighbours_build.py` use +π/2 for a `+x`-facing house.
- Exactly one surface owns every square metre of ground. `environment.glb` stops at Nobita's lot wall, `streets.glb` owns the public realm, `neighbours.glb` owns the other lots. Street slabs are split where a crossing road interrupts them rather than overlapping, so nothing z-fights.

Camera collision: `Neighbours` always renders a `camera-colliders` group of one invisible box per neighbour house and publishes it to the store; `CameraRig` assigns it to `CameraControls.colliderMeshes`. three.js raycasts invisible meshes, and R3F only dispatches pointer events to objects carrying handlers, so the boxes stop the camera without stealing the ground-click deselect.

## Measured performance (M4, Chrome headless over CDP, real Metal GPU, 2026-09-11)

| Metric | Single lot (2026-09-10) | Whole block | Budget |
|---|---|---|---|
| FPS, all four azimuths | 60 | 60 | 60 |
| Draw calls, default view | 76 | 195 | ≤ 110 |
| Draw calls, worst azimuth | — | 237 | ≤ 110 |
| Triangles, default view | 511k | 763k | ≤ 650k |
| `public/models` payload | 16 MB | 7.9 MB | ≤ 18 MB |

Draw calls and triangles are over budget and knowingly not acted on further; full numbers,
per-GLB costs and the ranked options are in
`plans/reports/perf-260911-0245-neighbourhood.md`.

The cause is `Foliage`, which clones a whole GLB per instance: a tree is 4 draw calls, a shrub
3, and the block has 34 of them — 113 of the 195 calls. The new street and house geometry is
15k triangles and 31 primitives, under 4% of the frame. Two levers were taken: planting
outside Nobita's lot no longer casts shadows (`inHeroLot`), and the two least visible
neighbour trees were dropped. First lever if this ever needs to go further: merge the
duplicate bark materials in the prop GLBs (~36 calls, no visual change), then draw the foliage
with `InstancedMesh`. Character LODs and 1024→512 textures remain the mobile levers.

## Run

```sh
bun install
bun run dev        # http://localhost:5173
bun run lint && bun run typecheck && bun run test && bun run build
```

## Attribution

Fan project. Doraemon © Fujiko Pro / Shogakukan / TV Asahi. Personal / portfolio use only.
