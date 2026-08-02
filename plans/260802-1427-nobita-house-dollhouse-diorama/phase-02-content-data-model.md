---
phase: 2
title: "Content Data Model"
status: pending
priority: P1
dependencies: [1]
effort: "6h"
---

# Phase 2: Content Data Model

## Overview

Transcribe `plans/reports/research-260802-1427-nobita-house-canon-layout-and-hotspots-report.md` into typed, tested data. Pure data + types — **zero three.js imports** in `src/data/` so Vitest stays fast and Phases 3/4 can be developed against a frozen contract.

The report gives room *areas* but no coordinates, and its metre sizes do not tile any rectangle. This phase does the tessellation arithmetic and locks the result (§Architecture).

## Requirements

| # | Requirement | Verified by |
|---|---|---|
| R1 | `types.ts` matches `plan.md` §Type contract; `WallSpec` defined | `npm run typecheck` |
| R2 | 11 rooms tile a coherent plan matching `house-ground.webp` topology | T4 (no overlap) + T5 (exact tiling) |
| R3 | 65 `PropDef`s with `[x,y,z]` size + Rodin prompt | T1, T6 |
| R4 | 12 `HotspotDef`s with title + 2–4 sentence body | T2, T3, T7 |
| R5 | `palette.ts` = scene colours only | T8 |
| R6 | Vitest integrity suite green | `npm test` |

## Architecture

### Coordinate frame (contract — Phases 3–9 depend on this)

`+X` = east · `+Y` = up · `+Z` = south. Standard right-handed three.js. Plan-view maps 1:1 onto `house-ground.webp`: **image right → +X, image down → +Z**.

> **Deviation from `plan.md`.** `plan.md` says "origin = diorama SW corner". In a right-handed frame with `+X`=east and `+Y`=up, `+Z` is necessarily *south*, so the min-X/min-Z corner is the **NW** corner, not SW. Origin `(0,0)` = **NW corner of the house block**. This is a labelling correction; footprints stay all-positive and nothing else changes. The yard is the one room with negative coordinates (it surrounds the house).

Module `u = 0.91 m` = half a tatami mat. Every dimension below is an integer multiple of `u`.

### Ground-floor tessellation — house block `7.28 × 8.19 m` (59.62 m²)

Columns: **A** west `x 0→3.64` (main tatami rooms) · **B** `x 3.64→5.46` (circulation spine) · **C** east `x 5.46→7.28` (services).
Rows: **1** `z 0→2.73` (north) · **2** `z 2.73→5.46` · **3** `z 5.46→8.19` (south).

| Room id | cell | x | z | w | d | m² | ≈ jo | canon jo | image check |
|---|---|---|---|---|---|---|---|---|---|
| `gf-kitchen` | A1+B1+C1 | 0.00 | 0.00 | 7.28 | 2.73 | 19.87 | 12 | 4 | 厨房 spans the full north row (tatami + corridor + service columns) ✓ |
| `gf-living` | A2 | 0.00 | 2.73 | 3.64 | 2.73 | 9.93 | 6 | 6 ✓ | 起居室, centre ✓ |
| `gf-guest` | A3 | 0.00 | 5.46 | 3.64 | 2.73 | 9.93 | 6 | 6 ✓ | 会客室, bottom ✓ |
| `gf-stairs` | B2–B3 | 3.64 | 2.73 | 1.82 | 5.46 | 9.94 | 6 | 2 | 去二楼, south two-thirds of the wood corridor ✓ |
| `gf-bath` | C2 | 5.46 | 2.73 | 1.82 | 2.73 | 4.97 | 3 | 1.5 | ofuro + basin + toilet stack, starts level with 起居室 — approximate, see SC-1 |
| `gf-genkan` | C3 | 5.46 | 5.46 | 1.82 | 2.73 | 4.97 | 3 | 1.5 | 玄关, bottom-right ✓ |

