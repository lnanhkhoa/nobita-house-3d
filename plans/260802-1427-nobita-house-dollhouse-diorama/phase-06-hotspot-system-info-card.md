---
phase: 6
title: "Hotspot System & Info Card"
status: pending
priority: P1
dependencies: [4, 5]
effort: "8h"
---

# Phase 6: Hotspot System & Info Card

## Overview

Turns 12 `HotspotDef`s into clickable, keyboard-reachable pins and one focus-trapped info card. Pins are DOM `<button>`s positioned per frame by `Vector3.project()`; the card is a right panel on desktop and a drag-dismissable bottom sheet on mobile. Clicking a pin flies the camera (Phase 5 `focusPoint`) and the card enters 240 ms later so it lands with the camera.

## Requirements

| # | Requirement |
|---|---|
| R6.1 | All 12 hotspots stay in `data/hotspots.ts`; only pins whose prop is in the **currently-visible floor + room** are rendered/tabbable (user decision, `tech-stack.md`). |
| R6.2 | Pin screen position updates every frame from the prop's world anchor. |
| R6.3 | Per-frame z-sort by depth so the nearest pin wins overlapping 44 px hit boxes. |
| R6.4 | Occlusion probe every 3rd frame → ghost state + `pointer-events:none` + `aria-hidden` + `tabindex="-1"`. |
| R6.5 | All 6 pin states from design-guidelines §5.4: idle, hover, focused, active, occluded, eclipsed. |
| R6.6 | Clicking the 3D prop itself opens the same card as its pin. |
| R6.7 | Info card: desktop right panel, **no scrim**, canvas stays orbitable. Mobile bottom sheet + scrim + drag-dismiss. |
| R6.8 | Card is `role="dialog"`, labelled, focus enters on open, Tab cycles inside, Esc closes, focus returns to the originating pin. |
| R6.9 | Pins are in the DOM in **room order**, not screen order (a11y checklist). |
| R6.10 | `#sr-live` announces card open/close; sr-only hotspot buttons stay usable regardless of occlusion. |

## Architecture

### No proxy meshes — deliberate cut

The brief and the research report call for invisible proxy meshes as raycast targets. **Rejected.** Pins are DOM buttons; the browser does their hit-testing for free, including touch. The only raycast genuinely needed is the occlusion probe, which must target the *real* shell and props (a proxy cannot occlude anything). Prop-click (R6.6) raycasts the ~12 hotspot prop roots directly — they already exist in `prop-registry`. Adding ~12 invisible spheres would buy nothing and add scene objects, raycast noise and a second source of truth for anchor positions. One raycaster, two consumers.

### Data flow

```
data/hotspots.ts ─┐
data/props.ts  ───┼─▶ hotspot-manager.build()  →  Hotspot[] { def, prop:Object3D, anchor:Vector3 }
prop-registry ────┘                                  │
                                                     ├─▶ pin-layer.mount()   → 12 <button> (room order, all [hidden])
app-state(activeRoom, floorFilter) ──────────────────┴─▶ pin-layer.refilter() → toggles [hidden]

loop.ts ─(frame n, cameraDirty)──▶ pin-layer.tick():
        project → screen px → z-index → eclipse pass (O(n²), n≤12, only when cameraDirty)
        every 3rd frame → hotspot-manager.probeOcclusion() → .pin--occluded

pin click | prop click | sr-only button
        └─▶ openHotspot(id) → room-navigator.focusPoint(anchor) ─┐
                            → app-state.selectedHotspot = id     │
                            → info-card.open(def)  (CSS delay 240ms) ◀┘
```

### Anchor resolution

Two code paths, not one — corrected by red-team (H4), which found the original single-path spec crashes on `hs-roof`: its `propId` (`prop-47`) is `builtBy:'shell'`, and Phase 4 skips `builtBy:'shell'` props entirely when building `prop-registry`, so a registry lookup for it resolves to nothing.

```ts
let anchorWorld: THREE.Vector3;
if (def.anchorWorld) {
  // shell-anchored hotspot (hs-roof and its peers) — the prop is built by house-shell, not
  // prop-registry, so there is no Object3D to resolve through. Use the authored world position
  // verbatim and skip the registry lookup entirely.
  anchorWorld = new THREE.Vector3(...def.anchorWorld);
} else {
  const obj = propRegistry.get(def.propId);                 // fail-loud per step 1 if absent
  const local = def.anchor ?? [0, prop.size[1] * 0.6, 0];    // types.ts: anchor is prop-local
  anchorWorld = obj.localToWorld(new THREE.Vector3(...local));
}
```
Recomputed on `layout` changes (editor) and once after load; **not** per frame — props are static. `anchorWorld`-branch hotspots never change (they have no `PropInstance` to move), so they are computed once at `build()` and never touched again.

