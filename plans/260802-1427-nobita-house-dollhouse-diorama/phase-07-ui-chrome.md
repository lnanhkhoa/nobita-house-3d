---
phase: 7
title: "UI Chrome"
status: pending
priority: P1
dependencies: [5]
effort: "10h"
---

# Phase 7: UI Chrome

## Overview

Builds every non-hotspot UI surface as plain DOM + CSS, matching `docs/wireframe/{desktop,mobile}.html` pixel-for-pixel. Five modules under a single `#ui-root`, two stylesheets, self-hosted fonts. This phase owns the z-index / pointer-events contract that Phase 6 depends on, and the sr-only a11y scaffolding.

## Requirements

| # | Requirement |
|---|---|
| R7.1 | Design tokens implemented **verbatim** from design-guidelines §3 as CSS custom properties — a diff against that block must be empty. |
| R7.2 | Loading veil driven by `app-state.loading`; **removed from the DOM** on finish, not `opacity:0`. |
| R7.3 | View controls: Structure (Roof · 2nd Floor · Cutaway) + Camera (Reset · Auto-rotate). Real `<button aria-pressed>`; Reset has none. Glyph changes with state — colour is never the only signal. |
| R7.4 | Room rail: desktop 232 px upstairs-first with floor headers + counts + kana; tablet 180 px no kana; mobile segmented tabs + scroll-snap chips; landscape 56 px icon rail. |
| R7.5 | Credits line, IP attribution, `pointer-events:none` except its `<a>`. |
| R7.6 | Fonts self-hosted from `public/fonts/`. No request to `fonts.googleapis.com` or `fonts.gstatic.com` at runtime. |
| R7.7 | The z-index + pointer-events scheme is implemented exactly as tabulated below. |
| R7.8 | `prefers-reduced-motion` honoured for every transition and animation. |
| R7.9 | Skip link, canvas `role="img"` + description, sr-only `<nav>` of 11 rooms + a container for Phase 6's 12 hotspot buttons, `#sr-live`. |
| R7.10 | Chrome geometry published as `--inset-left|right|top|bottom` on `:root` so Phase 5 framing has one source of truth. |

## Architecture

### Z-index + pointer-events contract (restated — known bug source)

`#ui-root { position:fixed; inset:0; pointer-events:none; }`. **Only** the leaves below re-enable pointers.

| z | Element | `pointer-events` | Enforced by |
|---|---|---|---|
| 0 | `<canvas>` | `auto`, `touch-action:none` | `index.html` + `ui.css` |
| 10 | `#pin-layer` | **none** (`isolation:isolate`) | Phase 7 declares; Phase 6 fills |
| 10 | `.pin` `<button>` | `auto` | Phase 6 |
| 10 | `.pin__label` | **none** | Phase 6 — a 260 px label with `auto` carves a dead strip across the diorama |
| 20 | `.leftcol`, `.controls` (panels) | `auto`; the gaps between them stay `none` | Phase 7 — panels are content-sized, never full-height blocks |
| 20 | `.credits` | **none**; inner `<a>` `auto` | Phase 7 |
| 30 | `.card` desktop | `auto`, **no scrim** | Phase 6 |
| 40 | `.scrim` (<768 only) | `auto` | Phase 6 |
| 50 | `.sheet` | `auto`, `touch-action:pan-y`; `.sheet__grab` `touch-action:none` | Phase 6 |
| 100 | `.skip-link` (on focus) | `auto` | Phase 7 |
| 1000 | editor panel | `auto` — lil-gui self-injects at 1001, do not raise past 1000 | Phase 8 |
| 9000 | `.veil` | `auto`, blocks all input until `remove()` | Phase 7 |
| 9500 | `#sr-live`, sr-only nav | **none**, visually hidden | Phase 7 |

`#ui-root > * { pointer-events: auto }` (as in the wireframe) plus an explicit `#pin-layer{pointer-events:none !important}` and `.credits{pointer-events:none !important}` override. Panels use `overscroll-behavior:contain`.

### Data flow

```
app-state.loading {loaded,total,done} ─▶ loading-veil: bar width, "n / {loading.total} models", aria-valuenow
                                        done ─▶ hold 200ms ─▶ fade 500ms ─▶ el.remove() ─▶ h1.focus() ─▶ sr-live
app-state.{roofOn,floorFilter,cutawayOn,autoRotate} ⇄ view-controls (aria-pressed + glyph swap)
app-state.activeRoom ⇄ room-rail (aria-current, active bar)  ⇄ room-navigator.goToRoom()
room-rail/view-controls ─▶ structure-controller | room-navigator   (never mutate three.js directly)
ResizeObserver(#ui-root) ─▶ :root style --inset-left/right/top/bottom  ─▶ Phase 5 framePose insets
```