Sum (exact) `19.8744 + 9.9372×3 + 4.9686×2 = 59.6232` = `7.28 × 8.19` ✓ **exact tiling, zero gaps, zero overlaps.** (Row-1 cells A1/B1/C1 all belong to `gf-kitchen`; row-2/row-3 cells are unchanged from a plain per-cell split, so every one of the 9 coarse `u`-grid cells is assigned to exactly one room — verified by direct enumeration, not just the area total.)

Deviations from canon jo counts, with reason: `gf-kitchen` absorbs the corridor and service cells of row 1 (the reference draws 厨房 spanning the full width at the top, over both the tatami and corridor/service columns); `gf-stairs` is confined to the south two-thirds of the corridor column (still one continuous wood run, just shorter — the north third now belongs to the kitchen; this does not by itself fix the stair-run/`2f-landing` slab collision, since the physical run's `z`-range is unchanged — see `phase-03`'s stairwell-void fix for that); `gf-bath` starts level with `gf-living` instead of reaching the north wall (matching the reference, where the ofuro/basin/toilet stack begins alongside 起居室, not at the top); `gf-genkan` keeps its canon C3 footprint unchanged — the earlier note that it was "enlarged" to fit `prop-27` was wrong (see Prop size axis order below): the step is transposed to run along the room's 2.73 m depth instead of its 1.82 m width, and T8 is left tight. The three canon 6-jo rooms (`gf-living`, `gf-guest`, `2f-nobita`) are exact.

### Second floor — block `5.46 × 5.46 m` (29.79 m²), sits on columns A+B

| Room id | x | z | w | d | m² | canon check |
|---|---|---|---|---|---|---|
| `2f-parents` | 0.00 | 0.00 | 3.64 | 2.73 | 9.93 | above `gf-kitchen` ✓ |
| `2f-nobita` | 0.00 | 2.73 | 3.64 | 2.73 | 9.93 | **exactly above `gf-living`** ✓ (canon requirement) |
| `2f-hall` | 3.64 | 0.00 | 1.82 | 3.64 | 6.62 | links landing → both rooms ✓ |
| `2f-landing` | 3.64 | 3.64 | 1.82 | 1.82 | 3.31 | sits at the top of the stair run ✓ |

Sum `29.79` = `5.46 × 5.46` ✓. `2f-parents` is 5.5 jo, not canon 8 — enlarging it would push the 2F outside the ground rectangle and force a second roof gable. Rejected: one gable is worth more than 2.5 jo nobody can measure in a dollhouse.

Column C (`gf-bath`, `gf-genkan`) and row 3 of columns A+B (`gf-guest`, south `gf-stairs`) are **single-storey** → Phase 3 covers them with lean-to roofs. This matches the reference, which draws several separate roof planes.

### Yard / lot

`gf-yard` `{ x: -4.55, z: -2.73, w: 13.65, d: 13.65 }` — the whole 186 m² lot (canon "~15 × 12"). Set `outdoor: true`; the overlap test excludes it (it deliberately contains the house). Yard strips: west 4.55 m (trees + laundry), north 2.73 m (shed at NW, matching 仓库), east 1.82 m, south 2.73 m (street approach to the genkan).

`FLOOR_Y = { ground: 0, second: 2.55 }` (2.40 ceiling + 0.15 slab). Exported from `rooms.ts`; Phase 3 and 4 both read it — do not re-derive.

### `WallSpec` (my definition — Phase 3 and 5 consume it)

```ts
export type WallSide = 'north' | 'east' | 'south' | 'west';   // north = -Z, east = +X, south = +Z, west = -X

/** Rectangular hole, normalised: u along wall length (0 at the side's min-coord end), v up from floor. */
export interface WallOpening { u0: number; u1: number; v0: number; v1: number; }

export interface WallSpec {
  side: WallSide;
  kind: 'solid' | 'opening' | 'none';   // 'none' = no wall at all (open plan / doorless span)
  openings?: WallOpening[];             // required non-empty iff kind === 'opening'
  exterior?: boolean;                   // true = far face is outdoors → plaster material + cutaway candidate
}
```

