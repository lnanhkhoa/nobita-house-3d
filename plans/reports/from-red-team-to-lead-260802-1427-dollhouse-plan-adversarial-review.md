# Red-team review — Nobita's House dollhouse plan

Scope: `plan.md` + 9 phase files + `docs/tech-stack.md` + `house-ground.webp`. Greenfield; no source exists. Claims verified by running the real tooling, not by reading the plan back to itself.

## Verified sound (do not re-litigate)

1. **Phase 4's CLI table is accurate.** Installed `@gltf-transform/cli@4.4.2`, ran `help` on all five commands. `weld` has **zero** command-specific options (no `--tolerance`). `inspect --format` is `one of "pretty","csv","md", default: "pretty"` — **no JSON**. `simplify` = `--ratio`/`--error`/`--lock-border`; `--ratio` is "Target ratio (0–1) of vertices to keep". `resize` = `--width`/`--height`/`--filter` (+ undocumented-in-plan `--pattern`, `--power-of-two`). `meshopt --level` = `one of "medium","high", default: "high"`. **The custom GLB header parser is justified**; `accessor.count` does survive `EXT_meshopt_compression` in the JSON chunk. Chain order weld→simplify→resize→meshopt is valid.
2. **plan.md's "Still unverified" camera-controls item resolves YES.** In `camera-controls@3.1.2`, `update(delta)` has no `_enabled` guard, and the `enabled` setter's `cancel()` only clears `_state`/`_activePointers` for *user dragging* — it never touches `_sphericalEnd`/`_targetEnd`. A `setLookAt` transition keeps damping while disabled. `_createOnRestPromise` attaches a listener to the `rest` event, so `Promise.all([setLookAt, setFocalOffset])` resolves correctly. Delete Phase 5 step 1's smoke check; **keep** `flyTimeoutMs` (it covers the hidden-tab rAF stall, a different failure).
3. **Both tessellations are exact.** Verified numerically: ground = 59.6232 = 7.28×8.19, zero pairwise overlap; second = 29.8116 = 5.46², zero overlap; every dimension an integer multiple of u=0.91; `2f-nobita` exactly over `gf-living`; yard strips sum to 13.65 on both axes.
4. **Roof/hotspot coordination agrees across phases.** Phase 3 ridge = 4.95 + 2.73·tan32° = 6.656; Phase 2 `hs-roof.anchorWorld` = `[2.73, 6.65, 2.73]`. Independently derived, consistent.
5. **Wireframe line citations are real** (desktop.html 501 lines; 403–413 = pins, 452–495 = editor; mobile.html 313–321 = sheet). Not phantom.
6. **All pinned versions exist on npm today**: vite 8.2.0, typescript 7.0.2, @biomejs/biome 2.5.6, vitest 4.1.10, three 0.185.1, camera-controls 3.1.2, lil-gui 0.21.0, @types/three 0.185.3.

## BLOCKER

**B1 — Phase 3's wall-ownership rule contradicts Phase 2's authored data; interior partitions never get built.**
`phase-03` step 4: "a room builds `north`/`west` unconditionally; `south`/`east` only when `spec.exterior`." `phase-02` step 3 authors `gf-living.east: opening` (to corridor) and `gf-living.south: opening` (fusuma) — neither exterior, so the builder **skips both** — while the rooms the rule says own those boundaries (`gf-stairs.west`, `gf-guest.north`) are authored `none` → nothing built. Result: no wall between living↔corridor or living↔guest, and the same hole for every boundary Phase 2 assigned to the south/east room. Neither gate catches it: T9 asserts "declared by exactly one" (passes); SC-7 asserts no *duplicates*. Missing walls are invisible to both.
**Fix:** delete step 4's rule; the builder iterates the authored `WallSpec` verbatim (build anything `kind !== 'none'`), with T9 as the sole dedupe gate. Add an SC asserting `builtWallCount === count(specs where kind !== 'none')` so a missing wall fails a test.

