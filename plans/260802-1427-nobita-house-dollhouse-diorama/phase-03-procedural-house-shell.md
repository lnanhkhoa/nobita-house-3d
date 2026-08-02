---
phase: 3
title: "Procedural House Shell"
status: pending
priority: P1
dependencies: [2]
effort: "8h"
---

# Phase 3: Procedural House Shell

## Overview

Build the whole building — floors, walls, roof, stairs, yard, fence — procedurally from `data/rooms.ts`. No Rodin asset is involved (see `plan.md` §Stated assumption).

The load-bearing output is not the geometry, it is the **addressability contract**: Phase 5's cutaway and floor toggle can only work if every exterior wall is an individually-toggleable mesh carrying its own outward normal, owning room and floor. That contract is frozen here.

## Requirements

| # | Requirement | Verified by |
|---|---|---|
| R1 | Shell built entirely from `ROOMS`; no hard-coded coordinates in `house-shell.ts` | grep: no float literal outside `SHELL` const block |
| R2 | Every exterior wall = one `Mesh`, `userData` per §Wall contract | SC-3 |
| R3 | Roof is a separate group, toggleable independently of floors | SC-4 |
| R4 | Flat-shaded `MeshStandardMaterial`, palette colours; shared everywhere except exterior walls, which each own a cloned instance | SC-6 |
| R5 | Draw calls measured and stated | SC-5 |
| R6 | `dispose()` frees every geometry + material | SC-8 |
| R7 | Recognisable against `house-ground.webp` | SC-1 (side-by-side) |

## Architecture

### Scene graph (contract — Phase 5 addresses these names)

```
house-shell            Group  name='house-shell'
├── floor-ground       Group  name='floor-ground'   userData.floor='ground'
│   ├── slabs          Group  1 merged Mesh per floor-finish material
│   ├── walls-ext      Group  N individual Mesh  ← cutaway targets, addressable
│   └── walls-int      Group  1 merged Mesh      ← partitions, not addressable
├── floor-second       Group  name='floor-second'  userData.floor='second'
│   └── (same three children)
├── stairs             Group  name='stairs'       1 merged Mesh + 1 railing Mesh
├── roof               Group  name='roof'         main gable + 2 lean-tos
└── yard               Group  name='yard'         ground plane, fence, shed
```

```ts
export interface HouseShell {
  root: THREE.Group;
  groups: Record<'ground' | 'second' | 'stairs' | 'roof' | 'yard', THREE.Group>;
  /** every exterior wall, keyed `${roomId}:${side}` */
  wallsByKey: ReadonlyMap<string, THREE.Mesh>;
  exteriorWalls: readonly THREE.Mesh[];        // === [...wallsByKey.values()]
  /** every interior-partition wall segment that contributed geometry to walls-int, keyed `${roomId}:${side}` — merged meshes have no per-wall identity, so this is what SC-7 and the B1 regression test check instead */
  interiorWallKeys: ReadonlySet<string>;
  roomBounds: ReadonlyMap<string, THREE.Box3>; // world-space; Phase 5 feeds these to fitToBox
  dispose(): void;
}
export function buildHouseShell(rooms: readonly RoomDef[]): HouseShell;
```

`roomBounds` is exported from here rather than recomputed in Phase 5 — the shell already knows the floor Y and ceiling height, and two independent derivations would drift.

### Wall `userData` — **frozen contract, Phase 5 reads this**

```ts
export interface WallUserData {
  kind: 'wall';
  roomId: string;               // RoomDef.id that owns this wall
  floor: FloorId;
  side: WallSide;               // 'north' | 'east' | 'south' | 'west'
  /** UNIT world-space normal pointing AWAY from the owning room's interior */
  outward: readonly [number, number, number];
  exterior: boolean;            // always true for meshes in walls-ext
  wallKey: string;              // `${roomId}:${side}` — matches wallsByKey
}
```

