---
phase: 3
title: "Blender: neighbour houses and parking lot"
status: done
priority: P2
effort: "6h"
dependencies: [1]
---

# Phase 3: Blender: neighbour houses and parking lot

## Overview
A parametric neighbour-house generator with three variants, placed on the seven lots from `layout.neighbours`, each lot with its own block wall, gate, yard slab and one or two props, plus the coin parking lot opposite the gate. Exports `neighbours.glb`.

## Requirements
- Functional: variants `hip2`, `gable2`, `gable1` as specified in Phase 1; house centre, yaw and footprint from `houseTransform` copied into Python; wall and roof tints from the layout; every house faces its street.
- Non-functional: ≤ 45k triangles total, ≤ 1 MB after `assets:build`; after `flatten + join` ≤ 12 draw calls (one per material).

## Architecture

`neighbours_build.py` (loads `env_helpers.py`, coordinates via `P()`):

```python
LOTS = [  # mirrors layout.neighbours in src/data/scene.ts
  dict(id="east", x0=7.9, x1=21.9, z0=-7.2, z1=5.8, facing="+z", variant="gable2", wall=(...), roof=(...), offset=0.6),
  ...
]

def build_house(coll, spec):       # builds at origin facing -Y in Blender, then rotate_parts + translate
def build_lot(coll, spec):         # yard slab, block wall with coping (no vents/mortar), gate posts + leaf, nameplate, hedge-free
def build_parking(coll, spec):     # asphalt slab, 5 white bays, wheel stops, chain fence on 0.7 m posts, sign board, ticket machine
```

House parts, medium band only:

| Part | `hip2` | `gable2` | `gable1` |
|---|---|---|---|
| Massing | GF box 7.5×6.5×2.75, UF box inset 0.6, 2.55 high | GF 8×6×2.75, UF same footprint 2.55 | GF 8.5×6.5×2.75 |
| Roof | Hipped pyramid over UF, pitch 25°, 0.5 m overhang, ridge cap box; pent roof over the front door | Gable prism (`add_gable_prism`), ridge along the street, 0.5 overhang, barge boards, ridge cap | Gable prism, ridge perpendicular to the street; porch gable over the door |
| Tile courses | Thin boxes 0.02 high every 0.29 m up each slope (course lips only; no ribs) | same | same |
| Eaves | Fascia box 0.12 high around the roof edge, soffit slab 0.05 | same | same |
| Openings | 2 GF windows + 1 door on the front; 2 UF windows; 1 side window each side. Frame = 4 bars 0.07 proud of the wall, glass box 0.02 proud, dark backing box flush | + balcony: 1.2 m deep slab with 0.9 m rail of 8 bars | + wide veranda window 2.4 m |
| Extras | AC unit on the side, downpipe on one corner, gutter box under the eave on the street side | same | same |

Colour palette: per-lot `wall` and `roof` from the layout plus shared `frame`, `glass`, `interior`, `wood_door`, `fascia`, `concrete`, `concrete_dark`, `asphalt`, `plate`, `metal` from `env_helpers.COLOURS` (add the missing ones there).

Bevel: 0.02 on massing and roof edges only (`bmesh.ops.bevel`, 1 segment) to catch the key light like the hero house; none on window bars.

## Related Code Files
- Create: `scripts/blender/neighbours_build.py`
- Modify: `scripts/blender/env_helpers.py` (add house colours, `add_hip_roof`, `rotate_parts` if not already there)
- Create: `public/models/neighbours.glb`

## Implementation Steps
1. Write the generator with one variant (`gable2`) on lot `east`; run through MCP, screenshot from the hero view and from the side; compare massing against the proxy box (toggle the proxy by renaming the GLB URL) until they coincide.
2. Add `hip2` and `gable1`; build all seven lots; add `build_parking`.
3. Count triangles per house (`sum(len(p.polygons) ...)`), keep ≤ 5k per house; drop tile-course lips on the two farthest lots (`west-back`, `south-west`) first if over budget.
4. Export `COLLECTION="NEIGHBOURS"` → `assets/raw/final/neighbours.glb`, run `assets:build` for that file only, drop into `public/models/`.
5. In the app, orbit all four azimuths; check that no house pokes through its lot wall, that gates face the street, and that the `back` roof peeks above Nobita's roof from the hero view.

## Success Criteria
- [x] Seven houses in three variants, correct facing, tints applied; parking lot opposite the gate
- [x] ≤ 45k triangles, ≤ 1 MB, ≤ 12 draw calls for `neighbours.glb`
- [x] Silhouettes match the Phase 1 proxies within 0.3 m (visual overlay)
- [x] Style reads as the same clay-smooth family as the hero house, one step less detailed

## Risk Assessment
- Rotated assemblies: rotation must happen in bmesh about the house pivot before translation (`house_build.py` lesson: rotating objects after baking translation spins them around the world origin). `build_house` collects parts as bmesh, rotates by yaw with `rotate_parts`, then translates.
- `bmesh.ops.scale` on cones stretches length not radius: hip roof is built from explicit verts, not a scaled cone.
- Too uniform: the per-lot `offset` and tints are the only variation; if the row still looks stamped, add a per-lot `mirror` flag that flips the door side.