Why normalised `u/v` rather than metres: a wall's length is derived from the footprint, so metre offsets would have to be re-checked every time a room is resized. Fractions survive resizing. Four numbers cover every opening we have (shoji, fusuma, window, doorway) — no arch/round support, YAGNI.

`exterior` is **authored**, not computed, so Phase 3 needs no adjacency solver. T9 cross-checks it against the footprints.

### Type-contract additions (beyond `plan.md`)

All optional; nothing in `plan.md` changes shape.

| Addition | Why |
|---|---|
| `RoomDef.outdoor?: boolean` | `gf-yard` must be excluded from the overlap test, gets no ceiling/roof, and needs no walls. Flagging beats special-casing the id in three modules. |
| `PropDef.count?: number` (default 1) | The report ships one row for *N* objects (4 zabuton, 3 jars, 2 trees, 4 shrubs). Without this the layout can only place one. |
| `PropDef.builtBy?: 'shell'` | 11 report rows are house structure, not props (see below). Phase 3 owns their geometry; the registry must skip them or we draw them twice. |
| `PropDef.asset?: AssetMeta` | `AssetMeta` has no home in `plan.md`'s module list. Co-locating it with the prop is the DRY choice. |
| `HotspotDef.anchorWorld?: [number,number,number]` | Hotspot 12 (roof) points at `prop-47`, which is shell-built and has no prop object. One escape hatch, one user. |

### Shell-owned rows (`builtBy: 'shell'`) — **11 of 65**

`prop-06` `prop-14` `prop-31` `prop-55` (tatami — Phase 3 gives each room a floor material) · `prop-56` `prop-57` (wood floors) · `prop-19` `prop-20` (staircase + railing) · `prop-44` (fence) · `prop-47` (roof) · `prop-48` (exterior wall).

→ `PROPS.length === 65`, `PLACEABLE_PROPS.length === 54`, placed object count (with `count`) = **63**.

> **Contract for Phases 4/7/8/9:** the "65 models" figure in the loading veil and editor list is `PLACEABLE_PROPS.length` (54), **not** a literal 65. Read it from the data.

### Prop size axis order

`PropDef.size = [x, y, z]` = **[width, height, depth]**, three.js Y-up. The report's table is `W × D × H` for volumetric props but `W × H × T` for flat vertical panels — it is inconsistent, so each row is transposed by hand.

| Report row | Report triple | Class | `size` |
|---|---|---|---|
| `prop-01` desk | 1.2 × 0.6 × 0.8 | volumetric W·D·H | `[1.2, 0.8, 0.6]` |
| `prop-24` fridge | 0.5 × 0.5 × 1.4 | volumetric W·D·H | `[0.5, 1.4, 0.5]` |
| `prop-04` futon | 1.0 × 2.0 × 0.2 | volumetric W·D·H | `[1.0, 0.2, 2.0]` |
| `prop-15` shoji door | 1.2 × 2.0 × 0.05 | **panel W·H·T** | `[1.2, 2.0, 0.05]` |
| `prop-38` mirror | 0.5 × 0.5 × 0.02 | **panel W·H·T** | `[0.5, 0.5, 0.02]` |
| `prop-27` genkan step | 2.0 × 1.2 × 0.15 | volumetric W·D·H, **transposed** | `[1.2, 0.15, 2.0]` — `gf-genkan` is only 1.82 m wide (X) but 2.73 m deep (Z); swap W/D so the 2.0 m run lies along Z. T8: `size[0]=1.2 ≤ 1.62 ✓`, `size[2]=2.0 ≤ 2.53 ✓` |
| `prop-42` tree | 2.0 dia × 3.5 h | diameter × height | `[2.0, 3.5, 2.0]`, `count: 2` |
| `prop-41` clothesline | 3.0 × 0.01 × 0.0 | **invalid, 0-height** | `[3.0, 0.02, 0.02]` |
| `prop-63` wall art | 0.5 × 0.3 (2 values) | **incomplete** | `[0.5, 0.3, 0.02]` |
| `prop-64` "Various" room | — | **unresolvable roomId** | `roomId: '2f-nobita'` |

