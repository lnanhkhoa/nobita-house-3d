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

Subjects: `doraemon`, `nobita`, `shizuka`, `jaian`, `suneo`, `house`, `tree`, `hedge`, `sakura`. Plants use a dedicated clay-sculpture style prompt and the Pro model: photoreal foliage reads as noise to image-to-3D and produced wrong objects on Rodin.

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

The yard, wall, gate, street and utility pole come from `scripts/blender/env_build.py`, and the house from `scripts/blender/house_build.py`. Both build procedurally and export through `scripts/blender/export_glb.py`.

Rodin is deliberately **not** used for the house. Image-to-3D reconstructs organic volumes; it rounds off the straight edges, flat wall planes and repeating tile courses that architecture depends on. `house_build.py` produces those directly: a hipped kawara apron and a street-facing gable for the silhouette, every opening cut 30 cm into its wall with a real frame, sill and glass, and a fine band of tile ribs, course lips, rafter tails, gutter brackets and 2-3 cm bevels. It exports at 82k triangles and 0.61 MB after optimisation.

Trees and shrubs are the opposite case and **are** good Rodin candidates. They are not baked into the environment: `src/scene/foliage.tsx` places them per instance from `src/data/scene.ts`, so dropping `public/models/props/tree.glb` and `hedge.glb` in replaces the placeholders with no re-export. Each instance gets a deterministic yaw and a scale jitter so copies do not read as clones.

## 4. Animation

Two layers, both honouring `prefers-reduced-motion`:

- **Procedural idle** (`src/scene/use-character-motion.ts`): breathing bob with a matching squash, slow sway, hover lift. Phase-offset per character.
- **Skeletal welcome bow** (`scripts/blender/rig_welcome.py`, user request 2026-09-10): each shipped GLB carries a vertical bone chain and one `welcome` clip — bow toward the street, hold, rise (48 frames at 24 fps). Vertices are weighted by smooth height bands instead of bone-heat, which is deterministic and exactly sufficient for a bow; it also works with every held prop and fist the sculpts arrived with, where a full Mixamo limb rig would fail. The app plays the clip once per selection and suppresses its procedural hop when the clip exists.

The chain is a per-character profile in the script. Humanoids get four bones (root / spine / chest / head, ~34° cumulative). Doraemon gets two (root / body, 18° at the hips): his head fills the top 55% of his height and any joint inside it kinks the sphere, and the ice-cream cone he holds runs from mouth to shin, so he bows as one rigid block with only the legs blending. The chain's pivot is the bounding-box centre of a thin slab at the first joint — never the vertex centroid, which the dense front-facing arms, face and props drag forward by a quarter metre on Doraemon.

The rig script is idempotent over its own output: re-running it on an already-rigged GLB strips the old armature, vertex groups and stale actions before rebuilding. Export one character with `OBJECTS = ["<id>", "<id>_rig"]` in `export_glb.py`, then `bun run assets:build -- --in <dir-with-only-that-file> --out <tmp>` and copy the result into `public/models/characters/`, so the other characters' binaries stay untouched. Blender 5 note: `action.fcurves` is gone (layered actions); new keyframes default to bezier anyway.

## 5. Recolouring a texture

Rodin does not always hit the canon palette. `scripts/recolor-character-texture.py` holds one rule table per character and rewrites only the measured HSV regions of the diffuse map, keeping the original shading. It reads the texture straight out of the raw GLB, so no manual extraction step exists.

Applied so far: Gian (yellow shirt → orange, magenta stripe → cream, brown trousers → navy), Shizuka (blue skirt → red), Suneo (blue shirt → green, teal shorts → brown). To fix a future model, add a rule entry with gates measured from its hue histogram, run the script, and swap the image in Blender via `DIFFUSE_OVERRIDE` in `prep_character.py`.

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

`build-assets.mjs` runs `flatten` and `join` on non-character models before welding, merging their hundreds of parts into one mesh per material. That took the scene from 304 draw calls to 68 with no visual change.
