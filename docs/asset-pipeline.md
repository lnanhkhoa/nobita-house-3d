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

Everything outdoors is procedural, split so exactly one script owns every surface:

| Script | Owns | Exports |
|---|---|---|
| `house_build.py` | Nobita's house | `house.glb` |
| `env_build.py` | Nobita's lot: yard, block wall, gate, shed, path, yard props | `environment.glb` |
| `streets_build.py` | the public realm: both carriageways, four sidewalk strips, kerbs and their corner arcs, markings, crossings, drains, five utility poles and their wires | `streets.glb` |
| `neighbours_build.py` | the seven neighbour lots and the coin parking lot | `neighbours.glb` |
| `plants_build.py` | trees, hedge, cherry blossom | `props/*.glb` |

`env_helpers.py` holds what they share — the colour table, `material`, `fresh_collection`, `add_box`/`add_cylinder`/`add_sphere`/`add_wire`/`add_gable_prism`/`add_quarter_ring`, and `hex_rgba` for turning a `scene.ts` tint into a linear colour. It loads `texture_lib.py` itself, so a builder only ever execs one file:

```python
import os
SCRIPTS_DIR = f"{ROOT_DIR}/scripts/blender"
exec(open(os.path.join(SCRIPTS_DIR, "env_helpers.py")).read())
```

**Coordinates.** glTF is +Y up with the street at +Z; Blender is Z-up and its exporter maps Blender +Y to glTF −Z. `streets_build.py` and `neighbours_build.py` convert at the point of use with `P(x, z, y) → (x, −z, y)` and never flip anything afterwards. `env_build.py` predates that and negates every object's Y as the **last** thing it does — it is the only script that still works this way, and anything added after that loop exports mirrored. `house_build.py` simply constructs facing −Y.

**Neighbour houses.** Three variants (`hip2`, `gable2`, `gable1`) whose dimensions, roof pitch and setback are the same numbers `houseVariants` and `houseTransform` hold in `src/data/scene.ts`; the Python copy names its TypeScript source in a comment block. A house is laid out in its own frame — local +X along the street, local +Z pointing at it — and `place()` rotates that frame about the house centre before translating, because `add_box` bakes translation into the mesh and rotating the object afterwards would spin it about its own origin. Yaws are quarter turns only, so the rotation is an axis swap (`swapped()`) that never touches a mesh. Rotating +Z by **+π/2** about +Y lands on +X.

Roofs are one six-vertex build for all three variants: four eave corners plus a ridge line. A ridge as long as the roof degenerates the two hip triangles into vertical gable ends, so `hip2` and both gables come out of the same function — and out of the matching `roofGeometry` in `src/scene/neighbours.tsx`, which is why the proxy and the GLB share a silhouette.

Anything that has to lie flat on a roof slope goes through `slope_rotation()`, never a hand-written euler. A local axis lands on a different Blender axis *and* a different direction per yaw (local +Z is Blender −Y at yaw 0 but +Y at yaw π), and a rotation about Blender X puts +Z on the opposite side of the horizon from a rotation about Blender Y. Folding in only the axis mirrors every course lip on the yaw-0 and quarter-turn lots.

**Junction corners.** `streets_build.py` cuts a kerb-radius square out of each of the four pavement corners, then fills it with `add_quarter_disc` (pavement) inside `add_quarter_ring` (kerb) — both at the same radius, so they meet with no seam — and an asphalt slab underneath for the piece the curve gives back to the road. Rounding only the kerb band leaves a square nub of pavement standing out past the curve.

Both build procedurally and export through `scripts/blender/export_glb.py`, which takes `COLLECTION` (`ENV`, `STREETS`, `NEIGHBOURS`) or an explicit `OBJECTS` list.

Rodin is deliberately **not** used for the house. Image-to-3D reconstructs organic volumes; it rounds off the straight edges, flat wall planes and repeating tile courses that architecture depends on. `house_build.py` produces those directly: a hipped kawara apron and a street-facing gable for the silhouette, every opening cut 30 cm into its wall with a real frame, sill and glass, and a fine band of tile ribs, course lips, rafter tails, gutter brackets and 2-3 cm bevels. It exports at 82k triangles and 0.61 MB after optimisation.

Trees, hedge and the cherry blossom are procedural too (`scripts/blender/plants_build.py`, user decision 2026-09-10 after Rodin returned wrong objects for foliage). Canopies are metaballs — big lobes plus sunken bumps — converted to mesh so touching masses fuse with clay-like transitions, decimated to 3–8k triangles each; trunks are swept tapered tubes with a root flare. `src/scene/foliage.tsx` places instances from `src/data/scene.ts` with deterministic yaw and scale jitter, measuring model height in **world** space (meshopt quantisation moves the real scale onto the node, so geometry-space bounds are wrong).