`outward` values, given the Phase 2 frame (`+X` east, `+Z` south):
`north → (0,0,-1)` · `south → (0,0,1)` · `east → (1,0,0)` · `west → (-1,0,0)`.

> **Cutaway algorithm this enables (Phase 5, stated so the contract is testable now):**
> a wall is hidden when `dot(outward, normalize(camera.position - wallCenter)) > 0` — i.e. the camera is on the wall's outward side, so the wall stands between the camera and the room. Store `wallCenter` implicitly via `mesh.getWorldPosition()`; the geometry is built centred on its own origin so the mesh position *is* the wall centre. **Do not** bake a world offset into the geometry.

Other `userData.kind` values: `'slab'` (+ `roomId`, `floor`), `'wall-int'` (+ `floor`), `'stairs'`, `'roof'`, `'yard'`, `'fence'`. Phase 6's raycaster filters on `kind` to keep hotspot picking off the shell.

### Merging trade-off — explicit

| Element | Strategy | Why |
|---|---|---|
| Exterior walls | **individual meshes, each with its own cloned material instance** | Cutaway toggles them one at a time, and Phase 5's 180ms opacity fade needs a private `opacity`/`transparent` per wall. Cost: **zero extra draw calls** — a draw call is per mesh/material pair, and each wall is already its own mesh, so cloning its material doesn't add one. |
| Interior partitions | **merged per floor** (`BufferGeometryUtils.mergeGeometries`) | Never individually toggled. Cutaway only ever touches exterior walls; the floor toggle works at group level. Saves ~10 draw calls for zero lost capability. |
| Floor slabs | merged per floor **per material** | 3 finishes (tatami / wood / tile) × 2 floors = 6 meshes instead of 11. |
| Stairs | 13 treads merged into 1 mesh | Never addressed individually. |
| Fence | ~360 slats merged into 1 mesh | Ditto. ~4.4k tris — cheap. |
| Roof | 1 mesh per plane group | 3 planes, toggled together. |

Rule of thumb applied: **merge unless something needs to address it.** Cutaway and room-framing are the only addressability consumers, and both work off exterior walls + `roomBounds`.

### Draw-call / triangle budget (Phase 3 portion)

| Group | Meshes | ~Tris |
|---|---|---|
| exterior walls (ground) | 10 | 1.3k |
| exterior walls (second) | 8 | 0.9k |
| interior partitions (merged ×2) | 2 | 0.8k |
| floor slabs (merged, 3 finishes × 2) | 6 | 0.3k |
| stairs + railing | 2 | 0.6k |
| roof (gable + 2 lean-tos + ridge cap) | 4 | 0.45k |
| yard: ground plane, fence, shed | 3 | 5.0k |
| **Shell total** | **35** | **≈9.4k** |

Recount (§Wall geometry step is edge-first, so this is now enumerated directly from the room table in `phase-02`, not the old room-first rule): ground exterior = 1 N (`gf-kitchen`, full 7.28 m width) + 3 W (`gf-kitchen`/`gf-living`/`gf-guest`) + 3 S (`gf-guest`/`gf-stairs`/`gf-genkan`) + 3 E (`gf-kitchen`/`gf-bath`/`gf-genkan`) = **10**. Second floor = 2 per side (unchanged tessellation) = **8**. Roof gains a 4th mesh for the ridge cap (`plaster`, a different material from the `kawara` gable/lean-to slabs, so it cannot share their mesh). Shell total = 10+8+2+6+2+4+3 = **35** meshes, still ≈9k triangles.