**B2 — Phase 8's exporter drops the instance index; multi-instance props collapse on reload.**
`phase-08` `toEntry()` returns `{propId, position, rotationY, scale}` — no `instance`; `exportLayout` sorts by `propId` only. `phase-04` keys instances `${id}#${index}` and resolves `${propId}#${instance ?? 0}`. Four props have `count > 1` (prop-17 ×4, prop-26 ×3, prop-42 ×2, prop-43 ×4 = 13 instances): export writes 4 rows all keyed `prop-17#0`, the loader applies the last, the other three fall back to auto-placement. Silent data loss through the exact round-trip the plan calls "verbatim". The round-trip test ("65 generated entries") cannot catch it — one entry per propId.
**Fix:** emit `instance` from `o.userData.instanceKey`; sort by `instanceKey`; test over 63 instances including all four `count>1` props.

## HIGH

**H1 — `roomAzimuth` scoring picks the worst direction.** `phase-05`: "score by (clearance to house AABB face) + 2.0 if opening; pick argmax". Clearance is *larger* in the direction with more house in the way. `gf-kitchen`: −Z clearance 0, +Z 5.46 → argmax = south → camera looks north through living **and** guest. `gf-bath`: +X 0, −X 5.46 → looks east through the corridor and two partitions. No automated gate catches this: the test only asserts the camera is outside `houseBox` (guaranteed by the clamp) and ≥20° off a wall axis. **Fix:** score by shortest traversal to the exterior (invert the term), and add an assertion that the ray `framePose().position → room centre` hits zero wall meshes belonging to other rooms.

**H2 — `houseBox(rooms)` includes `gf-yard`, making two acceptance criteria mutually unsatisfiable.** `phase-05` step 2 unions *all* rooms; `gf-yard` is 13.65×13.65 at (−4.55, −2.73). The step-8 clamp then pushes every camera outside a ~13.9 m box and `setBoundary` becomes 38 m — no room jump can satisfy "room fills ≥45% of the uncovered canvas rect". Phase 2 exports `HOUSE_BOUNDS`/`LOT_BOUNDS`; Phase 5 references neither. Also `houseBox` tops out at 4.95 while Phase 3's ridge is 6.66, so the clamp cannot keep the camera out of the roof. **Fix:** union `!room.outdoor` only (or read `HOUSE_BOUNDS`); raise max.y to ridge height for the clamp.

**H3 — Nothing hides second-floor props on the 2F toggle.** `phase-05` R5.2 promises "hides its walls, floor slab, **props** and pins", but step 5 builds the controller from `houseShell` only. Pins are covered (`phase-06` step 5 `refilter()`); props are owned by nobody → desk, futon and Doraemon float in mid-air. **Fix:** Phase 4 parents each `PropInstance.object` under `props-ground`/`props-second` groups — which also supplies the identity-transform `propsGroup` Phase 8 already asserts on — and Phase 5 flips those groups.

**H4 — Phase 6 never implements the `anchorWorld` path.** plan.md Reconciled #8 claims "no second code path in Phase 6". `phase-06` §Anchor resolution has exactly one path (`def.anchor ?? …` then `obj.localToWorld`), and `hs-roof` targets `prop-47`, which is `builtBy:'shell'` and therefore **absent from the registry** (`phase-04`: "skips `builtBy === 'shell'` entirely"). `obj` is undefined → crash or a silently missing 12th pin. Step 1's "fail loud" only checks `PropDef` existence, which passes. **Fix:** 3 lines — if `def.anchorWorld`, use it verbatim and skip the registry lookup; SC: 12 pins mount with an empty `public/models/`.

**H5 — Phase 5 redeclares `export const CAMERA`.** `phase-01` step 7 already exports `CAMERA = {fov, near, far, start}` **and** `CONTROLS = {smoothTime: 0.35, minDistance: 2.5, maxDistance: 30, …}`. `phase-05` says "append `export const CAMERA = {…, smoothTime: 0.35, minDistance: 2.5, maxDistance: 42, …}`" — a redeclaration (TS2451), not an append, duplicating three `CONTROLS` keys with a **conflicting** `maxDistance` (30 vs 42). **Fix:** extend `CONTROLS`; put framing-only tunables in a new `FRAMING` block.