`ui-root.ts` is the only module that touches `document.body`; the other four render into containers it creates. This keeps mount order deterministic and gives Phase 8 a single element to hide in edit mode.

### Stylesheets

- `src/ui/tokens.css` (~110 lines) — the design-guidelines §3 block **verbatim**, `@font-face`, reset, global focus ring, `[hidden]{display:none!important}`, `@media (prefers-reduced-motion)` block. Kept separate precisely so it can be diffed line-by-line against the doc.
- `src/ui/ui.css` (~650 lines) — components. Ported from the wireframe CSS with the `.doc/.frame/.legend` scaffolding stripped. Contains empty sentinel blocks `/* --- pins (phase 6) --- */ … /* --- end pins --- */` and the same for the info card; Phase 6 writes only inside them, so 6 and 7 never conflict on this file.

Both imported from `ui-root.ts`. Editor CSS lives in `src/editor/editor.css`, imported by `editor-mode.ts` only — Vite emits it in the async chunk so prod CSS never carries it (Phase 9 asserts this).

### Self-hosted fonts

Runtime must make **zero** third-party requests: this is a local-only project, `display=swap` FOUT on a cold cache looks broken over the veil, and hotlinking pins us to Google's file versions.

One-off acquisition, documented in the asset-authoring guide (Phase 9), no build step and no Python tooling:

```bash
# 1. Latin UI faces — fetch the CSS with a modern UA, copy the woff2 URLs it returns, curl them.
curl -H 'User-Agent: Mozilla/5.0 Chrome/120' \
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,100,1&family=Hanken+Grotesk:wght@400..700&display=swap'
# 2. Kana subset — &text= makes Google return a font containing ONLY these glyphs (~3 KB vs 1.5 MB).
curl -H 'User-Agent: Mozilla/5.0 Chrome/120' \
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&text=のび太の部屋両親廊下階段踊り場玄関居間台所客浴室庭'
```

Files land in `public/fonts/`. `@font-face` in `tokens.css`:

```css
@font-face{font-family:'Fraunces';src:url('/fonts/fraunces-var.woff2') format('woff2-variations');
  font-weight:400 700;font-display:swap;unicode-range:U+0000-00FF,U+2000-206F,U+2212}
@font-face{font-family:'Hanken Grotesk';src:url('/fonts/hanken-grotesk-var.woff2') format('woff2-variations');
  font-weight:400 700;font-display:swap;unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:'Noto Sans JP Subset';src:url('/fonts/noto-sans-jp-rooms.woff2') format('woff2');
  font-weight:400;font-display:optional;unicode-range:U+3000-30FF,U+4E00-9FFF}
```
`--font-jp` becomes `'Noto Sans JP Subset','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif` — this is the one intentional edit to the token block, required by `tech-stack.md` ("subsetted Noto Sans JP"). `font-display:optional` on the kana face: it is decoration, it must never delay or shift layout.
`index.html` preloads only the two latin faces (`<link rel="preload" as="font" type="font/woff2" crossorigin>`).

### Responsive map (resolves a doc conflict)

design-guidelines §7 and the mobile wireframe both label landscape "< 768 px **and** max-height 480 px", but the wireframe's own landscape device is **844 × 390** — width 844 fails a `max-width:767px` gate. The width clause is wrong. Implemented as:

| Query | Layout |
|---|---|
| `(min-width:1024px)` | rail 232 px + kana, controls 392 px top-right, card 392 px right |
| `(min-width:768px) and (max-width:1023px)` | rail 180 px, kana hidden, card 340 px |
| `(max-width:767px)` | bottom plinth: tabs + snap chips + 56 px control bar, sheet ≤ 62dvh |
| `(max-height:500px) and (orientation:landscape)` | `.railmini` 56 px left, `.barmini` icon column right, side card 300 px, **no plinth** — wins over the above via source order |

`100dvh` everywhere `100vh` appears (iOS Safari toolbar). `--panel-bg` and `--sh-2` stay at the design-guidelines values; the bottom-anchored plinth/sheet get `--sh-2-up` (inverted-Y shadow) as an addition, not an override — the mobile wireframe redefined the base tokens, which would have leaked into the desktop breakpoint.

### Inset publication

```ts
const ro = new ResizeObserver(() => {
  const r = { left: 0, right: 0, top: 0, bottom: 0 };
  if (mq.desktop) { r.left = leftcol.offsetWidth + 32; r.right = controls.offsetWidth + 32; }
  else            { r.bottom = plinth.offsetHeight + 16; }
  for (const k of ['left','right','top','bottom'] as const)
    document.documentElement.style.setProperty(`--inset-${k}`, `${r[k]}`);
});
```
Phase 5 reads these; the card adds its own inset when open (Phase 6). One owner, no hard-coded 232.

## Related Code Files

