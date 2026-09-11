---
phase: 2
title: "Blender: streets"
status: done
priority: P2
effort: "4h"
dependencies: [1]
---

# Phase 2: Blender: streets

## Overview
Move the public realm out of `env_build.py` into a new `streets_build.py` and extend it into a crossroads: two roads, sidewalks on both sides, kerbs with rounded corners, markings, crossings, drains, manholes, and utility poles with sagging wires. Exports `streets.glb`; `environment.glb` is re-exported without the street.

## Requirements
- Functional: geometry matches `layout.streets`, `layout.sidewalk`, `layout.road` from Phase 1 exactly; the front sidewalk top stays at y = 0.12 (`layout.standY`); the kerb wraps the four crossroads corners with a 2 m radius.
- Non-functional: ≤ 8k triangles, ≤ 0.1 MB after `assets:build`; no overlapping coplanar faces between `streets.glb`, `environment.glb` and the R3F ground plane (streets sit at y ≥ 0.001 above the plane; the yard slab in env stays at −0.04..0.04).

## Architecture

**Helper extraction.** `material`, `fresh_collection`, `add_box`, `add_cylinder`, `add_wire`, `add_sphere`, `add_gable_prism` and `COLOURS` leave `env_build.py` for `scripts/blender/env_helpers.py`. Each builder loads it with

```python
import os
SCRIPTS_DIR = globals().get("SCRIPTS_DIR", os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else ".")
exec(open(os.path.join(SCRIPTS_DIR, "env_helpers.py")).read())
```

so both the `exec(open(...))` MCP path and a direct `blender --python` path work. `fresh_collection(name)` takes the collection name as an argument.

**Coordinates.** `streets_build.py` and `neighbours_build.py` build directly in Blender space with `def P(x, z, y=0.0): return (x, -z, y)`; there is no end-of-script Y flip. `env_build.py` keeps its flip (unchanged behaviour, fewer edits) and documents that it is the only script that does so.

**Geometry list** (all sizes from `layout`):

| Part | Build |
|---|---|
| Road slabs | Front: box `(length, 6, 0.06)` centred on the front road; side: two boxes north and south of the junction so nothing overlaps the front slab |
| Sidewalks | Four strips per road (near/far, split at the junction), height 0.12; corner blocks fill the four junction corners |
| Kerbs | 0.16 × 0.18 boxes along every sidewalk edge; corner arcs as 8-segment quarter rings (bmesh fan, radius 2.0) at the four junction corners |
| Markings | Centre dash 1.6 m on 3 m pitch on both roads (skip inside the junction); stop lines 0.3 m wide before each crossing; zebra crossings on all four legs, 0.55 × leg-width stripes, 6 per crossing |
| Street furniture | Drains 0.55 × 0.32 every 6 m along the near kerb of both roads; 4 manhole discs r 0.3; the existing postbox stays in env |
| Poles | Same builder as today (tapered shaft, collar, two crossarms, insulators, transformer, step bolts, sign) as `add_pole(coll, x, z, along='x'|'z')`; at `layout.streets.poles`. Wires run pole-to-pole along the front road (−8.7 → 8.6 → 33 and −8.7 → −42) and along the side road (−8.7,7.2 → −8.7,−22 → −42) with sag 0.35 per span |

## Related Code Files
- Create: `scripts/blender/env_helpers.py`
- Create: `scripts/blender/streets_build.py`
- Modify: `scripts/blender/env_build.py` (remove sidewalk, kerb, road, road lines, zebra, drains, pole + wires; load helpers)
- Modify: `scripts/blender/export_glb.py` (no change expected; `COLLECTION="STREETS"` is passed in)
- Regenerate: `public/models/environment.glb`; create `public/models/streets.glb`

## Implementation Steps
1. Extract helpers into `env_helpers.py`; re-run `env_build.py` through MCP and diff object count before/after removing the street parts (expect the same objects minus 25 street/pole objects).
2. Write `streets_build.py` with a `LAYOUT` block at the top that quotes the `scene.ts` values it mirrors.
3. Run through `mcp__blender__execute_blender_code`, take a viewport screenshot from the default hero angle and from above the junction.
4. Export: `COLLECTION="ENV"` → `assets/raw/final/environment.glb`; `COLLECTION="STREETS"` → `assets/raw/final/streets.glb`; run `bun run assets:build -- --in <tmp with those two> --out public/models`.
5. Load in the app (Phase 1 proxies swap out silently); check the seam between the env yard, the sidewalk and the kerb at the gate, and the corner arc.
6. Record triangle count and file size in the plan's Phase 4 table.

## Success Criteria
- [x] `environment.glb` contains no street geometry; `streets.glb` renders the crossroads with rounded kerbs and markings
- [x] Characters still stand on the sidewalk surface (no floating, no sinking)
- [x] ≤ 8k triangles, ≤ 0.1 MB; no z-fighting at any seam
- [x] `env_build.py` still reproduces today's lot exactly apart from the removed parts

## Risk Assessment
- Helper extraction breaks `env_build.py` silently (materials renamed, collection handling): the object-count diff in step 1 and a screenshot comparison catch it.
- Mirrored geometry: `streets_build.py` uses `P()` everywhere; if the street appears behind the house, `P` was skipped on one call. Validate by checking pole `[8.6, 7.2]` shows to the right of the gate from the hero view.
- Kerb arc normals inverted (black quarter rings): call `bmesh.ops.recalc_face_normals` after the fan.
