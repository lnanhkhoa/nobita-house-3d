---
phase: 1
title: "Layout data, proxies, camera colliders"
status: done
priority: P2
effort: "4h"
dependencies: []
---

# Phase 1: Layout data, proxies, camera colliders

## Overview
Define every coordinate of the neighbourhood in `src/data/scene.ts`, render placeholder geometry for streets and neighbour houses so the scene reads correctly before any Blender work, and stop the camera from entering neighbour houses. After this phase the Blender scripts have numbers to copy.

## Requirements
- Functional: proxies show an L-shaped street with sidewalks on both sides, seven neighbour lots with box houses and a parking lot, poles along the front street; camera cannot enter a neighbour box; default view unchanged.
- Non-functional: no new dependencies; proxies use `meshStandardMaterial` boxes only; `characters.test.ts` still passes; new `scene.test.ts` guards the layout.

## Architecture

`layout` gains:

```ts
streets: {
  /** Both roads are 6 m wide with 1.9 m sidewalks each side; they run ±length/2 from the origin. */
  length: 84,
  /** Front road along X; z from `road.startZ` (7.7) to startZ + road.depth (13.7). Existing keys. */
  /** Side road along Z, west of the lot. */
  side: { startX: -15.4, endX: -9.4 },
  kerbRadius: 2.0,
  poles: [ [-8.7, 7.2], [8.6, 7.2], [33, 7.2], [-8.7, -22] ] as const,  // x, z; height 8
},
neighbours: [
  { id: 'east',       lot: { x0: 7.9,  x1: 21.9, z0: -7.2,  z1: 5.8  }, facing: '+z', variant: 'gable2', wall: '#F2EEE6', roof: '#4A3A2E' },
  { id: 'east-back',  lot: { x0: 7.9,  x1: 21.9, z0: -21.2, z1: -7.6 }, facing: '-z', variant: 'gable1', wall: '#E4E2DC', roof: '#4F5B70' },
  { id: 'back',       lot: { x0: -7.5, x1: 7.5,  z0: -21.2, z1: -7.6 }, facing: '-z', variant: 'hip2',   wall: '#EFE3C6', roof: '#5E6B82' },
  { id: 'west-back',  lot: { x0: -31.3, x1: -17.3, z0: -21.2, z1: -7.6 }, facing: '+x', variant: 'hip2', wall: '#E6E4E0', roof: '#5A4636' },
  { id: 'west',       lot: { x0: -31.3, x1: -17.3, z0: -7.2, z1: 5.8 }, facing: '+x', variant: 'gable2', wall: '#F0DCCF', roof: '#4F5B70' },
  { id: 'south-west', lot: { x0: -31.3, x1: -17.3, z0: 15.6, z1: 28.6 }, facing: '-z', variant: 'gable1', wall: '#EFE3C6', roof: '#4A3A2E' },
  { id: 'south-east', lot: { x0: 9.4,  x1: 23.4, z0: 15.6, z1: 28.6 }, facing: '-z', variant: 'hip2',   wall: '#F4F1EA', roof: '#5E6B82' },
],
parking: { lot: { x0: -7.5, x1: 9.0, z0: 15.6, z1: 28.6 }, bays: 5 },
```

Variants (shared by proxy and Blender):

| variant | storeys | footprint w × d | roof | eave height |
|---|---|---|---|---|
| `hip2` | 2 | 7.5 × 6.5, upper inset 0.6 | hipped, pitch 25° | 5.3 |
| `gable2` | 2 | 8.0 × 6.0 | gable, ridge parallel to street | 5.3 |
| `gable1` | 1 | 8.5 × 6.5 | gable, ridge perpendicular to street (gable end faces street) | 2.75 |

House placement rule (one helper `houseTransform(n)` in `scene.ts`, used by proxies and copied to Python): footprint centred across the lot's width, front wall set back 3.2 m from the facing edge, yaw = 0 for `+z`, π for `-z`, −π/2 for `+x`. Add a per-lot `offset` (±0.8 m along the street) so the row does not look stamped.

Extra trees appended to `layout.trees` (inside lots, ≥ 1 m from walls, outside footprints): `(14.5, -3.5) 5.0 tree`, `(19.5, -17) 6.0 tree`, `(-5, -18.5) 6.5 tree`, `(5.5, -19) 5.5 sakura`, `(-28, -18) 6.0 tree`, `(-27.5, 3) 5.0 tree`, `(-28.5, 26) 5.5 tree`, `(7.5, 27) 5.0 tree`, `(21, 26.5) 5.5 tree`. Hedge rows: one along the inside of the front wall of lots `east` and `south-east`.

