---
phase: 5
title: "View Control & Room Navigation"
status: pending
priority: P1
dependencies: [3]
effort: "6h"
---

# Phase 5: View Control & Room Navigation

## Overview

Makes the diorama *readable*. Two modules, no DOM: `world/structure-controller.ts` owns what is visible (roof, 2nd floor, auto wall-cutaway); `interaction/room-navigator.ts` owns where the camera is (room framing, fly-to, Whole House, Reset, auto-rotate, keyboard nudge). Phase 7 wires buttons to these APIs; Phase 6 calls `focusPoint()`. All framing math lives as pure functions in `utils/bounds.ts` so it is unit-testable without a GL context.

## Requirements

| # | Requirement |
|---|---|
| R5.1 | Roof toggle: `roofOn` → roof group `visible`. Instant, no fade. |
| R5.2 | 2nd-floor toggle: `floorFilter` → second-floor group `visible`. Instant. Hides its walls, floor slab, props and pins. |
| R5.3 | Global auto wall-cutaway: every frame the camera moves, vertical walls facing the camera fade out; walls facing away fade back. Schmitt-trigger hysteresis, no per-wall UI. |
| R5.4 | Room selection frames the room's footprint box with a deterministic azimuth, respecting chrome insets, camera never inside geometry. |
| R5.5 | Fly-to disables user input for the flight and restores it on settle **or timeout**. Rapid re-clicks retarget the in-flight camera; they never queue. |
| R5.6 | "Whole House" clears `activeRoom` and frames the full diorama. "Reset" re-frames the *current* selection at default angles and clears focal offset. Distinct actions. |
| R5.7 | Auto-rotate toggle; suspended during flight and while a card is open; defaults off under `prefers-reduced-motion`. |
| R5.8 | `prefers-reduced-motion` → all camera transitions are instant cuts (`enableTransition = false`). |
| R5.9 | Arrow-key camera nudge on the focused canvas; suspendable by Phase 6 while a card is open. |

## Architecture

### Data flow

```
app-state ──(change: roofOn|floorFilter)──▶ structure-controller.applyStructure()
loop.ts ──(frame, cameraDirty)───────────▶ structure-controller.tickCutaway(camera, dt)
                                                    │ pure: cutawayDecision()
                                                    ▼ mesh.visible / material.opacity

ui / hotspot ──▶ room-navigator.goToRoom(id) ──▶ bounds.framePose()  (pure)
                                              └▶ controls.setLookAt(...)  + setFocalOffset(...)
                                                    │ on rest | timeout
                                                    ▼ controls.enabled = true ; app-state.activeRoom = id
```

### Cutaway: the dot test + hysteresis

`toCam = normalize(camera.position − mesh.position)` — the wall mesh's own world position is the wall centre (Phase 3 builds each wall centred on its own origin), so no separate centre lookup is needed. `outward` is a plain readonly `[x,y,z]` unit tuple, **not** a `THREE.Vector3`, so dot it componentwise with no per-frame allocation: `d = wall.userData.outward[0]*toCam.x + wall.userData.outward[1]*toCam.y + wall.userData.outward[2]*toCam.z`.
`d > 0` ⇒ the wall's outward face points at the camera ⇒ it sits **between** camera and room interior ⇒ hide.

Pure decision function (unit-tested, no three.js state):

```ts
// utils/bounds.ts
export type CutState = 'shown' | 'hidden';
export const CUT_HIDE = 0.10;   // enter hidden
export const CUT_SHOW = -0.04;  // return to shown
export function cutawayDecision(d: number, prev: CutState): CutState {
  if (prev === 'shown')  return d >  CUT_HIDE ? 'hidden' : 'shown';
  return                        d <  CUT_SHOW ? 'shown'  : 'hidden';
}
```

Dead band `[-0.04, +0.10]` ≈ 8° of azimuth around grazing — wide enough to swallow damped-camera jitter, narrow enough to be invisible. A Schmitt trigger, not a timer: state depends only on `d` and the previous state, so it is deterministic and testable by sweeping azimuth.