**H6 — Literal `65` in Phases 7/8/9 violates Reconciled contract #5.** `phase-07` renders `"n / 65 models"` and announces `'Loaded, 65 of 65 models'` while `phase-04` SC-8 sets `total: 63` → the veil reads "63 / 65" then announces "65 of 65". `phase-09` asserts `propRegistry.size === 65` (it is 63). `phase-08` R8.4 lists "65 props" in the placement editor, 11 of which are `builtBy:'shell'`, have no `PropInstance`, and cannot be selected. **Fix:** veil reads `appState.loading.total`; editor reads `PLACEABLE_PROPS`; Phase 9 asserts against `PLACEABLE_PROPS.reduce((n,p)=>n+(p.count??1),0)`.

## MEDIUM

**M1 — Phase 2's second-floor area constant is wrong; T6 fails on day one.** Plan says "Sum `29.79` = 5.46 × 5.46 ✓"; T6 hardcodes `29.7916`. Actual: **29.8116**. `29.79` is the sum of the *rounded* per-room figures (9.93+9.93+6.62+3.31); `29.7916` dresses that artefact in four spurious decimals. Ground's 59.6232 is correct. The risk is the reflex — an implementer hitting a red T6 loosens the tolerance instead of fixing the constant. **Fix:** T6 compares Σ to the computed bbox area (as its own prose says) and never to a literal; delete both parentheticals.

**M2 — Exterior-wall count is 19, not 16; SC-5's `≤ 34` fails as written.** Enumerating the house boundary under Phase 3's own rule: ground = 3 N + 3 W + 3 S + 2 E = **11** (table says 10); second = 2 per side = **8** (table says 6). Shell total 35, +1 for the ridge cap (plaster ≠ kawara). **Fix:** correct the table to 19 and set SC-5 to `≤ 40`. Still far inside `<120`; the gate is mis-set, not the budget.

**M3 — The stair run collides with the `2f-landing` slab; no stairwell void is specified.** Run occupies z 3.64→6.19; `2f-landing` occupies z 3.64→5.46 at y 2.40–2.55. At z=4.5 the treads are at ~1.69 m with 0.71 m headroom; by z≈3.8 they intersect the slab. The run passes *under* the landing and surfaces in `2f-hall`. Step 3 builds one solid merged slab per room, no opening. **Fix:** move the run to the single-storey southern part of `gf-stairs` (z 8.19 → 5.64) — a constants-only change — or subtract a stairwell rect from the landing slab.

**M4 — The three roof planes do not close at the SE valley.** Along the shared line x=5.46, z 5.46→8.19: region S's edge runs 2.98 m (at z=5.46) down to 2.40 m, while region E's high edge is a constant 2.79 m. They cross — an open slit up to 0.19 m at one end, an intersecting overlap at the other, directly over `gf-genkan`. **Fix:** split region E at z=5.46, or extend region S to x=7.28 and shorten region E to z 0→5.46. Call it out in SC-1.