## 4. Animation

Two layers, both honouring `prefers-reduced-motion`:

- **Procedural idle** (`src/scene/use-character-motion.ts`): breathing bob with a matching squash, slow sway, hover lift. Phase-offset per character.
- **Skeletal welcome bow** (`scripts/blender/rig_welcome.py`, user request 2026-09-10): each shipped GLB carries a vertical bone chain and one `welcome` clip — bow toward the street, hold, rise (48 frames at 24 fps). Vertices are weighted by smooth height bands instead of bone-heat, which is deterministic and exactly sufficient for a bow; it also works with every held prop and fist the sculpts arrived with, where a full Mixamo limb rig would fail. The app plays the clip once per selection and suppresses its procedural hop when the clip exists.

The chain is a per-character profile in the script. Humanoids get four bones (root / spine / chest / head, ~34° cumulative). Doraemon gets two (root / body, 18° at the hips): his head fills the top 55% of his height and any joint inside it kinks the sphere, and the ice-cream cone he holds runs from mouth to shin, so he bows as one rigid block with only the legs blending. The chain's pivot is the bounding-box centre of a thin slab at the first joint — never the vertex centroid, which the dense front-facing arms, face and props drag forward by a quarter metre on Doraemon.

The rig script is idempotent over its own output: re-running it on an already-rigged GLB strips the old armature, vertex groups and stale actions before rebuilding. Export one character with `OBJECTS = ["<id>", "<id>_rig"]` in `export_glb.py`, then `bun run assets:build -- --in <dir-with-only-that-file> --out <tmp>` and copy the result into `public/models/characters/`, so the other characters' binaries stay untouched. Blender 5 note: `action.fcurves` is gone (layered actions); new keyframes default to bezier anyway.

## 5. Surface textures

`scripts/make-textures.py` produces every texture the builders use, into `assets/raw/textures/`:

- **Leaf and blossom cards** are keyed from Gemini clusters (backdrop sampled from the corners, foreground colour bled into transparent texels). `plants_build.py` scatters hundreds of them tangent to each canopy, exported as `alphaMode: MASK` through a Greater Than node on the alpha socket (Blender 5 has no CLIP mode). Cards cast but do not receive shadows and carry faint emission so faces turned from the sun stay readable.
- **Material tiles** (stucco, concrete, asphalt, grass, wood) are procedural wrapped fractal noise — seamless by construction — with mean luminance normalised to 0.8 so the palette colour that multiplies them still sets the hue. A Gemini source at `assets/ref/tile-*/front.png` is used instead when present. Gemini was rate-limited (429) on both models when the tiles were needed, which is why the procedural path exists.
- **Normal maps** for bark and every tile come from a Sobel filter over luminance.

`scripts/blender/texture_lib.py` is exec'd by both `env_build.py` and `house_build.py`: `TILES` maps palette colour names to a tile, a metres-per-repeat and a normal strength; `tiled_material` builds albedo × colour (exported as `baseColorTexture` × `baseColorFactor`) plus the normal map; `apply_world_uvs` box-projects UVs from world coordinates along each face's dominant axis after all geometry edits, so tiles run continuously across every part without unwrapping. Everything ships as WebP; total `public/models` is under 7 MB.

## 6. Recolouring a texture

Rodin does not always hit the canon palette. `scripts/recolor-character-texture.py` holds one rule table per character and rewrites only the measured HSV regions of the diffuse map, keeping the original shading. It reads the texture straight out of the raw GLB, so no manual extraction step exists.

Applied so far: Gian (yellow shirt → orange, magenta stripe → cream, brown trousers → navy), Shizuka (blue skirt → red), Suneo (blue shirt → green, teal shorts → brown). To fix a future model, add a rule entry with gates measured from its hue histogram, run the script, and swap the image in Blender via `DIFFUSE_OVERRIDE` in `prep_character.py`.

## 7. Optimise

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

Current payload: `house.glb` 1.68 MB, `neighbours.glb` 0.94 MB, `environment.glb` 0.50 MB, `streets.glb` 0.49 MB, six characters 3.41 MB, three props 0.87 MB — 7.9 MB in total.

`build-assets.mjs` runs `flatten` and `join` on non-character models before welding, merging their hundreds of parts into one mesh per material. That took the scene from 304 draw calls to 68 with no visual change.