Only walls with `|outward[1]| < 0.3` participate. Roof and floor slabs are never cutaway-managed — they have explicit toggles and double-management would fight the user.

**Fade, not pop** — justification: the roof/2F toggles are discrete user actions, so an instant `visible=false` reads as a deliberate switch (research report §a). The cutaway flips *continuously while the user drags*; a hard pop mid-drag reads as a rendering bug. 180 ms opacity fade. Each wall runs a 4-state machine so no wall is left permanently transparent (transparency costs sorting correctness and depth-write):

| State | `visible` | `transparent` | `depthWrite` | `opacity` |
|---|---|---|---|---|
| `shown` | true | false | true | 1 |
| `fading-out` | true | true | **false** | 1→0 |
| `hidden` | **false** | false | true | 1 |
| `fading-in` | true | true | false | 0→1 |

`depthWrite:false` while fading stops a 5%-opaque wall from depth-occluding the props behind it. Requires **one material instance per wall** — Phase 3 already clones a private material per exterior wall for exactly this reason (`plan.md` Reconciled contracts #3), so this is granted, not an upstream ask.

### Framing: pure pose math

`fitToBox()` is **not** used. It preserves the *current* azimuth, which is precisely the failure mode in R5.4 — orbit to the north side, click "Kitchen", and the camera fits from inside the north wall. We need to *choose* the azimuth. Own math is ~30 lines, deterministic, and unit-testable without WebGL.

```ts
// utils/bounds.ts
export interface Insets { left: number; right: number; top: number; bottom: number } // CSS px
export interface FrameOpts {
  azimuth: number; polar: number;      // radians, camera-controls convention (phi from +Y)
  fovY: number; viewport: { w: number; h: number }; insets: Insets;
  clampBox: THREE.Box3;                // always houseBox (buildings only) — the clamp target is independent of what `box` frames
  padding?: number;                    // default 1.18
}
export function framePose(box: THREE.Box3, o: FrameOpts): { position: Vec3; target: Vec3; focalOffset: Vec2 }
```

Two boxes, not one (red-team H2): `houseBox(rooms)` unions only `!room.outdoor` rooms — this is what `framePose` clamps against (`o.clampBox`) and what an individual room jump frames relative to for the geometry check. `lotBox(rooms)` additionally unions `outdoor` rooms (the yard) and is used only as the *framed* box for the Whole House view — never as a clamp. The original single `houseBox` included `gf-yard` (13.65 m), which pushed the out-of-geometry clamp ~14 m out and made every room jump fail the "≥45% fill" criterion — the clamp radius and the fill target were mutually unsatisfiable against a box that size. `houseBox`'s `max.y` is raised to the roof ridge height (6.656 m, Phase 3) so the clamp also keeps the camera above the roof, not just outside the walls.

1. `centre = box.getCenter()`, `size = box.getSize()`.
2. Effective viewport = viewport minus chrome insets. `effW = w − left − right`, `effH = h − top − bottom`.
3. Half-extents needed on screen: project the 8 box corners into the camera basis built from `(azimuth, polar)`; take `halfW`, `halfH`, `halfD` in that basis (exact for any azimuth; the AABB shortcut over-fits at 45°).
4. One consistent aspect model — insets fold into the tangent once, not applied and then re-applied: `kx = effW / w; ky = effH / h;` `distV = halfH / (tan(fovY/2) * ky);` `distH = halfW / (tan(fovY/2) * (w/h) * kx);` `dist = max(distV, distH) * padding + halfD`. (The previous spec had a step 5 that re-scaled `dist` by `max(w/effW, h/effH)` on top of this — a double correction. With a left-only inset (desktop rail) it over-scaled `distV` by ~1.26 at 1440 px, shrinking the framed room ~26% against the "≥45% fill" criterion. Deleted; `kx`/`ky` above are the single, sufficient correction.)
5. `focalOffset`, directly in **world units** — the caller applies no further conversion. Pixels are square, so one scale serves both axes (no separate x/y formula, and no aspect factor on y): `s = 2 * dist * tan(fovY/2) / h;` `focalOffset = ((left − right)/2 * s, (top − bottom)/2 * s)`. This is what puts the room in the *visible* rectangle instead of behind the rail (desktop) or behind the sheet (mobile — satisfies "prop sits in the visible top 38%" from the mobile wireframe).
6. `position = centre + sphericalToCartesian(dist, azimuth, polar)`; `target = centre`.
7. **Clamp out of geometry**: while `o.clampBox.expandByScalar(0.25).containsPoint(position)` push `position` outward along `(position − centre)` in 0.25 m steps, max 40 iterations. `o.clampBox` is always `houseBox` — see above. Guarantees R5.4's acceptance test.

Room azimuth choice — deterministic, from data only:

```ts
export function roomAzimuth(room: RoomDef, houseBox: THREE.Box3): number {
  // score each of +X,-X,+Z,-Z by −(clearance to house AABB face) + (2.0 if that edge's WallSpec is 'none'|'opening')
  // Clearance is inverted (subtracted, not added): a LARGE clearance in a direction means MORE
  // house sits between the room and that exterior face, not less. The naive argmax over raw
  // clearance picks the direction with the MOST occluding geometry (red-team H1: gf-kitchen
  // scored −Z clearance 0 / +Z clearance 5.46 and argmax'd to +Z, framing the shot through
  // living and guest). Inverting makes argmax choose the direction with the LEAST house in the
  // way — the shortest traversal to the exterior.
  // pick argmax; az = atan2(dir.x, dir.z) + degToRad(28)
}
```

The fixed +28° kick stops the shot reading as a flat architectural elevation. Fixed sign ⇒ deterministic ⇒ testable.

### Fly-to lifecycle

```ts
private token = 0;
async flyTo(pose: Pose, instant = prefersReducedMotion()) {
  const my = ++this.token;                 // cancel-and-retarget: no queue
  this.controls.enabled = false;
  const done = () => { if (my === this.token) { this.controls.enabled = true; clearTimeout(t); } };
  const t = setTimeout(done, CAMERA.flyTimeoutMs);   // 1400ms — rAF stops on a hidden tab; 'rest' would never fire
  await Promise.all([
    this.controls.setLookAt(...pose.position, ...pose.target, !instant),
    this.controls.setFocalOffset(pose.focalOffset.x, pose.focalOffset.y, 0, !instant),
  ]);
  done();
}
```

Re-click while flying: `setLookAt` overwrites `_targetEnd`/`_sphericalEnd`, so damping simply retargets mid-flight — the correct behaviour, free. The token stops the stale promise from re-enabling input early.

`controls.enabled = false` does **not** detach input listeners — they stay attached and are gated internally by the library, `cancel()` only clears drag state — but it blocks new user drags from starting while `controls.update(dt)` keeps damping the in-flight `setLookAt`, so the flight still animates and cannot be interrupted by an accidental touch-pan mid-flight (research report risk #3).

### Whole House vs Reset

| | `activeRoom` after | Box framed | Clamp box | Angles |
|---|---|---|---|---|
| Whole House | `null` | `lotBox` (union of all rooms, incl. `outdoor`) | `houseBox` | default azimuth/polar |
| Reset | unchanged | `activeRoom ? roomBox(activeRoom) : lotBox` | `houseBox` | default azimuth/polar, focal offset re-derived, dolly reset |

Reset is a plain action (`no aria-pressed`, design-guidelines §5.2).

## Related Code Files

**Create**
- `src/world/structure-controller.ts` — roof/floor visibility, cutaway state machine, `tickCutaway(camera, dt, cameraDirty)`.
- `src/interaction/room-navigator.ts` — `goToRoom(id)`, `goWholeHouse()`, `resetView()`, `focusPoint(worldPos, opts)`, `setAutoRotate(b)`, `suspendKeyboard(b)`.

**Modify**
- `src/utils/bounds.ts` (Phase 1 stub) — add `roomBox`, `houseBox`, `lotBox`, `framePose`, `roomAzimuth`, `cutawayDecision`. Append-only.
- `src/config.ts` — **import**, do not redeclare, `CAMERA`. Phase 1 owns and exports `CAMERA` (`plan.md` red-team ruling H5): `{ fov, near, far, start, smoothTime: 0.35, minDistance: 2.5, maxDistance: 42, defaultAzimuth: -Math.PI/4, defaultPolar: degToRad(58), roomPolar: degToRad(62), padding: 1.18, flyTimeoutMs: 1400, autoRotateSpeed: 0.6, … }` — `maxDistance` is raised to 42 there specifically so Phase 5 can frame the whole lot. The earlier draft of this phase re-declared `export const CAMERA` in this file, which is a TS2451 redeclaration (Phase 1 already exports the name) and quoted a conflicting `maxDistance` of 30 — both dropped. Phase 5 appends **only**: `export const CUTAWAY = { hide: 0.10, show: -0.04, fadeMs: 180, maxNormalY: 0.3 }`. If any `CAMERA` field this phase needs is missing from Phase 1's export, extend `CAMERA` there — never redeclare it here. Append-only block; no other phase edits this file except Phase 6 (`HOTSPOT` block).

**Read only**
- `src/core/camera-rig.ts`, `src/core/loop.ts`, `src/world/house-shell.ts`, `src/world/prop-registry.ts`, `src/state/app-state.ts`, `src/data/rooms.ts`.

## Implementation Steps

1. **Smoke-check the one remaining API fact** before writing logic (5 min): `controls.update(dt)` returns `true` only when the camera changed — needed to gate the cutaway dot-product loop on `cameraDirty` (step 7). Log it in a scratch page. **Already verified, no check needed:** `camera-controls@3.1.2`'s `update(delta)` has no `_enabled` guard and `cancel()` (called by the `enabled` setter) only clears user-drag state — a `setLookAt` transition keeps animating while `enabled === false` (red-team, verified from source; `plan.md` "Now verified"). The former fallback of gating input via `controls.mouseButtons`/`touches = NONE` is unnecessary and dropped.
2. `utils/bounds.ts`: `roomBox(room)` from `footprint {x,z,w,d}` + `height`; `houseBox(rooms)` = union of `!room.outdoor` room boxes with `max.y` raised to the roof ridge height (6.656 m, Phase 3's ridge) so the clamp also keeps the camera above the roof; `lotBox(rooms)` = union of *all* room boxes (incl. `outdoor`), no ridge adjustment. `houseBox` is the clamp target everywhere (H2); `lotBox` is only ever a *framing* target, used solely by the Whole House view. All pure, no three.js beyond `Box3`/`Vector3`.
3. `utils/bounds.ts`: `cutawayDecision` + constants. Write its test first (see Success Criteria) — the flicker guarantee is the whole point.
4. `utils/bounds.ts`: `framePose` + `roomAzimuth` per Architecture. Test against all 11 rooms.
5. `structure-controller.ts`: on construct, take `houseShell` **and** `propRegistry` (read-only). Partition `houseShell` into `roof`, `floors.ground|second`, `walls: Mesh[]` (filter `userData.kind === 'wall' && Math.abs(userData.outward[1]) < CUTAWAY.maxNormalY`). Cache `{mesh, state, t}` per wall. From `propRegistry`, build a flat list of `{object, floor}` by resolving each instance's `roomId → rooms.ts` room's `.floor` — this feeds step 6's prop-visibility rule directly from the registry, no group parenting required in `world/` (H3's fix needs no change to Phase 4's files).
6. Subscribe to `app-state` `roofOn` / `floorFilter`; apply instant visibility to walls **and** props. Composition rule (single source of truth, avoid two systems writing `visible`):
   `mesh.visible = floorVisible(mesh.userData.floor) && cutState !== 'hidden'` — a wall on a hidden floor is hidden regardless of cutaway, and re-showing the floor restores the correct cutaway state on the next tick.
   Props carry no cutaway state, so their rule is simpler: `instance.object.visible = floorVisible(floor)` for every `{object, floor}` built in step 5. Run on every `floorFilter` change (H3 — R5.2 promises the 2F toggle hides props too; nobody else owns this). Pins are covered independently by Phase 6's `refilter()`, listening to the same `app-state` key — no coupling needed between Phase 5 and Phase 6 beyond that shared key.
7. `tickCutaway(camera, dt, cameraDirty)`: if `cameraDirty` recompute `d` per wall and step the decision; always advance in-flight fades by `dt`. Skipping the dot loop on a still camera is the only optimisation needed (~24 dot products is already trivial).
8. `room-navigator.ts`: construct with `camera`, `controls`, `appState`; set `controls.smoothTime`, `minDistance`, `maxDistance` from `CAMERA`, `minPolarAngle = degToRad(8)`, `maxPolarAngle = degToRad(88)` (stops the camera going under the base plate), and `controls.setBoundary(lotBox(rooms).expandByScalar(12))` — the pan/dolly boundary uses the wider `lotBox` (the camera must be able to reach the Whole House framing distance), while every `framePose` call's clamp always uses the tighter `houseBox` (H2).
9. `goToRoom(id)`: `framePose(roomBox(room), {azimuth: roomAzimuth(room, houseBox), polar: CAMERA.roomPolar, insets: currentInsets(), clampBox: houseBox, fovY: camera.fov * DEG2RAD, viewport: canvasSize()})` → `flyTo`. Set `app-state.activeRoom` **immediately** (rail highlight must not wait 900 ms), announce on settle.
10. `currentInsets()`: read from CSS custom props set by Phase 7 (`--inset-left|right|top|bottom` on `:root`) so chrome geometry has exactly one owner. Fallback `{0,0,0,0}`.
11. `goWholeHouse()` / `resetView()` per the table below — `goWholeHouse` frames `lotBox`, both frame with `clampBox: houseBox`. `focusPoint(pos, {radius})` for Phase 6 = `framePose(new Box3().setFromCenterAndSize(pos, new THREE.Vector3(radius, radius, radius).multiplyScalar(2)), { …, clampBox: houseBox })`.
12. Auto-rotate: `controls.autoRotate`; force off while `flying || cardOpen`; default `false` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.
13. Keyboard nudge: canvas gets `tabindex="0"`; `ArrowLeft/Right` → `controls.rotate(±5°, 0, true)`, `ArrowUp/Down` → `controls.rotate(0, ∓4°, true)`, `+`/`−` → `controls.dolly(±0.8, true)`. No-op when `suspendKeyboard(true)`.
14. `dispose()`: remove listeners, `controls.dispose()`, restore every wall material to `shown`.

## Success Criteria

- [ ] `npx vitest run src/utils/bounds.test.ts` passes with: sweep azimuth `0 → 2π` in 0.25° steps through `cutawayDecision` for a 4-wall box — **exactly 2 state transitions per wall per revolution** (proves no flicker; a naive `d > 0` test produces > 2 at grazing).
- [ ] Same suite: for all 11 rooms × aspect ratios `{16/9, 1, 9/16}`, `framePose(...).position` is **not** contained in `houseBox()` — buildings only, ridge-raised, see Architecture — `.expandByScalar(0.25)`.
- [ ] Same suite: `roomAzimuth(room, houseBox)` is stable across 100 identical calls and differs from every wall's outward axis by ≥ 20°.
- [ ] Same suite: `roomAzimuth(gfKitchen, houseBox)` resolves to the `−Z` (north) direction, not `+Z` — a direct regression pin on red-team H1 (the unpatched metric scored `−Z` clearance `0` / `+Z` clearance `5.46` and argmax'd to the more-occluded `+Z` side); `roomAzimuth(gfBath, houseBox)` resolves to `+X`, not `−X`, for the same reason.
- [ ] `npm run dev` — clicking each of the 11 rail rows lands the room filling ≥ 45% of the *uncovered* canvas rect, with no wall between camera and room. Verified on 1440×900 and 390×844.
- [ ] Toggle 2nd Floor off: every prop instance whose room has `floor: 'second'` has `object.visible === false` (count equals the second-floor placed-object total, derived from `rooms.ts`/`PLACEABLE_PROPS`, never a literal); toggle back on restores all of them to `visible === true`. Pins for those props are independently hidden by Phase 6's `refilter()` — verify both together.
- [ ] Roof, 2nd Floor, Cutaway toggles all flip on click and on touch-tap; `aria-pressed` matches `app-state` after each.
- [ ] Rapid-click 5 different rooms within 1 s: camera ends at the 5th room, `controls.enabled === true` within 1.5 s, no intermediate stop.
- [ ] Switch tabs mid-flight for 5 s, return: `controls.enabled === true` (timeout path fired).
- [ ] DevTools → emulate `prefers-reduced-motion: reduce` → room clicks cut instantly; Auto-rotate reads `aria-pressed="false"` on load.
- [ ] `renderer.info.render.calls` logged at the whole-house view is recorded in the phase report (feeds Phase 9's < 120 budget).

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Per-wall meshes (18 exterior walls — 10 ground + 8 second, enumerated in Phase 3 §Recount) sit comfortably inside the renegotiated `<120` draw-call budget | L×L | Budget raised to `<120` by the lead (`plan.md` Reconciled contracts #4) — no longer at risk. `BatchedMesh` for walls with `setVisibleAt()` per wall stays a **documented, unbuilt** escape hatch, triggered only if measured frame time misses the fps target (never by a draw-call count) — it would drop walls to 1 call but force the cutaway to an instant cut (no per-instance opacity), so it is a last resort. | Revert to instant-cut cutaway; keeps the feature, loses the fade. |
| `fitToBox` rejected — if `framePose` math is wrong, every room jump is wrong | M×H | Pure function, unit-tested against all 11 rooms and 3 aspect ratios before any wiring. Failure is caught by `npm test`, not by eyeball. | `controls.fitToBox(box, true)` after `controls.rotateTo(az, polar, true)` is a 3-line fallback; azimuth control becomes approximate. |
| Transparent walls sort incorrectly against props during the 180 ms fade | M×L | `depthWrite:false` while fading; fade window is short and only during camera motion. | Set `CUTAWAY.fadeMs = 0` → instant cut. |
| `controls.enabled = false` leaves input dead if `rest` never fires | M×H | 1400 ms `setTimeout` fallback, tested by the tab-switch criterion above. | — |
| Canvas `tabindex="0"` adds a confusing tab stop before the pins | M×L | Sanctioned non-visual path is the sr-only room nav (Phase 7), not the canvas. If Phase 9's keyboard walkthrough finds it confusing, **drop the nudge** — it is 15 lines and has no dependents except the "suspend while card open" rule. | Remove `tabindex`, delete handler. |
| `roomAzimuth` picks a good angle for 10 rooms and a bad one for `gf-bath` (interior, no exterior face) | M×M | Clearance scoring (inverted per H1 — argmax over −clearance, least house in the way) degrades gracefully for interior rooms; the geometry clamp (step 7) guarantees the camera is still outside `houseBox`. Manual check of `gf-bath` and `2f-landing` is an explicit acceptance item. | Per-room `cameraAzimuth?: number` override field added to `RoomDef` in `rooms.ts` (data-only fix, no code change). |