### Projection tick

```ts
const v = anchorWorld.clone().project(camera);            // NDC
if (v.z > 1) { hide(); return; }                          // behind the camera
const x = (v.x * .5 + .5) * vw, y = (-v.y * .5 + .5) * vh;
if (x < -40 || x > vw + 40 || y < -40 || y > vh + 40) { hide(); return; }
el.style.transform = `translate3d(${x}px,${y}px,0)`;       // pin CSS keeps the -22px margin offset
const depth = camera.position.distanceTo(anchorWorld);
el.style.zIndex = String(10 + Math.max(0, Math.round(1000 - depth * 10)));   // 0.1 m resolution
```

**Critical:** `#pin-layer` must establish its own stacking context — `position:absolute; z-index:var(--z-pins); isolation:isolate`. Without it a pin's local `z-index:1000` escapes and paints **over** the chrome (z 20) and the card (z 30). `isolation:isolate` is belt-and-braces in case the `z-index` is ever refactored out. This is the single most likely regression in this phase.

Design-guidelines specifies `10 + round(1000 − depth)`; ×10 is used so two pins 0.3 m apart in depth do not tie.

### Eclipse pass (design-guidelines §4)

Only when `cameraDirty`, to stop class thrash:

```ts
live.sort((a, b) => a.depth - b.depth);                    // nearest first
for (let i = 0; i < live.length; i++)
  live[i].eclipsed = live.slice(0, i).some(n => dist2(n, live[i]) < 30 * 30);
```
`n ≤ 12` ⇒ ≤ 66 comparisons. Eclipsed pins: idle dot only, `tabindex="-1"`, still `aria-hidden="false"` in the sr-only nav (the non-visual path is never gated on screen geometry).

### Occlusion probe

Every 3rd frame, for live pins only (usually 1–3 when a room is selected):

```ts
ray.set(camera.position, dir(anchor - camera.position));
const hit = ray.intersectObjects(occluders, true)[0];      // occluders = shell walls/floors/roof + all props
const occluded = !!hit && hit.distance < camera.position.distanceTo(anchor) - 0.12;
```

