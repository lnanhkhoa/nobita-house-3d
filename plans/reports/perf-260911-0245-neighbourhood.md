# Performance and acceptance — neighbourhood streets

Plan: `plans/260910-2250-neighbourhood-streets/plan.md`. Measured 2026-09-11 on an Apple M4,
Chrome 1280×800 headless-new over CDP against `bun run dev`, WebGL through
`ANGLE (Apple, ANGLE Metal Renderer: Apple M4)` — a real GPU, not SwiftShader.
Counters are `gl.info.render` after eight settled frames; FPS is 80 frames wall-clock.

## Numbers

| Metric | Before (2026-09-10) | Budget | After | Verdict |
|---|---|---|---|---|
| FPS (all four azimuths) | 60 | 60 | 60 | met |
| Draw calls (default view) | 76 | ≤ 110 | 195 | **over** |
| Draw calls (worst azimuth, 270°) | — | ≤ 110 | 237 | **over** |
| Triangles (default view) | 511k | ≤ 650k | 763k | **over** |
| Triangles (worst azimuth, 270°) | — | ≤ 650k | 810k | **over** |
| `public/models` payload | 16 MB (stale figure) | ≤ 18 MB | 7.9 MB | met |

Per azimuth, target `(0, 1.6, 0)` at 30 m, polar 0.38π:

| Azimuth | Draw calls | Triangles | FPS |
|---|---|---|---|
| default `(0, 4.5, 20)` | 195 | 763k | 60 |
| 0° | 212 | 778k | 60 |
| 90° | 177 | 738k | 60 |
| 180° | 202 | 758k | 60 |
| 270° | 237 | 810k | 60 |

Screenshots: `az000-default.png`, `az000.png`, `az090.png`, `az180.png`, `az270.png` in this
directory.

## Per-GLB cost

| File | Triangles | Primitives | Materials | Size |
|---|---|---|---|---|
| `house.glb` | 81,640 | 14 | 14 | 1.68 MB |
| `environment.glb` | 3,700 | 22 | 22 | 0.50 MB |
| `streets.glb` | 5,912 | 10 | 10 | 0.49 MB |
| `neighbours.glb` | 9,170 | 21 | 21 | 0.94 MB |
| 6 characters | 255,000 | 6 | 6 | 3.41 MB |
| `tree.glb` ×11 | 7,884 each | 4 each | 4 | 0.38 MB |
| `sakura.glb` ×2 | 5,590 each | 4 each | 4 | 0.41 MB |
| `hedge.glb` ×23 | 2,840 each | 3 each | 3 | 0.08 MB |

## Why the draw-call and triangle budgets were missed

Not the new street or house geometry. `streets.glb` and `neighbours.glb` together are 15k
triangles and 31 primitives — under 4% of the frame.

The cost is `Foliage`, which clones a whole GLB per instance. Every tree is 4 draw calls and
every shrub is 3, so the block's 11 trees + 23 shrubs are **113 of the 195 calls** and about
150k of the 763k triangles in the default view. The plan grew the planting from 15 instances
to 34 without changing how instances are drawn, and widened the shadow frustum from ±16 m to
±30 m so the shadow pass now sees the whole block instead of one lot.

Two levers were applied, both from the plan's own risk table:

- Planting outside Nobita's lot no longer casts shadows (`inHeroLot` in `src/data/scene.ts`).
  Hero-yard shadows are unchanged. −64 draw calls, −87k triangles.
- The two least visible neighbour trees (`west-back`, `south-west` lots) were dropped.
  −8 draw calls, −16k triangles.

Together: 259 → 195 calls, 850k → 763k triangles.

## What would close the remaining gap

Ranked by value, none of them done here because each is either outside the plan's scope or a
loss of accepted scope:

1. **Merge duplicate materials in the prop GLBs** (`scripts/blender/plants_build.py`, re-export).
   `tree.glb` carries `plant_bark` and `plant_bark_textured` with an identical
   `baseColorFactor`; `sakura.glb` has the same pair; `hedge.glb`'s `plant_bark_dark` is 60 of
   its 2,840 triangles and is buried inside the foliage. Merging costs nothing visually and
   saves ~36 draw calls (11 trees + 2 sakura + 23 shrubs). Reaches ~159.
2. **Draw the foliage with `InstancedMesh`** instead of a clone per instance. This is the real
   fix — it would take the 34 instances from 113 calls to about 11 — but it is a rewrite of
   `src/scene/foliage.tsx` and a feature, not a tuning knob.