**Create**
- `src/ui/ui-root.ts` — mounts `#ui-root`, skip link, sr-only nav (`#sr-nav-rooms`, **`#sr-nav-hotspots`** for Phase 6), `#sr-live`, `#pin-layer`, inset ResizeObserver, `announce(text)`.
- `src/ui/loading-veil.ts`
- `src/ui/view-controls.ts`
- `src/ui/room-rail.ts` — desktop rail / mobile tabs+chips / landscape mini rail from one room list.
- `src/ui/credits.ts`
- `src/ui/tokens.css`, `src/ui/ui.css`
- `public/fonts/{fraunces-var,hanken-grotesk-var,noto-sans-jp-rooms}.woff2`

**Modify**
- `index.html` (Phase 1) — font preloads, `<canvas role="img" aria-label="…">` + sr-only fallback paragraph, `<div id="ui-root">`.

**Delete**
- `src/style.css` (Phase 1) — M8: Phase 1 pastes the design-guidelines §3 `:root` token block verbatim into `src/style.css` (imported by `main.ts`), and Phase 7 pastes the *same* block into `src/ui/tokens.css` (imported by `ui-root.ts`, step 1 below) — two copies of one source of truth, only one of which (`tokens.css`) gets the diff-against-the-doc check. Phase 7 deletes `src/style.css` and absorbs its three global rules (`html,body{…}`, `#scene{…}`, `#ui-root{…}`) into `tokens.css`/`ui.css`. This drops `main.ts`'s `import './style.css'` line — a one-line removal to land in the same change as whichever phase touches `main.ts` last (Phase 1 or Phase 8); if sequencing makes that awkward, leave `src/style.css` in place as an empty file with a one-line comment pointing at `tokens.css` rather than editing `main.ts` outside its owning phases.

**Read only**
- `docs/design-guidelines.md`, `docs/wireframe/*.html` (the reference implementation), `src/state/app-state.ts`, `src/data/rooms.ts`, `src/interaction/room-navigator.ts`, `src/world/structure-controller.ts`.

## Implementation Steps

1. `tokens.css`: paste design-guidelines §3 unchanged, then append `@font-face`, `*{box-sizing}`, the global focus ring (§3 footer), `[hidden]{display:none!important}`, `.sr-only`, and the `prefers-reduced-motion` block from §6 (transitions → 1 ms except opacity 120 ms; `.pin__pulse` static at `scale(1.25) opacity .35`; card delay 0). Also absorb `src/style.css`'s three global rules (`html,body{…}`, `#scene{…}`, `#ui-root{…}`) here or into `ui.css`, then delete `src/style.css` (M8 — see Related Code Files).
2. Acquire fonts per Architecture, commit to `public/fonts/`, preload the two latin faces. Confirm with DevTools → Network → filter `fonts.g` → **0 requests**.
3. `ui-root.ts`: build the skeleton in wireframe order, wire the ResizeObserver, expose `announce()`.
4. Canvas a11y: `role="img"` + the exact `aria-label` from design-guidelines §8, plus an sr-only `<p>` fallback describing the house inside the canvas element.
5. sr-only `<nav aria-label="Rooms and points of interest">` with 11 real room `<button>`s wired to `goToRoom`, and an empty `<ul id="sr-nav-hotspots">`. This path is never gated on occlusion or the room filter.
6. `loading-veil.ts` from wireframe lines 313–321: `role="progressbar"` + `aria-valuenow`, `aria-busy="true"` on `<body>`. Bar width and the "n / total" copy read `appState.loading.{loaded,total}` on every change event — never a literal count (H6: the model total is 63 placed objects, not the 65 authored `PropDef`s; hardcoding either number here is exactly the bug that shipped). On `done`: 200 ms hold → 500 ms fade → **`el.remove()`** → `body.removeAttribute('aria-busy')` → `h1.focus()` → `` announce(`Loaded, ${loading.total} of ${loading.total} models`) ``. Reduced motion: skip the fade, remove immediately.
7. `view-controls.ts` from wireframe lines 373–399. Two glyphs per toggle (`roof-on`/`roof-off`, `floor-2-shown`/`floor-2-hidden`, `cutaway-on`/`cutaway-off`) swapped on state — R7.3's non-colour signal. Reset: no `aria-pressed`, no active style. Auto-rotate: `aria-pressed`, defaults `false` under reduced motion with a `title`/`aria-description` hint.
8. All toggles call `structure-controller` / `room-navigator`, then re-render from the resulting `app-state` change event — **never** optimistically. Single direction of truth; makes the "aria-pressed matches state" criterion trivially true.
9. `room-rail.ts`: build once from `rooms.ts`, group by floor, **second floor first**, header = `display-s` + `micro` count, `<ul>` with the 2 px `--line-strong` inline-start bracket, row 0 = "Whole House". Kana from `RoomDef.kana` in `--font-jp` at 9.5 px / 50% opacity, hidden < 1024.
10. Mobile variant from the same data: `role="tablist"` Ground/Upstairs + `scroll-snap` chip row with edge mask. Landscape variant: 3-letter codes derived as `id.split('-')[1].slice(0,3).toUpperCase()`. One data source, three renderers.
11. Selecting a room sets `aria-current="true"` and `scroll-margin:8px`; on mobile also `scrollIntoView({block:'nearest',inline:'center'})`.
12. `credits.ts`: exact string `Doraemon © Fujiko Pro / Shogakukan / TV Asahi · fan project, non-commercial`; container `pointer-events:none`, `<a>` `auto`.
13. `ui.css`: port the wireframe CSS. Delete `.doc/.doc-head/.ann/.frame/.note/.legend/.device/.spec` scaffolding. Add the sentinel blocks for Phase 6. Replace `position:absolute` with `fixed` on `#ui-root` (the wireframe is inside a `.frame`).
14. Add the four media queries per the Responsive map, in that source order.
15. Visual diff: open the wireframe and the app side by side at 1440×900, 900×700, 390×844, 844×390.