A single sample is enough: the probe already runs every 3rd frame on live pins only (usually 1–3 when a room is selected), so a state change already lags reality by ≤3 frames — the extra 2-consecutive-probe confirm counter was cut as YAGNI (nothing about the probe's cadence produces silhouette-edge flicker often enough to need it; add it back only if the "no flicker over 20 s" success criterion actually fails). Occluders exclude meshes currently hidden by Phase 5 (`visible === false` is already skipped by `Raycaster`), so cutaway walls stop occluding automatically — no cross-module coupling needed.

### Info card: one DOM, two behaviours

Single template. CSS decides panel-vs-sheet (`@media (max-width:767px)`). JS switches only the *behaviours*, re-evaluated from a `matchMedia` change listener so rotating a phone mid-card does the right thing:

| | Desktop ≥768 | Mobile <768 |
|---|---|---|
| scrim | none | `--scrim`, tap to dismiss |
| `aria-modal` | `false` | `true` |
| `inert` on `#ui-root` siblings | no | yes |
| drag-dismiss | no | yes (>96 px or v>0.5 px/ms) |
| focal offset | shift x by `(cardW+32)/2` | shift y so the prop sits in the top 38% |

Focus handling (one helper, reused by nothing else — keep it local):

```ts
open(def, originPin: HTMLElement) {
  this.origin = originPin;
  render(def); el.hidden = false;
  titleEl.tabIndex = -1; titleEl.focus();          // focus enters on open
  document.addEventListener('keydown', this.onKey, true);   // Esc + Tab wrap
}
close() {
  el.hidden = true; clearFocalOffset();
  const target = this.origin?.isConnected && !this.origin.hasAttribute('hidden')
    ? this.origin
    : document.querySelector<HTMLElement>('.room[aria-current="true"]');   // documented fallback
  target?.focus();
}
```
Fallback matters: the originating pin can be removed from the tab order (room switched, floor hidden) while the card is open. Never leave focus on `<body>`.

While the card is open: `roomNavigator.suspendKeyboard(true)` (arrow keys scroll the card, design-guidelines §5.5) and auto-rotate is forced off.

### Drag-dismiss (mobile)

Pointer Events on the grab handle only (`touch-action:none`; the sheet body is `pan-y` so text still scrolls):
`pointerdown` → `setPointerCapture`, record `y0,t0` → `pointermove` → `dy>0 ? translateY(dy)` → `pointerup` → `dy > 96 || dy/dt > 0.5` ? `close()` : spring back (`transition: transform 180ms var(--e-out)`).

## Related Code Files

**Create**
- `src/interaction/hotspot-manager.ts` — build, anchors, occlusion probe, prop-click raycast, `openHotspot/closeHotspot`.
- `src/ui/pin-layer.ts` — `<button>` construction (room order), `[hidden]` filtering, per-frame `tick()`, state classes.
- `src/ui/info-card.ts` — template, open/close, focus trap, scrim, drag-dismiss, focal-offset request.

**Modify**
- `src/config.ts` — append `export const HOTSPOT = { occlusionEveryNFrames: 3, occlusionEps: 0.12, eclipsePx: 30, offscreenMarginPx: 40, tapMaxMovePx: 10, tapMaxMs: 400, cardDelayMs: 240 }`. No `occlusionConfirm` — the 2-sample confirm was cut as YAGNI (above). Append-only; Phase 5 owns the `CAMERA`/`CUTAWAY` blocks in the same file, Phase 8 keeps its config inside `editor/`.
- `src/ui/ui.css` (Phase 7) — pin + card rules. **Ownership:** Phase 7 lands `ui.css` first with `/* --- pins (phase 6) --- */` and `/* --- info card (phase 6) --- */` sentinel blocks; Phase 6 writes only between the sentinels.

**Read only**
- `src/data/hotspots.ts`, `props.ts`, `rooms.ts`, `src/world/prop-registry.ts`, `src/interaction/room-navigator.ts`, `src/state/app-state.ts`, `docs/wireframe/*.html` (markup is the reference).

## Implementation Steps

1. `hotspot-manager.build()`: join `hotspots.ts` → `props.ts` → `prop-registry`. **Fail loud**: a hotspot whose `propId` has no `PropDef` throws at boot (Phase 9 covers it with a manifest test). A hotspot whose prop is still a proxy box is fine — anchors work identically. A hotspot with `def.anchorWorld` set (H4) skips the `prop-registry` lookup entirely — see Anchor resolution below — so a `builtBy:'shell'` `propId` (never registered) is not an error for those hotspots specifically.
2. Sort into room order using `rooms.ts` order, upstairs-first, matching the rail. Stable tab order (R6.9).
3. `pin-layer.mount()`: build all 12 buttons once, all `hidden`. Markup copied from `docs/wireframe/desktop.html` lines 403–413 verbatim (`.pin > .pin__pulse + .pin__disc + .pin__label`), `aria-label` = `def.title`, `data-hotspot=id`. Add `#pin-layer{isolation:isolate}`.
4. Add `[hidden]{display:none !important}` to `ui.css` — `hidden` loses to `display:grid` on `.pin` otherwise. Verify by tabbing.
5. `refilter()` on `app-state` change of `activeRoom`/`floorFilter`: `visible = floorOf(prop.roomId) is shown && (activeRoom === null || prop.roomId === activeRoom)`. Toggle `hidden`. No node create/destroy.
6. `tick(cameraDirty)` per Architecture: project → position → z-index. Run **every** frame (pins must not lag the camera); run eclipse + occlusion only on the throttled paths.
7. Occlusion probe, single sample per throttled tick (no confirm counter — cut as YAGNI, see Architecture); apply `.pin--occluded` + `aria-hidden="true"` + `tabindex="-1"` + `pointer-events:none`.
8. Prop-click: on `pointerdown` record `{x,y,t}`; on `pointerup` if moved < 10 px and < 400 ms, raycast `hotspotPropRoots` — this distinguishes a tap from the end of an orbit drag. Walk `hit.object.parent` chain for `userData.propId`.
9. `info-card.ts`: build markup from the wireframes (desktop lines 416–426, mobile 314–321). One template, `data-variant` attribute set from `matchMedia`.
10. Open flow: `focusPoint(anchor)` → set `selectedHotspot` → `card.open()`. Card entrance delay is **CSS** (`animation-delay:240ms`), zeroed by `prefers-reduced-motion`. No JS timer to drift.
11. Dim non-active pins (`.pin--dim`) on open; never dim the focused pin (`.pin--dim:focus-visible{opacity:1}` already in the wireframe CSS).
12. Focus trap + Esc + return-focus per Architecture. Mobile: `inert` on `#ui-root` children except the sheet and scrim.
13. Drag-dismiss per Architecture.
14. `#sr-live` announcements: `"${def.title}, ${room.name}. Information opened."` / `"Information closed."`
15. Append the 12 sr-only hotspot buttons into `#sr-nav-hotspots` (container owned by Phase 7 `ui-root.ts`); they call `openHotspot()` directly and are **never** filtered or occlusion-gated.
16. `dispose()`: remove listeners, `matchMedia` listener, pointer capture.

## Success Criteria

- [ ] `npm run dev`, DevTools console: `document.querySelectorAll('#pin-layer .pin:not([hidden])').length` equals the hotspot count of the active room, and equals the count of *all* visible-floor hotspots when "Whole House" is selected.
- [ ] With `public/models/` empty (no GLBs downloaded), `hs-roof` (and every other `anchorWorld`-based, `builtBy:'shell'` hotspot) still mounts a pin and projects to a screen position without throwing — proves the `anchorWorld` branch bypasses `prop-registry` entirely (H4).
- [ ] With a card open, `getComputedStyle(document.querySelector('.card')).zIndex` is `30` and no `.pin` paints over it — verified by DevTools 3D-layers view (proves the `isolation:isolate` stacking context holds).
- [ ] Tab from the room rail reaches every non-occluded, non-eclipsed pin exactly once, in room order; each shows the 2 px accent + 4 px halo ring hugging the 26 px disc.
- [ ] Occluded pin assertions, checked in console after orbiting a pin behind a wall: `el.getAttribute('aria-hidden') === 'true'`, `el.tabIndex === -1`, `getComputedStyle(el).pointerEvents === 'none'`, and `document.activeElement !== el` after pressing Tab through the layer.
- [ ] Card assertions on open: `card.getAttribute('role') === 'dialog'`, `card.getAttribute('aria-labelledby')` resolves to a non-empty `<h2>`, `document.activeElement` is inside `card`.
- [ ] Esc closes and `document.activeElement === <the pin that opened it>`; repeat after switching rooms while open → focus lands on the active rail row, never `<body>`.
- [ ] Desktop with card open: dragging on the canvas left of the card still orbits (no scrim). Mobile: scrim tap, drag-down 120 px, and Esc each close.
- [ ] Orbit for 20 s with 12 pins live: no pin visibly flickers between ghost and solid on the single-sample probe and `renderer.info` shows no growth in `geometries`/`textures` (no per-frame allocation). If this fails, the pre-approved escape hatch is a 2-consecutive-probe confirm counter — not built pre-emptively.
- [ ] Screen reader (VoiceOver rotor): all 12 hotspots reachable from the sr-only nav even while occluded.
- [ ] `npm run typecheck && npm run lint` clean.

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Pin `z-index` escapes `#pin-layer` and covers chrome/card | **H×H** | `isolation:isolate` + explicit DevTools layer check in Success Criteria. Named here because it is the exact bug design-guidelines §4 warns about. | Clamp pin z-index to `10..19`; loses fine-grained overlap ordering, keeps layering correct. |
| 12 raycasts/3 frames costs > 2 ms on mobile | M×M | Only *live* pins are probed (1–3 when a room is active). Measure with `performance.measure` in Phase 9. | Probe every 6th frame; or drop occlusion to a cheap depth-buffer-free heuristic (anchor inside a hidden-wall room ⇒ visible). `three-mesh-bvh` remains rejected until profiled. |
| Card variant desyncs on rotate (panel behaviours on a sheet) | M×M | `matchMedia` change listener re-applies behaviours; one DOM so no re-render. | Close the card on breakpoint crossing. |
| `inert` unsupported on an older mobile Safari | L×M | `inert` is baseline in Safari 15.5+. Feature-detect `'inert' in HTMLElement.prototype`; fall back to `aria-hidden` + a Tab guard in the existing focus trap. | Scrim + focus trap alone still contain keyboard focus. |
| Prop-click competes with orbit-drag release | M×M | 10 px / 400 ms tap discrimination, standard. | Drop R6.6 — pins alone satisfy every acceptance criterion; prop-click is a nice-to-have. |
| Anchor default `size[1]*0.6` floats badly for flat props (tatami, scroll) | M×L | The 4 flat-prop hotspots get an explicit `anchor` in `hotspots.ts` (data fix, Phase 2 file, no code change). | — |
| `HotspotDef.anchorWorld` hotspots (`hs-roof` and peers) crash if resolved through `prop-registry` — `builtBy:'shell'` props are never registered there | **H×M** | Explicit `anchorWorld` branch skips the registry lookup entirely (Anchor resolution, above); success criterion covers `hs-roof` mounting with an empty `public/models/`. Named here because red-team H4 found the original single-path spec undefined-dereferences on exactly this hotspot. | — |
