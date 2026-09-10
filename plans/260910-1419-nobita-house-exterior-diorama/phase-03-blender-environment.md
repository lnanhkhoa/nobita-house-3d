# Phase 3 — Blender: environment and house

**Done 2026-09-10.**

## What shipped

| Script | Builds | Triangles | Optimised GLB |
|---|---|---|---|
| `scripts/blender/env_build.py` | yard, block wall with vents, gate and nameplate, sidewalk, kerb, road with markings, utility pole | ~4k | 0.01 MB |
| `scripts/blender/house_build.py` | the whole house | 82k | 0.61 MB |

## House detail, against the hero detail ladder

- **Silhouette**: hipped kawara apron over the ground floor, a street-facing gable over the set-back upper storey, an entrance porch gable projecting into the yard, and eave overhangs on every run. Four profile events, above the two-to-four target.
- **Medium**: every opening is cut 30 cm into its wall by boolean, then filled with an outer frame, meeting mullions, glass, a projecting sill and a dark interior backing. Four windows, a louvred storm shutter, a planked front door.
- **Fine**: kawara rib profile and per-course lips generated parametrically across each roof patch, ridge caps with rounded ends, barge boards, fascia, soffit, exposed rafter tails every 46 cm, half-round gutters with brackets, two downpipes with clips, a gable vent, porch lamp and nameplate. Hard edges bevelled 2-3 cm.

## Rodin was not used here

Image-to-3D rounds edges and cannot hold a flat wall plane or a repeating tile course. Procedural geometry gives sharper results at a fraction of the triangle count. Trees and shrubs are the opposite case and were split out of the environment so Rodin models can replace them per instance.

## Bugs worth remembering

- `box()` bakes its translation into the mesh, so setting `rotation_euler` afterwards spins the part about the **world origin**, not its own centre. Shutter slats and side windows both flew off the building this way. Rotation now happens inside bmesh, before the translation.
- A solid "reveal" box filling the window niche hid the frame and glass completely. Replaced by a thin interior backing panel.
- `bmesh.ops.scale` on a cone scales its length along Z, not its cross-section, which stretched every ridge cap into a plank.
- Looking a wall up by name found a leftover object from an earlier run that silently absorbed every boolean. Cutters now hold the object reference.
