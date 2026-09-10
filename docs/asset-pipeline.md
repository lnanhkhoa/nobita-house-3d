# Asset pipeline — Gemini → Hyper3D Rodin → Blender → GLB

Manual steps are marked **(you)**; everything else runs from this repo or through the Blender MCP connection.

## 1. Reference images (Gemini)

```sh
bun run gen:refs -- --subject doraemon      # one subject
bun run gen:refs -- --all                   # every subject, skips existing files
bun run gen:refs -- --subject house --force # regenerate
```

Needs `GEMINI_API_KEY` in `.env`. Default model `gemini-2.5-flash-image` at 1K, three views. Output: `assets/ref/<subject>/{front,left,three-quarter}.png`. The front view is generated first and passed back as a reference so the other angles stay consistent.

For a subject that needs more detail, override per run: `--model gemini-3-pro-image --size 2K`. That combination costs roughly an order of magnitude more per image, so use it deliberately. Add `--views front,left,back,three-quarter` if a back view is genuinely needed; Rodin reconstructs fine from three.

Subjects: `doraemon`, `nobita`, `shizuka`, `jaian`, `suneo`, `house`.

## 2. Image-to-3D on hyper3d.ai **(you)**

Per subject, in the Rodin web UI:

| Setting | Value |
|---|---|
| Mode | Image to 3D, **multi-view**: upload every PNG in `assets/ref/<subject>/`, front first |
| Quality | highest your plan allows |
| Pose / character option | keep the input pose (A-pose). Do **not** let Rodin re-pose or auto-rig; Mixamo does that later |
| Material / texture | PBR or "shaded" with textures on |
| Export | **GLB**, textures embedded |

Save as `assets/raw/<subject>.glb` (gitignored). File names must match the subject ids above.

## 3. Blender cleanup (me, via MCP)

`scripts/blender/prep_character.py` handles one character per run: import (GLB or FBX), pick an LOD rung if the file ships a ladder, decimate to the triangle target otherwise, drop the feet to z = 0 with the pivot centred, face −Y so the glTF export lands at +Z, and scale to the canon height.

| Character | Height | Source triangles | Shipped |
|---|---|---|---|
| Doraemon | 1.29 m | 110k | 40k |
| Nobita | 1.40 m | 350k | 40k |
| Shizuka | 1.38 m | 600k | 40k |
| Gian | 1.57 m | LOD ladder | 50k (LOD2) |
| Suneo | 1.35 m | 600k | 40k |

The yard, wall, gate, street and trees come from `scripts/blender/env_build.py`, which builds them procedurally rather than from a downloaded asset. Both use `scripts/blender/export_glb.py` for export settings.

## 4. Animation

**There is no rigging step.** The Rodin sculpts arrive posed and unskinned (Gian mid-flex, Doraemon holding a dorayaki), which Mixamo's auto-rigger cannot handle, and flattening them to an A-pose would throw away the character in the poses. `src/scene/use-character-motion.ts` animates the static meshes instead: a breathing bob with a matching squash, a slow sway, a lift on hover, and a one-shot hop when the character is selected. Each character gets a phase offset so the group never moves in lockstep, and everything is suppressed under `prefers-reduced-motion`.

To bring skeletal animation back later, export a T-pose FBX from Blender, rig it on mixamo.com, and merge the clips before export. Nothing in the app depends on the meshes staying unskinned.

## 5. Recolouring a texture

Rodin does not always hit the canon palette. `scripts/recolor-gian-texture.py` rewrites Gian's diffuse map from a yellow shirt, magenta stripe and brown trousers to the canon orange, cream and navy, working in HSV so the original shading survives. `prep_character.py` then swaps the base colour image at import time via `DIFFUSE_OVERRIDE`.

Known remaining mismatches, not yet corrected: Shizuka wears a blue skirt instead of red, and Suneo a blue shirt instead of green.

## 6. Optimise

```sh
bun run assets:build   # gltf-transform: weld → simplify guard → resize textures → meshopt
```

The app (`src/scene/model-or-proxy.tsx`) HEAD-checks every model URL at start. Anything missing renders as a placeholder, so partial delivery is fine.

## Where files live

| Path | Contents | Tracked |
|---|---|---|
| `assets/ref/<subject>/` | Gemini reference PNGs | yes |
| `assets/raw/rodin/<subject>/` | Rodin downloads, as delivered | no |
| `assets/raw/final/` | Blender exports, pre-optimisation | no |
| `public/models/` | Optimised GLBs the app loads | yes |