Camera collision: `neighbours.tsx` always renders `<group name="camera-colliders">` containing one `visible={false}` box per house (footprint × total height, plus the parking lot fence is **not** included). `camera-rig.tsx` reads that group once after mount (`scene.getObjectByName`) and assigns `controls.colliderMeshes`. R3F pointer events only consider objects with handlers, so the colliders do not block the ground-click deselect.

## Related Code Files
- Modify: `src/data/scene.ts` (streets, neighbours, parking, trees, hedges, `houseTransform`)
- Create: `src/data/scene.test.ts`
- Modify: `src/config.ts` (`models.streets`, `models.neighbours`; `camera.maxDistance` 34 → 38; `maxPolarAngle` 0.49π → 0.47π so the camera stays above the 1.6 m walls at the far orbit)
- Modify: `src/app.tsx` (add the two URLs to the preflight list)
- Create: `src/scene/streets.tsx` (proxy: two road slabs, four sidewalk strips, kerbs, poles as cylinders; `ModelOrProxy` on `config.models.streets`)
- Create: `src/scene/neighbours.tsx` (proxy: per lot a yard plane, wall boxes, house boxes + cone/prism roof in `roof` tint; parking slab; plus the collider group)
- Modify: `src/scene/environment.tsx` (delete sidewalk, road, pole from `EnvironmentProxy`)
- Modify: `src/scene/scene.tsx` (mount `<Streets/>` and `<Neighbours/>`; fog `40, 90` → `48, 110`)
- Modify: `src/scene/camera-rig.tsx` (collider wiring)
- Modify: `src/scene/lighting.tsx` (shadow camera ±16 → ±30, map 2048 → 4096, far 45 → 70)

## Implementation Steps
1. Extend `layout` in `scene.ts` with the block above; add `houseTransform` returning `{ centre: [x, z], yaw, footprint }` per variant.
2. Write `scene.test.ts`: lots pairwise disjoint; no lot intersects Nobita's lot, either road strip or any sidewalk; every tree inside exactly one lot (or Nobita's) and outside every house footprint; poles on a sidewalk strip; parking lot disjoint from all lots.
3. Add model paths and camera tweaks to `config.ts`; add the URLs to the preflight array in `app.tsx`.
4. Create `streets.tsx` proxy and remove the moved parts from `environment.tsx`. Keep `layout.sidewalk`, `layout.road`, `layout.pole` keys so `characters.test.ts` is untouched; `pole` becomes `streets.poles[1]` and the old key is removed only if nothing else reads it.
5. Create `neighbours.tsx`: `NeighbourProxy` per lot from `houseTransform`, `ParkingProxy`, `Colliders` group. Colliders render regardless of GLB availability.
6. Wire `colliderMeshes` in `camera-rig.tsx`; verify by orbiting to azimuth 180° at max distance: the camera must stop in front of the `back` house. If it clips, apply the `colorWrite=false` fallback from the plan's risk table.
7. Widen the shadow frustum and fog; confirm the hero shadow on the yard is still crisp enough at 1080p.
8. Run `bun run lint && bun run typecheck && bun run test`, then `bun run dev` and screenshot four azimuths (0°, 90°, 180°, 270°) for the record in `plans/reports/`.

## Success Criteria
- [x] Proxies visible for streets, seven houses, parking lot, four poles; sidewalk continuous around the corner
- [x] Camera stops at neighbour house boxes at every azimuth; default view and Reset view unchanged
- [x] `scene.test.ts` passes and fails when a lot is moved onto the road (verified once by hand)
- [x] lint, typecheck, test clean; 60 fps in dev on the M4

## Risk Assessment
- `colliderMeshes` raycast cost: 8 boxes are trivial; if `getObjectByName` runs before the group mounts (it should not, all effects run after commit), move to a `useLayoutEffect` in `Neighbours` that writes the array into the store.
- Widened shadow frustum softens the hero shadow: measured against a screenshot from before the change; revert to ±24 if the tile-edge shadows blur visibly.
- `maxPolarAngle` change alters the feel of the lowest orbit; if the user dislikes it, restore 0.49π and accept wall clipping at the far orbit (the collider list can include wall boxes instead).
