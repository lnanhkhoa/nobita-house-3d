# Phase 4 — Character pipeline: Rodin → Blender → GLB

**Done 2026-09-10.** Rigging was dropped; see `docs/asset-pipeline.md` for the runbook.

## What shipped

| Character | Source file | Height | Triangles | Optimised GLB |
|---|---|---|---|---|
| Doraemon | `base_basic_pbr.glb` | 1.29 m | 40k | 3.45 MB |
| Nobita | `base_basic_pbr.glb` | 1.40 m | 40k | 2.88 MB |
| Shizuka | `base_basic_pbr.glb` | 1.38 m | 40k | 3.13 MB |
| Gian | `lod_basic_pbr.fbx` (LOD2) | 1.57 m | 50k | 2.83 MB |
| Suneo | `base_basic_pbr.glb` | 1.35 m | 40k | 3.15 MB |

## Decisions taken during the phase

- **No Mixamo.** The sculpts are posed (Gian mid-flex, Doraemon holding a dorayaki) and carry no skin. Auto-rigging needs arms clear of the body and open hands. Procedural motion in `src/scene/use-character-motion.ts` replaces it.
- **Recoloured, not regenerated.** `scripts/recolor-character-texture.py` remaps measured HSV regions per character: Gian's yellow shirt → orange, magenta stripe → cream, brown trousers → navy; Shizuka's blue skirt → red; Suneo's blue shirt → green and teal shorts → brown. Skin, hair and shoes are excluded by the hue/saturation/value gates. Costs nothing and keeps the sculpts.
- **Gian's FBX carried a full LOD ladder** (200k / 100k / 50k / 25k / 12.5k), so LOD2 is used directly instead of decimating.
- The folder originally named `gian` held a second copy of Shizuka; the user replaced it.

## Left open

- ~~Shizuka and Suneo colour mismatches~~ — fixed 2026-09-10 with the same recolour technique.
- ~507k triangles on screen (characters + detailed house), above the 300k plan target. Not a measured problem on desktop; drop characters to a lower LOD if mobile frame time suffers.