## Success Criteria

- [ ] `diff <(sed -n '/^:root{/,/^}/p' docs/design-guidelines.md) <(sed -n '/^:root{/,/^}/p' src/ui/tokens.css)` prints only the `--font-jp` line (the documented Noto subset edit).
- [ ] DevTools → Network, hard reload: **0** requests to `fonts.googleapis.com` or `fonts.gstatic.com`. `du -h public/fonts` < 200 KB total.
- [ ] After load completes: `document.querySelector('.veil') === null` and `document.body.hasAttribute('aria-busy') === false`.
- [ ] Console: `getComputedStyle(document.getElementById('ui-root')).pointerEvents === 'none'`; dragging on any transparent area of `#ui-root` (between rail and controls) orbits the camera.
- [ ] Console: `getComputedStyle(document.getElementById('pin-layer')).isolation === 'isolate'`.
- [ ] Every toggle: `btn.getAttribute('aria-pressed') === String(appState[key])` after 10 random clicks each; Reset has no `aria-pressed` attribute; each toggle's `<svg>` `innerHTML` differs between states.
- [ ] Rail renders 11 rooms + "Whole House", second floor group first, counts read "4 rooms" / "7 rooms".
- [ ] Side-by-side with `docs/wireframe/desktop.html` at 1440×900 and `mobile.html` at 390×844: no visible difference in spacing, colour, type or shadow.
- [ ] `(max-height:500px) and (orientation:landscape)` at 844×390 shows the icon rail + icon control column and **no** bottom plinth.
- [ ] DevTools emulate `prefers-reduced-motion: reduce`: no element animates > 120 ms; pin pulse static.
- [ ] axe DevTools on the loaded page: 0 serious/critical issues (full audit is Phase 9).
- [ ] `npm run typecheck && npm run lint` clean.

## Risk Assessment

| Risk | L×I | Mitigation | Rollback |
|---|---|---|---|
| Chrome eats orbit input via a transparent full-size wrapper | **H×H** | The contract table above is implemented as explicit CSS rules, and the "drag between rail and controls orbits" check is a Success Criterion, not a vibe. | Add `pointer-events:none` to the offending wrapper; the leaves already opt in. |
| Google Fonts `&text=` subsetting URL changes or rate-limits | L×M | Outputs are **committed** `.woff2` files, so the fetch is one-off. If the endpoint dies, the fallback is `--font-jp`'s system JP stack — kana is decorative (design-guidelines §2). | Drop the custom face; system stack renders on macOS/iOS/most Windows. |
| Variable-font `font-variation-settings:'SOFT' 100,'WONK' 1` ignored if the wrong Fraunces file is fetched (static instead of variable) | M×M | Verify in DevTools → Rendering → Font panel that Fraunces exposes 4 axes before porting titles. | Static Fraunces 600 + Georgia fallback; loses the wonk, keeps the layout. |
| Wireframe CSS redefines `--panel-bg`/`--sh-2` differently per file | M×M | Resolved: design-guidelines §3 wins, mobile gets an additive `--sh-2-up`. Recorded here so it is not "fixed" back later. | — |
| `100vh` on iOS Safari clips the plinth behind the toolbar | M×M | `100dvh` + `env(safe-area-inset-bottom)` throughout; on the real-device pass in Phase 9. | `-webkit-fill-available` fallback. |
| Phases 6 and 7 both edit `ui.css` | M×M | Sentinel blocks; Phase 7 lands the file first (Phase 6 depends on 5, not 7, so sequence 7-then-6 on this file only). | Phase 6 ships `pins.css`/`card.css` as separate imports. |
| Three rail renderers drift from each other | M×L | All three read one `rooms.ts`-derived array and one `select(id)` handler; only the template differs. | — |