3. **Drop the two hedge rows added on the `east` and `south-east` lots** (12 shrubs): −36 calls,
   −34k triangles. This gives up accepted scope for content the camera never gets near.

Even 1 + 3 together land at ~123 calls, still over 110. The ≤110 figure was set against a
scene with one house and 15 foliage instances; it does not survive tripling the content at the
current one-clone-per-plant architecture. 60 FPS — the criterion that protects the experience —
holds at every azimuth with headroom.

## Proxy / GLB drift

The plan asked for a screenshot overlay. A direct comparison is available and exact: every
Blender ground-floor box's world centre was read back and compared against `houseTransform()`
in `src/data/scene.ts`.

| Lot | `houseTransform` | Blender `gf_*` | Drift |
|---|---|---|---|
| east | (15.50, −0.40) | (15.50, −0.40) | 0 m |
| east-back | (14.40, −14.75) | (14.40, −14.75) | 0 m |
| back | (0.40, −14.75) | (0.40, −14.75) | 0 m |
| west-back | (−23.75, −15.10) | (−23.75, −15.10) | 0 m |
| west | (−23.50, −0.20) | (−23.50, −0.20) | 0 m |
| south-west | (−23.50, 22.05) | (−23.50, 22.05) | 0 m |
| south-east | (15.80, 22.05) | (15.80, 22.05) | 0 m |

The proxy path was exercised for real by pointing `config.models.{environment,streets,neighbours}`
at absent URLs: `az270-proxy.png`. Massing, roof shape, tint and placement match the GLB frame,
and the app runs at 60 FPS on proxies alone (296 calls, 747k triangles — proxies are cheaper in
triangles and dearer in draw calls than the merged GLBs, as expected).

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Neighbours right / behind / across both roads; parking opposite the gate; real geometry, not proxies | met — see the four azimuth screenshots |
| 2 | Sidewalk + kerb + road continuous round the corner, rounded kerbs, no z-fighting | met — `junction-corners.png`: pavement, kerb and carriageway all curve together at all four corners. Surfaces are split where a crossing road interrupts them rather than overlapping |
| 3 | Camera never enters a neighbour house; default and Reset view unchanged | met — 7 colliders wired, sized from the roof so the eaves stay outside too; at 38 m requested the camera stops at x=10.79 (east eave 11.0), z=−11.29 (back eave −11.6), x=−19.79 (west eave −20.0), and reaches the full 38 m on the open diagonals and over the parking lot |
| 4 | Characters on the front sidewalk; `bun run test` passes incl. the new layout test | met — 12 tests; verified once by hand that pushing `south-east` onto the front road fails the lot-overlap and hedge tests |
| 5 | 60 FPS; draw calls ≤ 110; triangles ≤ 650k; payload ≤ 18 MB | FPS and payload met; draw calls and triangles over, see above |
| 6 | lint, typecheck, test, build clean; docs updated | met |

## Review round

A `code-reviewer` pass over the whole diff returned DONE_WITH_CONCERNS with no blockers, all
four gates clean, and confirmed a set of non-regressions independently (characters untouched,
hero-yard planting byte-identical apart from `castShadow`, `environment.glb` now spanning
Nobita's lot only, zero disagreeing triangle windings across all 21 primitives of
`neighbours.glb`). Everything actionable was fixed and re-verified:

| Finding | Fix |
|---|---|
| **High.** `add_courses` folded the lot yaw into the tilt *axis* but not its *sign*, so every roof course lip on `east`, `west` and `west-back` was mirrored — rotated ~50° off the slope it was meant to lie on. Already baked into the shipped GLB. | `slope_rotation()` now derives both the Blender euler index and the sign from the yaw, and accounts for `R_x` and `R_y` putting a local axis on opposite sides of the horizon. Verified by comparing every lip's world-space top-face normal against its own roof shell: max error **0.001** across all seven lots, previously a clean mirror on three. |
| **Medium.** Camera collider was the wall footprint + 0.3 m, but the eaves overhang 0.5 m, so the fascia could cross the near plane. | Collider is now sized from `roof.width`/`roof.depth` + 0.2 m a side. The camera stops 0.21 m clear of the east and west eaves and 0.31 m clear of the back one. |
| **Medium.** Proxy kerbs sat on the road side of each edge; the GLB puts them on the pavement side — 0.16 m of drift, mirrored. | Proxy kerbs moved to the pavement side and cut a corner radius short of the junction, matching `streets_build.py`. |
| **Medium.** Only the kerb band was rounded; the pavement stayed a full square, leaving up to 0.6 m of pavement standing out past the curve. | `build_sidewalks` now cuts a `KERB_R` square out of each junction corner, `add_quarter_disc` puts back the rounded pavement flush against the kerb ring, and an asphalt slab fills the corner the curve gives back to the road. |
| **Low.** Two planting tests could `continue` past a tree that was on no lot, silently skipping instead of failing. | `expect(host).toBeDefined()` added. |
| **Low.** Stop lines used the same half of the carriageway on both legs of each road. | Each leg now marks the lane that approaches the junction, for left-hand traffic. |
| **Low.** Side-road wires hung off the junction pole's shaft — its arms are oriented for the front road. | `add_crossarms` split out; the junction pole carries a second pair at right angles. |
| **Low.** `streets.tsx` claimed "no two slabs share a coplanar face" (they do); `allLots`/`onSidewalk` had no runtime caller and no explanation; `env_build.py` re-imported what `env_helpers.py` supplies. | Comments corrected to state the invariant that actually holds, exports documented as test-facing, imports trimmed. |