**M5 — `framePose` mixes real and effective aspect, then double-corrects.** Step 4 uses `effW/effH` as the aspect (the camera's real aspect is `w/h`); step 5 then multiplies by `max(w/effW, h/effH)`. With only a bottom inset (mobile) the errors cancel; with only a left inset (desktop rail) `distV` is over-scaled by ~1.26 at 1440 px, shrinking the room ~26% linearly — against an SC of "≥45% of the uncovered rect". **Fix, one consistent model:** `kx=effW/w; ky=effH/h; distV=halfH/(tan(fovY/2)·ky); distH=halfW/(tan(fovY/2)·(w/h)·kx); dist=max·padding+halfD`. Delete step 5.

**M6 — `focalOffset` units contradict between Phase 5's own sections.** §Framing step 6 says "in **px**, converted to world units by the caller"; §Fly-to passes `pose.focalOffset.x/y` straight into `setFocalOffset`, a world-unit API — the camera would be flung hundreds of metres. The quoted conversion is also the *horizontal* world-per-px; the y component needs `py/h · 2·dist·tan(fovY/2)` with no aspect factor. **Fix:** return world units for both axes with the correct per-axis conversion; add a unit test bounding the offset magnitude.

**M7 — Phase 8 specifies `eslint.config.js` in a Biome project.** `phase-01` D1 chose Biome 2.5.6 (`lint: biome check .`); no ESLint exists, so the `no-restricted-imports` rule and its SC are inert. **Fix:** express it as Biome `noRestrictedImports` in `biome.json`, or drop it and rely on Phase 9's `assert-prod-split.mjs`, which is the gate that actually bites.

**M8 — Two copies of the design-token block, and nobody deletes the first.** `phase-01` step 6 creates `src/style.css` with the §3 `:root` block verbatim (imported by `main.ts`); `phase-07` creates `src/ui/tokens.css` with the same block verbatim (imported by `ui-root.ts`) and diffs *it* against the doc. Neither is in plan.md's module contract. **Fix:** Phase 7 deletes `src/style.css` and absorbs its three global rules; list it as a delete.

**M9 — Phase 8's "unplaced prop" does not exist at runtime.** Step 6 places an unplaced prop at the camera target "otherwise it is invisible and un-draggable", but `phase-04`'s auto-placement already positions **every** instance deterministically inside its room. Nothing is ever invisible; step 6 would teleport a correctly-placed prop. **Fix:** select in situ and mark dirty; keep the filter, drop the reposition.

**M10 — Phase 8's undo SC is self-contradictory.** "60 drags then 60 undos returns every prop to its start transform; `undoStack.length === 50` (bounded)." With depth 50 the first 10 commits are gone. **Fix:** "60 drags then 60 undos restores the last 50; the 51st undo is a no-op."

**M11 — Phase 2's reason for enlarging `gf-genkan` is arithmetically false, and T8 fails on it.** "enlarged so the 2.0 m-wide entrance step (`prop-27`) fits" — `gf-genkan.w` is **1.82**, and T8 requires `size[0] ≤ 1.62`. **Fix:** transpose `prop-27` to run along the 2.73 m depth (which is what the reference draws). Do not loosen T8.

**M12 — T9 requires 4 `WallSpec`s per room; step 2 gives `gf-yard` `walls: []`.** Direct self-contradiction; T9 fails on the yard. **Fix:** T9 skips `room.outdoor`.

**M13 — The asset-authoring guide sends the user down three wrong paths.** `phase-09`'s suffix is `"low poly, flat shading, no texture detail, single object, centred, Y-up"`; `phase-02`'s `RODIN_STYLE_SUFFIX` is `', low-poly, flat shading, faceted, matte, no text, single object, centred, neutral background'` — two suffixes, defeating the DRY constant that exists to prevent style drift. Step 7 points at `src/data/asset-meta.ts`, which does not exist (`AssetMeta` lives on `PropDef.asset` in `props.ts`). Step 5's `npm run dev -- '?edit=1'` passes a bogus CLI arg to Vite. And Phase 2 says the suffix is "appended at build time" — there is no build step for prompts; a human pastes them, and nothing prints `rodinPrompt + RODIN_STYLE_SUFFIX`. **Fix:** one suffix source; correct the path and URL; add a "copy full prompt" affordance to `editor/prop-list.ts`, which already renders every prop.

**M14 — No WebGL context-loss handling anywhere.** `phase-09` lists it as an iOS Safari row to *check*, but no phase adds `webglcontextlost`/`webglcontextrestored`. Without `preventDefault()` on loss the context is never restorable and the canvas stays blank for the session — and iOS Safari drops contexts on backgrounding routinely. **Fix:** ~10 lines in `core/renderer.ts` (Phase 1): `preventDefault()`, stop the loop, show a resume overlay; rebuild shell + registry on restore. Verified in Phase 9's iOS row.

## LOW

- **L1** Cutaway initial `state` is unspecified (`phase-05` step 5 caches `{mesh, state, t}`). Seeding all to `'shown'` leaves any wall with `d ∈ (0, 0.10]` wrongly visible on first paint. Seed frame 1 with the stateless `d > 0`, then apply hysteresis. **The dead band itself is sound** — `[−0.04, +0.10]` gives exactly 2 transitions per revolution, and the −0.04 edge only mis-holds a wall hidden for ~2.3° past grazing, which is invisible. Keep it.
- **L2** Signature drift inside Phase 5: `roomAzimuth(room, houseBox)` declared with 2 params, called with 1 (step 9); `framePose` requires `fovY`+`viewport` in `FrameOpts`, steps 9 and 11 pass neither; step 11's `setFromCenterAndSize(pos, radius*2)` passes a scalar where a `Vector3` is required; `tickCutaway(camera, dt)` in the diagram vs `(camera, dt, cameraDirty)` in the file list.
- **L3** `phase-05` claims `enabled = false` "detaches input listeners". It does not — the setter calls `cancel()` and resets `touchAction`/`userSelect`; listeners stay attached and are gated internally. Harmless, but don't build on it.
- **L4** `phase-04` says "`simplify` *requires* a welded input". The CLI help says "For best results, apply a 'weld' operation before simplification." Weld-first is right; the word is stronger than the tool's contract.
- **L5** Stale `fitToBox` references survive Reconciled #9 in `phase-03` (`roomBounds` comment) and `phase-01` R5.
- **L6** The GLB triangle counter ignores primitive `mode` and node instancing — fine for a size report, wrong if anyone treats it as render cost.

## Cut (YAGNI)

- `scripts/check-contrast.mjs` — re-derives ratios already tabulated in design-guidelines, while axe DevTools (already an SC in Phases 7 **and** 9) checks contrast on the rendered page including states the script cannot see.
- `scripts/texture-budget.mjs` — `build-assets.mjs` already opens every GLB and reports bytes and triangles. Add texture bytes to that table instead of shipping a second walker; `resize --width 1024` already bounds the worst case.
- Phase 6's **2-sample occlusion confirm** — the probe already runs every 3rd frame on live pins only, so confirmation makes a state change take ~100 ms and adds a per-pin counter. Ship without it; add it back only if the "no flicker over 20 s" SC actually fails.
- Phase 8's **redo** — no acceptance criterion exercises it beyond the keybinding. Keep undo (placement without it is miserable), drop redo until asked.

**Keep, despite looking like gold-plating:** Phase 5's 4-state fade machine. `depthWrite:false` during the fade is load-bearing (a 5%-opaque wall would depth-occlude props behind it) and the `hidden` state exists to get transparency off the sort path at rest. Justification is sound.

## Floor plan vs `house-ground.webp`

The tessellation is a defensible rectangular simplification, but two "image check ✓" marks are not supported by the art:
- `gf-stairs` = **B1–B3** (14.91 m², larger than any real room). In the reference the wood corridor runs only alongside 起居室 and 会客室; the north row is 厨房, drawn spanning both the tatami and corridor columns.
- `gf-bath` = **C1–C2**, reaching the north wall. In the reference the ofuro/basin/toilet stack starts level with 起居室; the NE region reads as roof.

Not a blocker — SC-1 judges "reads as the same house", which it will. But change those two cells to "approximate — see SC-1" so the Phase 3 reviewer isn't told the question is settled. A closer fit at identical cost: `gf-kitchen` = A1+B1 (5.46 × 2.73), `gf-stairs` = B2–B3. Verified: still tiles exactly to 59.6232, and it puts the stair run in the single-storey southern strip, which incidentally dissolves M3.

## Verdict

**Not safe to hand to implementation as-is.** B1 and B2 are silent-failure defects that ship past every gate the plan defines. H1–H6 are cross-phase contract breaks that will surface as rework mid-build. Fix B1, B2 and H1–H6 first (all are edits to phase files, not redesigns — roughly half a day), fold M1–M14 into the owning phases, and this is a strong plan. Phases 1, 4 and 6 are the most solid; Phase 5 carries the most unverified math; Phase 3's data/builder contract is the one that must be settled before any code is written.

## Unresolved questions

1. Reconciled #8 states no Phase 6 code path is needed for `anchorWorld`. That ruling is wrong (H4) — confirm the 3-line path is in scope for Phase 6 rather than reopening the type contract.
2. plan.md Open Question 1 (procedural shell) is still unanswered and Phase 3 is next. It needs a yes before B1's rework is done twice.
3. Which physical device backs the "≥30 fps mid-tier mobile" gate (Phase 9's own Unresolved #2)? Without a named device that criterion cannot pass or fail.
