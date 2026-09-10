# Tech Stack — nobita-house-3d

Rewritten 2026-09-10 for the exterior-diorama direction. Supersedes the 2026-08-02 dollhouse-interior stack; decision history lives in `plans/260910-1419-nobita-house-exterior-diorama/`.

## Product shape

Single-page web diorama: orbit Nobita's house from the street, five characters on the sidewalk with procedural idle motion, click a character → camera fly + info card. Exterior only, English UI, local dev only.

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
  data/                  characters (ids, heights, bios, spawn), scene layout (metres)
  scene/                 house, environment, foliage, character, lighting, camera-rig
  scene/model-or-proxy   GLB when it exists on the server, placeholder otherwise
  scene/use-character-motion  procedural idle: breath bob+squash, sway, hover lift, select hop
  state/store.ts         zustand store + model preflight
  ui/                    loading veil, info card, view controls, roster, credits
scripts/
  gen-ref-images.mjs     Gemini image generation (Flash 1K, 3 views; Pro/2K behind flags)
  recolor-character-texture.py  per-character HSV recolour rules
  build-assets.mjs       dedup → flatten+join (non-characters) → weld → resize → meshopt
  blender/               env_build.py · house_build.py · prep_character.py · export_glb.py
```

Conventions that bite: glTF is +Y up with the street at +Z; Blender builders either construct facing −Y (house) or flip Y as the **last** step (environment — anything added after the flip exports mirrored). `box()`-style helpers bake translation into the mesh, so rotations must happen in bmesh, not on the object.

## Measured performance (M4, headless Chromium, 2026-09-10)

| Metric | Value |
|---|---|
| FPS | 60 |
| Draw calls | 76 |
| Triangles | 511k |
| Textures / geometries | 18 / 54 |
| `public/models` payload | 16 MB |

The plan's 300k-triangle target is exceeded (five 40–50k characters plus an 82k house); at 60 FPS desktop this is not acted on. First lever if mobile suffers: character LODs, then 1024→512 textures.

## Run

```sh
bun install
bun run dev        # http://localhost:5173
bun run lint && bun run typecheck && bun run test && bun run build
```

## Attribution

Fan project. Doraemon © Fujiko Pro / Shogakukan / TV Asahi. Personal / portfolio use only.