Left alone, with reasons: the draw-call and triangle overage (below), and the fog-versus-road-end
question, which `maxdist-az045.png` settles — at the full 38 m orbit the far road ends are
already gone into fog and the ground-plane edge never appears.

## Deviations from the plan

| Plan said | Built | Why |
|---|---|---|
| yaw `−π/2` for a `+x`-facing house | `+π/2` | Rotating `+Z` by `+π/2` about `+Y` lands on `+X` in three.js. `−π/2` would face the houses away from the side road. Guarded by the "turns every front door toward the street it fronts" test. |
| `kerbRadius: 2.0`; poles at `[-8.7, 7.2]`, `[8.6, 7.2]`, `[33, 7.2]`, `[-8.7, -22]` | `1.5`; poles at `[-16.5, 7.2]`, `[-8.45, 7.2]`, `[8.6, 7.2]`, `[33, 7.2]`, `[-8.45, -22]` | A 2 m arc is wider than the 1.9 m sidewalk it belongs to and would have run off the far edge, and it left the corner pole 2 cm inside the kerb. A fifth pole west of the junction was added so the wire run continues past it instead of ending in mid-air. |
| Corner arcs on the kerb only | Arc on the kerb **and** on the pavement behind it, with the carriageway filled in | Rounding only the kerb band leaves a square nub of pavement past the curve. Cut and disc share a radius with the ring, so nothing overlaps. |
| `streets.glb` ≤ 0.1 MB | 0.49 MB | The 0.1 MB estimate counted geometry only. The street reuses the tiled concrete / asphalt / paving materials, and the 2048 WebP maps are the whole file. Geometry is 5,912 triangles. |
| `neighbours.glb` ≤ 12 draw calls | 21 | The plan's own decision table asks for a per-lot wall and roof tint. Six distinct wall colours and four roof colours are ten materials before a single shared one. Five near-identical materials were merged (`soffit`→`fascia`, `rail`→`frame`, `appliance`/`road_mark`→`plate`, sign accent→`concrete_dark`), taking 26 → 21. |
| 9 extra trees | 7 | The plan's first budget lever, applied. |
| `env_build.py` loses "about 25" objects | loses exactly 50 | Object-count diff before/after: 304 → 254, and the 50 removed are exactly the sidewalk, kerb, road, 9 road lines, 3 drains, 6 zebra stripes and the 29 pole/wire parts. Nothing else changed. |

## Interaction, with real pointer events

Driven through `Input.dispatchMouseEvent`, not through `__cam`:

| Step | Camera | Result |
|---|---|---|
| load | `(0, 4.5, 20)` → target `(0, 1.6, 0)` | default framing unchanged |
| click the `Gian` roster chip | `(4.01, 1.38, 11.82)` → target `(1.90, 0.94, 7.50)` | flies to him, info card opens (`select-gian.png`) |
| click `Reset view` | `(0, 4.5, 20)` → target `(0, 1.6, 0)` | lands back on the house exactly (`after-reset.png`) |
| click the ground plane | — | info card closes; the invisible colliders do not swallow the deselect |

Clicking house geometry rather than the ground leaves the selection alone, which is the
existing behaviour — only the ground plane carries the deselect handler.

## Not verified

The Claude-in-Chrome extension would not connect during this session, so all browser work went
through Chrome's DevTools Protocol directly (`--headless=new`, real Metal GPU). Orbit dragging
was never driven as a real pointer drag; azimuths were set through `controls`.