Leaves 85 draw calls of the `<120` budget for props — 54 props at roughly 1 draw call each fits comfortably (budget renegotiated by the lead, `plan.md` Reconciled contracts #4; no longer at risk). Phase 3's own gate is the 35 above.

### Geometry constants (`SHELL` block in `house-shell.ts`)

```ts
const SHELL = {
  wallThickExt: 0.12, wallThickInt: 0.08, slabThick: 0.15, floorFinish: 0.03,
  ceilH: 2.40,                 // must equal RoomDef.height; asserted at build
  eaveOverhang: 0.40, roofPitchDeg: 32, roofThick: 0.10, ridgeCapH: 0.12,
  stepRise: 0.196, stepTread: 0.196, stairWidth: 1.60,   // 13 steps × 0.196 = 2.548 ≈ FLOOR_Y.second
  fenceH: 1.10, fenceSlatW: 0.09, fenceGap: 0.06, groundY: -0.15,
} as const;
```

Stair check: `FLOOR_Y.second = 2.55`; `ceil(2.55 / 0.196) = 13` risers of `2.55/13 = 0.1962`; run `= 13 × 0.196 = 2.548 m` → 45°, correct for a Japanese house. Placed in `gf-stairs` ascending north, `z 6.19 → 3.64`, landing at `2f-landing` (`z 3.64→5.46`) ✓.

Roof: main gable over the 2F block (`x 0→5.46`, `z 0→5.46`), **ridge N–S at `x = 2.73`** per canon. Half-span 2.73, pitch 32° → ridge rise `2.73 × tan(32°) = 1.706`. Eave at `FLOOR_Y.second + ceilH = 4.95`; ridge at `6.66`. Two lean-tos at 12°, split at `z = 5.46` so they share a clean vertical seam instead of crossing: region S (`x 0→7.28, z 5.46→8.19`, slopes south — covers `gf-guest`, the single-storey southern `gf-stairs` run, and `gf-genkan`), region E (`x 5.46→7.28, z 0→5.46`, slopes east — covers `gf-kitchen`'s east bay and `gf-bath`, both single-storey), eave line at ground `ceilH = 2.40`. Region S now spans the full 7.28 m width and region E stops at `z = 5.46` instead of running the full 8.19 m depth — the previous split (region E full-depth at `x 5.46→7.28`, region S only `x 0→5.46`) left the two planes crossing at the SE corner over `gf-genkan` (an open slit at one end, an overlap at the other); this split removes both because for `z > 5.46` only region S exists across the whole width, and for `z < 5.46` only region E exists in the `x 5.46→7.28` strip (the rest is under the main gable).

### Materials — `src/world/materials.ts` (**new file, contract addition**)

`plan.md`'s module list has no home for the shared material cache, and both `house-shell.ts` and `prop-registry.ts` (Phase 4) need it. Two private caches = double the material count = double the draw-call state changes, and a DRY violation. One 25-line module:

```ts
export function paletteMaterial(key: PaletteKey): THREE.MeshStandardMaterial;  // memoised, flatShading
export function disposeMaterials(): void;
```
`{ color: PALETTE[key], flatShading: true, roughness: 0.92, metalness: 0 }`. `data/palette.ts` stays three-free (Phase 2 T-rule).

Exterior walls are the one exception to sharing: each calls `paletteMaterial('plaster').clone()` to get a private, disposable instance, because Phase 5's cutaway fade animates `opacity`/`transparent` per wall and a shared instance would fade every wall at once. Every other group (interior partitions, slabs, stairs, roof, yard) uses the memoised instance directly.

Floor finish per room: `gf-living`/`gf-guest`/`2f-nobita`/`2f-parents` → `tatami`; `gf-kitchen`/`gf-bath` → `tile`; `gf-stairs`/`gf-genkan`/`2f-hall`/`2f-landing` → `woodLight`. Walls `plaster`, structure `woodDark`, roof `kawara`, yard `grass`, fence `woodLight`.

## Related Code Files

| Path | Action |
|---|---|
| `src/world/house-shell.ts` | create — builder + `HouseShell` + `WallUserData` |
| `src/world/materials.ts` | create — shared memoised palette materials |
| `src/utils/bounds.ts` | create — `roomBox3(room, floorY)`, `boxCenter`, used here and by Phase 5 |
| `src/core/scene-lighting.ts` | **modify** — delete the Phase 1 `temp-ground` plane |
| `src/main.ts` | modify — `scene.add(buildHouseShell(ROOMS).root)` |
| `src/world/house-shell.test.ts` | create — SC-3, SC-4, SC-7 as unit tests |

## Implementation Steps

1. **`utils/bounds.ts`** — `roomBox3(room, floorY)` → world `Box3` from footprint + `FLOOR_Y[room.floor]` + `room.height`. Single source for room extents.
2. **`world/materials.ts`** — memoised `Map<PaletteKey, MeshStandardMaterial>`.
3. **Slabs.** Per room (skip `outdoor`): `BoxGeometry(w, slabThick, d)` at `y = FLOOR_Y[floor] - slabThick/2`, plus a `floorFinish`-thick top box in the room's finish colour. Group by material, `mergeGeometries`, one `Mesh` each, `receiveShadow = true`. **Exception — `2f-landing` gets a stairwell void.** The stair run (see step 7) rises through `z 6.19→3.64`, reaching `FLOOR_Y.second` only at its top step (`z ≈ 3.64`); by `z ≈ 3.8` its treads are already within centimetres of the slab's underside (`y = 2.40`), and `2f-landing`'s full footprint (`z 3.64→5.46`) overlaps the top of that climb. Build `2f-landing`'s slab as a single shrunk box covering only `z 4.03→5.46` (its full `x 3.64→5.46` width unchanged) — dropping the northern `z 3.64→4.03` strip (two tread-depths, `2 × stepTread = 0.392 m`) entirely open, so the last two risers have clear headroom and the remaining `1.43 m` of landing (`z 4.03→5.46`) is solid, walkable floor. This is a plain size change (void at the room's own edge, not a hole in the middle), so it needs no boolean/sub-box merge — just a smaller `BoxGeometry`.
4. **Wall building is edge-first, not room-first.** Iterate every room × every side of its authored `WallSpec` **verbatim**: if `kind !== 'none'`, build exactly one wall for that `(roomId, side)` pair; if `kind === 'none'`, build nothing. There is **no** position-based tiebreak (no "north/west unconditional, south/east only if exterior") — the builder never infers ownership, it only trusts what Phase 2 authored. Dedup is guaranteed by Phase 2's authoring convention, not by the builder: T9 requires every interior boundary be declared by **exactly one** of its two adjacent rooms (the other declares `'none'`), so iterating verbatim can neither drop a wall (a declared `solid`/`opening` side always builds) nor double-build one (the deferring neighbour's `'none'` side never does). This is what fixes the bug where `gf-living`'s `east` (corridor) and `south` (guest) walls, and every other boundary a Phase 2 room deferred to its neighbour on, were silently never built — the old rule looked at the *wrong* room's declaration for south/east sides instead of just building whatever `kind !== 'none'` actually says. Track, per room+side, whether its geometry went into `walls-ext` (exterior) or was folded into the per-floor `walls-int` merge (interior); record the latter's keys in `interiorWallKeys` so the merge doesn't erase per-wall identity for testing purposes.
5. **Wall geometry.** For `kind: 'solid'` → one `BoxGeometry(len, ceilH, thick)`. For `kind: 'opening'` → build the 4 surrounding sub-boxes (below / above / left / right of the hole, skipping zero-area ones), `mergeGeometries` → **one** `Mesh` (must stay one mesh: cutaway toggles a mesh, not a group). `kind: 'none'` → nothing.
   ```ts
   // hole in normalised (u,v); wall local frame: u along +len, v along +Y
   const parts: BufferGeometry[] = [];
   const push = (u0,u1,v0,v1) => { if (u1-u0 > 1e-4 && v1-v0 > 1e-4) parts.push(
     new BoxGeometry((u1-u0)*len, (v1-v0)*ceilH, thick)
       .translate(((u0+u1)/2 - .5)*len, ((v0+v1)/2)*ceilH, 0)); };
   push(0, o.u0, 0, 1); push(o.u1, 1, 0, 1);      // left, right jambs
   push(o.u0, o.u1, 0, o.v0); push(o.u0, o.u1, o.v1, 1);  // sill, header
   ```
   Then position the merged mesh at the wall centre and `rotateY(±π/2)` for east/west sides. `castShadow = receiveShadow = true`.
6. **`userData` + registration.** Attach `WallUserData`. Exterior → `mesh.material = paletteMaterial('plaster').clone()` (private per-wall instance, enables Phase 5's per-wall opacity fade at zero extra draw-call cost) → `walls-ext` group + `wallsByKey`. Interior → shared `paletteMaterial('plaster')` directly; collect geometry **and** add `${roomId}:${side}` to `interiorWallKeys` for every interior segment before merging; merge per floor into one `walls-int` mesh with `userData.kind = 'wall-int'`.
7. **Stairs.** 13 merged tread boxes in `gf-stairs`, `x` centred, ascending `z 6.19 → 3.64`. Railing = merged posts + a rotated top rail on the west side. `userData.kind = 'stairs'`.
8. **Roof.** Main gable: two `BoxGeometry` slabs rotated by `roofPitchDeg` about the ridge axis, extended by `eaveOverhang` on all four edges, plus a `ridgeCapH` box along the ridge in `plaster` (canon "white ridge cap") — a separate mesh from the `kawara` gable/lean-to slabs since it's a different material. Two lean-tos as single rotated slabs, split at `z = 5.46` per the region S/E definitions above. All four (gable, ridge cap, lean-to S, lean-to E) into `groups.roof`, `castShadow = true`. **Never `receiveShadow`** on the roof — self-shadow acne on a 32° slab with a 2048 map.
9. **Yard.** `PlaneGeometry(13.65, 13.65)` rotated `-π/2` at `groundY`, `grass`, `receiveShadow`. Fence: slats every `slatW + gap` around the lot perimeter with a gap for the south approach, merged. Shed: 5 merged boxes + a lean-to roof at the NW corner (`x -4.55→-2.55`, `z -2.73→-1.23`), matching 仓库 in the reference.
10. **`dispose()`** — traverse `root`, dispose every `geometry`; for each mesh in `walls-ext`, also dispose its own cloned material (each exterior wall owns a private instance); then call `disposeMaterials()` once for the shared memoised cache used by every other group (those materials must not be disposed per-mesh).
11. **Wire into `main.ts`**, delete `temp-ground`, eyeball against `house-ground.webp`.

## Success Criteria

- [ ] **SC-1** Screenshot from the default camera placed beside `house-ground.webp`: kitchen north, living centre, guest south, wood corridor spine, bath+genkan east strip, gable ridge running N–S, shed at NW, two-tree yard. Reviewer confirms it reads as the same house.
- [ ] **SC-2** `npm run dev` — no console warning/error; `npm run typecheck` and `npm test` clean.
- [ ] **SC-3** Unit test: every mesh in a `walls-ext` group has `userData.kind === 'wall'`, a `wallKey` matching `wallsByKey`, an `outward` that is one of the 4 unit vectors, and `outward` matching `side` per the mapping table. `wallsByKey.size === exteriorWalls.length`.
- [ ] **SC-4** Unit test: `groups.roof.visible = false` changes no other group's `visible`; `groups.second.visible = false` likewise. Groups are disjoint — no `Object3D` appears under two of them (traverse + Set assertion).
- [ ] **SC-5** `renderer.info.render.calls` logged after one frame with the shell alone in scene: **≤ 38** (budget 35 + 3 slack). `renderer.info.render.triangles` **≤ 12000**. Numbers pasted into the phase report.
- [ ] **SC-6** `new Set(meshes.filter(m => !(m.userData.kind === 'wall' && m.userData.exterior)).map(m => m.material.uuid)).size <= 8` — every non-exterior-wall mesh still shares a memoised palette material. Separately: `exteriorWalls.every((w, i, arr) => arr.every(o => o === w || o.material.uuid !== w.material.uuid))` — no two exterior walls share a material UUID (each is a private clone, per `plan.md` Reconciled contracts #3).
- [ ] **SC-7** Unit test: no two wall meshes are coplanar-and-overlapping (proves the edge-first build never double-builds a boundary). Cheap form: assert `wallsByKey` has no two entries with identical `(round(position,3), side-axis)`.
- [ ] **SC-7b (B1 regression)** Let `declaredEdges = Σ over ROOMS, over the 4 sides, of (1 if kind !== 'none' else 0)`. Assert `exteriorWalls.length + interiorWallKeys.size === declaredEdges` — a wall silently dropped (or double-built) breaks this equality even though T9 and the old SC-7 both pass. Additionally assert `interiorWallKeys.has('gf-living:east')` and `interiorWallKeys.has('gf-living:south')` by name — these are exactly the corridor and guest-room walls the old room-first rule dropped.
- [ ] **SC-8** `dispose()` then `renderer.info.memory.geometries === 0 && .textures === 0`.
- [ ] **SC-9** `grep -nE '[0-9]+\.[0-9]+' src/world/house-shell.ts` shows numeric literals only inside the `SHELL` const block (R1).

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Edge-first build trusts Phase 2's authored ownership with no position-based fallback — a future room added to `rooms.ts` without correct `WallSpec` ownership silently drops a wall again | M×H | Phase 2 **T9** asserts each interior boundary is declared exactly once; SC-7b re-derives the expected wall count from the same data and checks it against the built geometry, independently of T9. Two independent gates, neither of which trusts the builder's own bookkeeping. | Data-only fix in `rooms.ts` |
| Opening sub-box merge produces a wall that is no longer a single mesh → cutaway toggles half a wall | L×H | Step 5 merges *before* constructing the `Mesh`; SC-3 counts meshes per `wallKey` (must be exactly 1). | — |
| Roof over an L-shaped ground floor: 1 gable + 2 lean-tos looks like three unrelated buildings | M×M | Reference art itself draws several roof planes; all three share `kawara` + the same overhang. Judged in SC-1. | Raise 2F to cover columns A+B fully (data change in `rooms.ts`) → one gable, at the cost of an oversized `2f-hall` |
| Shell + prop draw calls (35 shell + 54 props ≈ 89) sit inside the renegotiated `<120` budget | L×L | Budget raised to `<120` by the lead (`plan.md` Reconciled contracts #4) — no longer at risk. Phase 3's own gate is 38, and merging has already removed ~15 avoidable calls. `BatchedMesh` for props stays a **documented, unbuilt** Phase 9 escape hatch, triggered only if measured frame time misses the fps target, never by a draw-call count. | — |
| Flat-shaded plaster walls read as flat grey blocks with no edge definition | M×M | Hemi + rim light from Phase 1 give the faceted read; `eaveOverhang` casts a defining shadow line. If still flat, add a 0.02 m `woodDark` corner-post box per wall junction (~16 tris, merged into `walls-int`). | additive |
| `SHELL.ceilH` drifts from `RoomDef.height` | L×M | Build-time `console.assert(room.height === SHELL.ceilH)` for indoor rooms; cheap. | — |
| Z-fighting between slab top finish and wall bases | M×L | `floorFinish` box is inset 0.005 below the wall base; walls start at `FLOOR_Y[floor]`. | offset constant |
| `world/materials.ts` is a module not in `plan.md`'s contract | L×L | Additive, 25 lines, justified above. **Flagged to the lead.** | Inline the cache into `house-shell.ts` and re-export |