`PANEL_PROPS` = ids `05 15 30 33 38 46 49 50 52 62 63` — flat vertical panels. T6 asserts `y` is the largest axis for these, catching a mis-transposed row.

## Related Code Files

| Path | Action | Notes |
|---|---|---|
| `src/data/types.ts` | extend (Phase 1 seeded `FloorId`) | full contract + additions above |
| `src/data/rooms.ts` | create | 11 `RoomDef` + `FLOOR_Y` + `HOUSE_BOUNDS` + `LOT_BOUNDS` |
| `src/data/props.ts` | create | 65 `PropDef` + `PLACEABLE_PROPS` |
| `src/data/hotspots.ts` | create | 12 `HotspotDef` |
| `src/data/palette.ts` | create | scene colours only |
| `src/data/data-integrity.test.ts` | create | T1–T9 |

## Implementation Steps

1. **`types.ts`** — paste `plan.md` §Type contract verbatim, add `WallSpec`/`WallSide`/`WallOpening` and the 5 optional additions. Keep `HotspotDef.propId` **required**.
2. **`rooms.ts`** — the two tables above, literally. Export `FLOOR_Y`, `HOUSE_BOUNDS = {x:0,z:0,w:7.28,d:8.19}`, `LOT_BOUNDS = gf-yard.footprint`. `height: 2.4` for all indoor rooms; `gf-yard.height: 0`, `walls: []`, `outdoor: true`.
3. **Author `walls[]` per room.** Rule: a room declares all four sides. `exterior: true` where the side lies on the house-block boundary. Ownership of every interior boundary is **authored here, explicitly, per side** — Phase 3's builder does not infer it from position (north/west vs south/east); it just builds a wall for every side with `kind !== 'none'` and trusts that exactly one of the two rooms on each interior boundary declares it (T9 enforces the "exactly one" invariant; Phase 3 SC-7 re-checks it on the built geometry). Because `gf-kitchen` now spans the full north row (three former cells), its single `south` `WallSpec` is the one wall that fronts `gf-living`, `gf-stairs` **and** `gf-bath` at once — one merged mesh, one opening (the shoji to living), solid elsewhere — so all three of those rooms declare `north: 'none'`.

   Ground floor (openings are fractions of *that side's own length*):
   | Room | side | kind | openings | exterior |
   |---|---|---|---|---|
   | `gf-kitchen` | north | `solid` | — | ✓ |
   | `gf-kitchen` | west | `opening` | sliding glass to yard `u .30–.80, v 0–.80` | ✓ |
   | `gf-kitchen` | east | `solid` | — | ✓ |
   | `gf-kitchen` | south | `opening` | shoji to living `u .125–.375, v 0–.85`; solid elsewhere (fronts `gf-stairs` + `gf-bath` too) | – |
   | `gf-living` | north | `none` | — (`gf-kitchen` owns) | – |
   | `gf-living` | west | `opening` | window `u .30–.70, v .35–.80` | ✓ |
   | `gf-living` | east | `opening` | doorway to corridor `u .30–.70, v 0–.85` | – |
   | `gf-living` | south | `opening` | fusuma to guest `u .20–.80, v 0–.85` | – |
   | `gf-guest` | north | `none` | — (`gf-living` owns via its south) | – |
   | `gf-guest` | west | `opening` | window `u .35–.75, v .35–.80` | ✓ |
   | `gf-guest` | south | `solid` | — | ✓ |
   | `gf-guest` | east | `solid` | — (reached via `gf-living`'s fusuma, not directly off the corridor) | – |
   | `gf-stairs` | north | `none` | — (`gf-kitchen` owns) | – |
   | `gf-stairs` | west | `none` | — (`gf-living` + `gf-guest` own their own portions via their east sides) | – |
   | `gf-stairs` | east | `none` | — (`gf-bath` + `gf-genkan` own their own portions via their west sides) | – |
   | `gf-stairs` | south | `solid` | — | ✓ |
   | `gf-bath` | north | `none` | — (`gf-kitchen` owns) | – |
   | `gf-bath` | west | `opening` | doorway from corridor `u .30–.70, v 0–.85` | – |
   | `gf-bath` | south | `solid` | — | – |
   | `gf-bath` | east | `solid` | — | ✓ |
   | `gf-genkan` | north | `none` | — (`gf-bath` owns via its south) | – |
   | `gf-genkan` | west | `opening` | doorway from corridor `u .25–.75, v 0–.90` | – |
   | `gf-genkan` | south | `opening` | front door `u .25–.75, v 0–.85` | ✓ |
   | `gf-genkan` | east | `solid` | — | ✓ |

   Second floor: `2f-nobita` south = `opening`, window `u .30–.70, v .35–.80`, exterior; others follow the same pattern — `solid` on every side on the second-floor block's boundary, `none` on whichever side of a pair a room defers to its neighbour. Not tabulated in full here (no acceptance criterion depends on a specific 2F doorway), but T9's "exactly one declares it" rule still applies.

   `gf-living`'s east (corridor) and south (guest/fusuma) declarations are the two walls that the old room-first builder used to drop — Phase 3 SC now asserts both exist (see phase-03 §Success Criteria).
4. **`props.ts`** — 65 rows transcribed from report §2. `rodinPrompt` copied verbatim, plus a shared suffix constant appended at build time, not baked per row:
   ```ts
   export const RODIN_STYLE_SUFFIX =
     ', low-poly, flat shading, faceted, matte, no text, single object, centred, neutral background';
   ```
   (DRY — one edit re-styles all 65 prompts. Directly mitigates the "style drift" risk in `plan.md`.)
   Set `hotspot` on the 12 carrier props, `count` on `prop-17`(4) `prop-26`(3) `prop-42`(2) `prop-43`(4), `builtBy: 'shell'` on the 11 listed.
5. **`hotspots.ts`** — 8 Tier-1 + 4 Tier-2 from report §3. **English body only** — `plan.md` and `docs/tech-stack.md` both fix the UI to English with no i18n layer; the report's Vietnamese strings are dropped (re-add only if i18n is ever scoped). Tier-2 anchors:
   | id | title | propId | note |
   |---|---|---|---|
   | `hs-parents-room` | The Heart of Parental Comfort | `prop-51` | parents' futon |
   | `hs-kitchen` | Where Tamako Cooks | `prop-21` | kitchen counter |
   | `hs-living` | Center of Home Life | `prop-16` | TV set |
   | `hs-roof` | Classic Japanese Gable Roof | `prop-47` | shell-built → needs `anchorWorld` at the ridge, `[2.73, 6.65, 2.73]` |
   Ids are kebab-case semantic (`hs-desk`, `hs-doraemon`, …), not `hs-01` — they appear in URLs and `aria` text.
6. **`palette.ts`** — 8 architectural + 5 character colours as `0x` numbers plus a `PaletteKey` union:
   ```ts
   export const PALETTE = {
     tatami: 0xa8c686, woodLight: 0x8b6f47, woodDark: 0x5c4a3c, kawara: 0xc85a3a,
     plaster: 0xe8dcc8, tile: 0xd3d3d3, grass: 0x6b8e23, sky: 0x87ceeb,   // 8 architectural
     doraBlue: 0x0080ff, doraRed: 0xe63946, white: 0xffffff, gold: 0xffd700, shadow: 0x4a4a4a,
   } as const;
   export type PaletteKey = keyof typeof PALETTE;
   ```
   > **Deviation from brief.** The brief asked for the UI tokens here too. Rejected: `docs/design-guidelines.md` §3 is already the single source and Phase 1 pastes it into `src/style.css`. Every UI surface is DOM/CSS — nothing needs those hex values in JS. Duplicating them into TS creates a two-place-to-edit palette. If a future canvas-drawn UI element needs one, it reads `getComputedStyle(document.documentElement).getPropertyValue('--accent-600')`.
7. **`data-integrity.test.ts`** — T1–T9 below. Pure imports, no three.js.

## Success Criteria

- [ ] `npm test` green, 9 suites:
  - [ ] **T1** ids unique across `ROOMS` (11), `PROPS` (65), `HOTSPOTS` (12); every id matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`.
  - [ ] **T2** every `PropDef.roomId` resolves to a `RoomDef`.
  - [ ] **T3** every `HotspotDef.propId` resolves to a `PropDef`; where that prop has `builtBy === 'shell'`, `anchorWorld` is present.
  - [ ] **T4** round-trip: `PROPS.filter(p => p.hotspot)` ↔ `HOTSPOTS` is a bijection — same cardinality (12), and `HOTSPOTS.every(h => PROPS.find(p => p.id === h.propId)!.hotspot === h.id)`.
  - [ ] **T5** no two non-`outdoor` rooms overlap on the same `floor` (AABB test, exclusive bounds).
  - [ ] **T6** per floor, `Σ(w·d)` of non-outdoor rooms equals the floor's bounding-box area within `1e-6` — proves an exact tiling with no gaps (ground `59.6232`, second `29.8116` — `5.46²`; not `29.7916`, which is the sum of the *rounded* per-room display figures and not the true value).
  - [ ] **T7** every `size` component `> 0.005`; for `PANEL_PROPS`, `size[1]` is the strict max.
  - [ ] **T8** every non-shell prop's XZ footprint fits its room: `size[0] <= room.w - 0.2 && size[2] <= room.d - 0.2` (0.1 m wall clearance each side); `size[1] <= room.height` for indoor rooms.
  - [ ] **T9** wall integrity: each room declares exactly 4 `WallSpec`s, one per side, no duplicate sides; `kind === 'opening'` ⇒ `openings?.length > 0` and every opening has `0 <= u0 < u1 <= 1`, `0 <= v0 < v1 <= 1`; `exterior === true` ⇒ that side lies on the house-block boundary; every interior boundary between two rooms is declared by exactly one of them.
- [ ] `PALETTE` has exactly 13 keys, 8 of which are the architectural set.
- [ ] `PLACEABLE_PROPS.length === 54`; `PLACEABLE_PROPS.reduce((n,p)=>n+(p.count??1),0) === 63`.
- [ ] `npm run typecheck` clean; `grep -r "from 'three'" src/data/` returns nothing.
- [ ] `npm test` wall-clock < 2 s (proves the no-three.js rule is holding).

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Tessellation drifts from the reference art and the house stops looking like Nobita's | M×H | Topology (kitchen N / living centre / guest S / corridor spine / bath+genkan E) is checked cell-by-cell against `house-ground.webp` in the table above. Phase 3 acceptance is a side-by-side screenshot. | Coordinates are 6 table rows in one file; re-tiling is a data edit, not a code change |
| T8 fails for a prop the report over-sized (e.g. `prop-21` counter 2.0 m) | H×L | Expected — T8 is a *design* gate. Fix by shrinking `size`, not by loosening the test. `prop-21` at 2.0 in a 3.64 room passes. | — |
| 65→54 placeable props contradicts "65 props" in `plan.md` global acceptance and design-guidelines copy | H×M | Data keeps all 65 ids so nothing is lost; only the *loadable* set shrinks. Flagged to the lead. Phases 7/9 must read `PLACEABLE_PROPS.length`. | Drop `builtBy` and let Phase 3 skip roof/floor/stairs instead — but that duplicates geometry (DRY violation) |
| `outdoor` / `count` / `builtBy` additions ripple into Phases 5–9 | M×M | All optional with safe defaults; a consumer that ignores them still compiles and behaves as if every prop is `count: 1` and placeable. | Delete fields; only `prop-registry` and the overlap test care |
| Hotspot bodies are 4 report paragraphs that exceed the card's `max 62ch × ~8 lines` | M×L | Trim to 2–4 sentences during transcription; T-none (subjective) — checked visually in Phase 6. | edit strings |
| Canon conflict: 1979 vs 2005 parents'-room floor | L×L | Report already resolved to 1979; recorded in `plan.md`. Moving it is a one-row `floor` change. | one field |
