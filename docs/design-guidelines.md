# Design Guidelines — nobita-house-3d

UI chrome over a Three.js dollhouse. **The scene is the hero.** Chrome = annotation layer on an illustrated architectural plate (see `house-ground.webp`): aged paper, ink linework, dotted leaders. Never a floating SaaS dashboard.

Rules: (1) chrome occupies < 22% of viewport area at rest; (2) chrome is paper+ink neutral — the scene owns all saturation except one blue accent; (3) every overlay is either translucent-paper or absent, no full-bleed solid panels; (4) nothing blocks orbit unless it must.

---

## 1. Palette

Scene palette (locked, content report §5) is warm + saturated. UI derives a **desaturated paper/ink set** one step lighter than scene cream `#E8DCC8` so panels separate from the plaster walls, plus **one cool accent** — the only hue in the scene family that reads against tatami green, wood brown and kawara red at 20px.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--paper-100` | `#FFFCF6` | Card / raised surface | — |
| `--paper-200` | `#F7F1E6` | Panel base, rail | — |
| `--paper-300` | `#EDE4D4` | Inset, track, hover fill | — |
| `--paper-400` | `#E0D3BC` | Pressed fill, divider block | — |
| `--ink-900` | `#2A241E` | Primary text, icons | 13.7:1 on paper-200 |
| `--ink-700` | `#4E453B` | Body copy, inactive icon | 8.4:1 |
| `--ink-500` | `#6F6355` | Micro labels, credits, meta | 5.2:1 |
| `--line` | `#DBCEB9` | Hairline border | — |
| `--line-strong` | `#C7B69B` | Group divider, dotted leader | — |
| `--accent-600` | `#0B63C5` | Interactive, pin ring, active | 5.1:1 on paper-200; 5.7:1 w/ white |
| `--accent-700` | `#084A96` | Pressed | — |
| `--accent-400` | `#4FA8F7` | Pulse ring, glow only (never text) | — |
| `--accent-soft` | `rgba(11,99,197,.10)` | Selected chip fill | — |
| `--scrim` | `rgba(42,36,30,.46)` | Mobile sheet backdrop only | — |
| `--halo` | `#FFFFFF` | Outer ring on pins + focus, guarantees legibility over any scene colour | — |

Accent = Doraemon blue `#0080FF` darkened to pass AA on paper. `#0080FF` survives only as `--accent-400` glow. **Never** put UI chrome in kawara red, tatami green or Doraemon yellow — those belong to the model.

**Dev-only (editor mode)** — deliberately alien to the above:
`--dev-bg #14181D` · `--dev-surface #1E242C` · `--dev-line #2E3742` · `--dev-text #D7DEE6` (13.5:1) · `--dev-muted #8794A3` · `--dev-accent #FFB020` (10:1).

---

## 2. Typography

| Role | Font | Why |
|---|---|---|
| Display | **Fraunces** 500/600, `SOFT 100`, `WONK 1` | Variable soft-serif with a *softness* + *wonk* axis — gives the hand-inked, slightly irregular plate-title feel of the reference art without being a script/novelty face. Optical-size axis keeps 34px title and 22px card title both correct. Used **only** for: loading title, info-card title, floor headers. |
| UI / body | **Hanken Grotesk** 400/500/600/700 | Humanist geometric, open apertures, tall x-height — stays legible at 11–13px over a busy canvas, which Fraunces would not. Warm/soft enough to sit next to it. Not Inter/Poppins/Roboto. |
| Mono | system stack | Editor readouts only. No extra request. |
| JP flourish (optional) | system JP stack | Small kana room name under English name in navigator. Decorative — never load-bearing. |

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,100,1&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```
Verified 200 + latin/latin-ext/vietnamese subsets. Total ≈ 95 KB woff2 latin. `display=swap`; loading screen renders in fallback if fonts are slow.

| Step | Size / LH | Font | Use |
|---|---|---|---|
| `display-l` | 34 / 1.12 | Fraunces 600 | Loading title (mobile 28) |
| `display-m` | 24 / 1.22 | Fraunces 600 | Info-card title (mobile 22) |
| `display-s` | 15 / 1.3 | Fraunces 600 | Floor header ("Ground Floor") |
| `title-s` | 14 / 1.35 | Hanken 700 | Panel header |
| `body` | 15 / 1.62 | Hanken 400 | Card description |
| `label` | 13 / 1.2 | Hanken 500 | Buttons, room names |
| `micro` | 11 / 1.3, `+.09em`, uppercase | Hanken 600 | Group labels, eyebrow, credits |
| `mono` | 12 / 1.5 | system mono | Editor numerics (`font-variant-numeric: tabular-nums`) |

---

## 3. Tokens (copy-paste)

```css
:root{
  --paper-100:#FFFCF6; --paper-200:#F7F1E6; --paper-300:#EDE4D4; --paper-400:#E0D3BC;
  --ink-900:#2A241E; --ink-700:#4E453B; --ink-500:#6F6355;
  --line:#DBCEB9; --line-strong:#C7B69B;
  --accent-700:#084A96; --accent-600:#0B63C5; --accent-400:#4FA8F7;
  --accent-soft:rgba(11,99,197,.10); --scrim:rgba(42,36,30,.46); --halo:#fff;
  --dev-bg:#14181D; --dev-surface:#1E242C; --dev-line:#2E3742;
  --dev-text:#D7DEE6; --dev-muted:#8794A3; --dev-accent:#FFB020;
  --panel-bg:rgba(247,241,230,.92); --panel-blur:saturate(1.1) blur(10px);
  --sh-1:0 1px 2px rgba(42,36,30,.10),0 2px 8px rgba(42,36,30,.08);
  --sh-2:0 2px 6px rgba(42,36,30,.12),0 14px 30px rgba(42,36,30,.18);
  --sh-pin:0 2px 5px rgba(42,36,30,.38);
  --r-sm:6px; --r-md:10px; --r-lg:14px; --r-pill:999px;
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
  --font-display:'Fraunces',Georgia,serif;
  --font-ui:'Hanken Grotesk',system-ui,-apple-system,sans-serif;
  --font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --font-jp:'Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif;
  --e-out:cubic-bezier(.22,1,.36,1); --e-in:cubic-bezier(.4,0,1,1); --e-soft:cubic-bezier(.4,0,.2,1);
  --d-hover:120ms; --d-press:90ms; --d-panel-in:280ms; --d-panel-out:180ms;
  --d-sheet-in:320ms; --d-veil-out:500ms; --d-fly:900ms;
  --z-canvas:0; --z-pins:10; --z-chrome:20; --z-panel:30; --z-scrim:40;
  --z-sheet:50; --z-skip:100; --z-editor:1000; --z-veil:9000; --z-live:9500;
}
```

Focus ring (global): `outline:2px solid var(--accent-600); outline-offset:2px; box-shadow:0 0 0 4px var(--halo);` — the white halo is what makes it survive on top of the canvas.
Pins are the exception: the ring must hug the 26px **disc**, not the 44px transparent hit box, or it reads as a floating square. `.pin:focus-visible{outline:none}` + on the disc `box-shadow:0 0 0 2px var(--halo),0 0 0 4px var(--accent-600),0 0 0 6.5px var(--halo),var(--sh-pin)`.

---

## 4. Z-layering + hit-testing

Single biggest bug source. **`#ui-root` is `position:fixed; inset:0; pointer-events:none`.** Only the leaf elements listed `auto` below re-enable pointers.

| z | Layer | `pointer-events` | Notes |
|---|---|---|---|
| 0 | `<canvas>` | `auto`, `touch-action:none` | Owns orbit/pinch. Nothing transparent may sit above it with `auto`. |
| 10 | `#pin-layer` | **none** | Container only. Per-pin `<button>` → `auto`. `.pin__label` → **none** (labels must not create dead zones). Occluded pin → `none` + `tabindex="-1"` + `aria-hidden`. |
| 20 | Chrome (rail, view controls, title, credits) | panel → `auto`, gaps → none | Rail/controls are content-sized, never full-height blocks. `.credits` → none, its `<a>` → `auto`. |
| 30 | Info card (desktop) | `auto` | **No scrim on desktop** — canvas stays draggable beside the card. |
| 40 | Scrim (mobile only) | `auto` | Tap to dismiss. Exists *only* < 768px. |
| 50 | Bottom sheet (mobile) | `auto`, `touch-action:pan-y` | Grab handle `touch-action:none` (drag-to-dismiss). |
| 100 | Skip link (on focus) | `auto` | |
| 1000 | Editor panel | `auto` | lil-gui injects its own root at **1001** → sits above ours by design. Do not raise past 1000. |
| 9000 | Loading veil | `auto` | Blocks everything incl. canvas until removed from DOM (not just `opacity:0`). |
| 9500 | `#sr-live`, sr-only nav | **none** | Visually hidden. |

Extra rules: pins are re-sorted per frame, `z-index = 10 + round(1000 - depth)` so the nearest pin wins overlapping 44px hit areas. Any pin whose screen-space centre is < 30px from a nearer pin gets `.pin--eclipsed` (idle-dot only, not tabbable). Panels use `overscroll-behavior:contain`.

---

## 5. Components

### 5.1 Loading veil
Full-bleed warm wash (`radial-gradient(#FFFCF6, #EDE4D4)`), centred paper plate 420px w/ 1px `--line` + 3px dashed offset frame (echo of the reference plate). Title `display-l`; sub `micro` "A 3D dollhouse · Doraemon fan project". Progress = 3px ink rule, track `--paper-300`, fill `--accent-600`, width = %. Under it: `12 / 65 models` (`mono`, tabular) left, `18%` right. Attribution line at plate foot. `role="progressbar" aria-valuemin=0 aria-valuemax=100 aria-valuenow` + `aria-busy="true"` on `<body>`. Hold 200ms at 100%, then fade `--d-veil-out`, then `remove()`; focus moves to `<h1>`.

### 5.2 View controls
Paper card, top-right desktop / bottom bar mobile. Two labelled groups, hairline divider between.
`STRUCTURE`: Roof · 2nd Floor · Cutaway. `CAMERA`: Reset View · Auto-rotate.
Each is `<button type="button" aria-pressed="true|false">`, 20px stroke icon (1.75px, round caps, ink-700) + `label`. Reset View is a plain action → **no `aria-pressed`**.

| State | Style |
|---|---|
| idle | transparent, ink-700 icon+label |
| hover | `--paper-300`, ink-900, `--d-hover` |
| focus-visible | global focus ring |
| pressed | `--paper-400`, `scale(.97)` `--d-press` |
| on (`aria-pressed=true`) | `--accent-soft` fill, accent-600 icon, 700 label, 2px accent bar on inline-start |
| disabled | ink-500 @ 45%, `cursor:not-allowed` |

Icon carries state too (roof-on vs roof-off glyph) — colour is never the only signal.

### 5.3 Room navigator (11 rooms, 2 floors)
**Desktop ≥1024** — left rail, 232px, paper card, max-height 560px, internal scroll. Order top→bottom = **upstairs first** so the rail mirrors the physical stack. Each group: `display-s` floor header + `micro` count ("4 rooms"), and a 2px `--line-strong` vertical bracket down the group's inline-start to make grouping structural, not just spatial. Row = 36px, `white-space:nowrap`, `label` English name + optional `--font-jp` 9.5px kana pushed right at 50% opacity. Row 0 = "Whole House" (clears room filter).
**Tablet 768–1023** — same rail, 180px, kana hidden.
**Mobile <768** — 2-tab segmented control (`Ground` / `Upstairs`, `role="tablist"`), below it a horizontal `scroll-snap` chip row, 40px chips, 8px gap, edge fade masks. Total chrome height ≈ 92px.

| State | Style |
|---|---|
| idle | ink-700 |
| hover | `--paper-300` |
| active | `--accent-soft` + accent-600 label 600 + 3px accent bar inline-start; `aria-current="true"` |
| focus | global ring, `scroll-margin:8px` |

### 5.4 Hotspot pin
44×44 `<button>` (transparent hit area) containing a 26px disc (30px on mobile). Disc: `--paper-100` fill, 2px `--accent-600` ring, 1.5px `--halo` outer ring, 8px accent core dot, `--sh-pin`. The white outer ring is mandatory — without it pins vanish on cream plaster.

| State | Spec |
|---|---|
| idle | as above + pulse ring: 1.5px `--accent-400`, `scale 1→1.9`, `opacity .55→0`, 2400ms `ease-out` infinite, `animation-delay: i*180ms` |
| hover | `scale(1.12)`; label chip fades in (paper-100, ink-900 `label`, 12px, `--sh-1`, dotted 1px leader to disc); chip flips side within 140px of viewport edge |
| focused (kbd) | label always visible + focus ring w/ halo; pulse paused |
| active | disc → accent-600 fill, white core, `scale(1.15)`, pulse off, label pinned; all other pins → `opacity .3`, `--d-hover` — **except a focused pin, which never dims** |
| occluded | `opacity .32`, `scale(.8)`, ring→`--line-strong`, no core, no label, `pointer-events:none`, `aria-hidden`, `tabindex=-1` |
| eclipsed | as occluded but keeps accent ring at `opacity .5` |

Occlusion = raycast pin anchor → camera every 3rd frame. Pins never render as text-only; the disc is the affordance.

### 5.5 Info card
Content: eyebrow (room name, `micro`, accent-600) · title (`display-m`) · 2–4 sentence body (`body`, ink-700, max 62ch) · close.
**Desktop ≥1024** — right-docked panel, `right:16px`, `top:132px` (clears the view controls), width **392px** (= controls width, so the right column reads as one stack), auto height capped at `min(560px, 100vh - 164px)`, `--r-lg`, `--panel-bg` + backdrop-filter, `--sh-2`. Enter: `translateX(24px)+opacity 0` → 0, `--d-panel-in` `--e-out`, delayed 240ms after fly start so it lands with the camera. Exit `--d-panel-out` `--e-in`.
**Mobile <768** — bottom sheet, full-width, `--r-lg` top corners, 20px grab handle, `max-height:62vh`, body scrolls, `padding-bottom: env(safe-area-inset-bottom)`. Scrim fades 200ms. Enter `translateY(100%)`→0, `--d-sheet-in` `--e-out`. Drag down > 96px or velocity > .5 → dismiss.
Both: 44px close button (× icon, `aria-label="Close"`), `role="dialog"`, `aria-labelledby` title. **Esc closes; focus returns to the originating pin.** Focus moves into the card on open and Tab cycles inside it. Desktop `aria-modal="false"` (canvas still orbits by pointer); mobile `aria-modal="true"` + `inert` on `#ui-root` siblings. While a card is open, arrow keys scroll the card — camera keyboard nudge is suspended.

### 5.6 Editor mode (`?edit=1`, dev only)
`<html data-edit>` gates every rule so prod CSS is untouched. Viewport gets a 3px `--dev-accent` inset ring + a 22px top strip of 45° amber/ink hazard stripes reading `EDIT MODE — NOT PRODUCTION`. Impossible to mistake.
Right-docked column, 300px, `--dev-bg`, `--font-mono`, no radius, no shadow, square 1px `--dev-line` borders.
Rows: search `<input>` (filter 65 props) → grouped prop list, 26px rows, `id · name`, active row `--dev-surface` + amber inline-start bar → selected-prop readout, 3×3 mono grid `pos/rot/scl` × `x/y/z`, editable number inputs → snap segmented `0.05 / 0.1 / 0.25 / off` → `EXPORT layout.json` full-width amber button (ink text). Sliders/lighting stay in lil-gui (z 1001, its own dark theme, visually adjacent). No animation anywhere in editor UI.

### 5.7 Credits
One line, `micro`, ink-500. Desktop: bottom-left, 16px inset, `pointer-events:none`, inner `<a>` `auto` + underline on hover.
`Doraemon © Fujiko Pro / Shogakukan / TV Asahi · fan project, non-commercial`
Mobile: same line at 10px, centred under the control bar inside safe-area; also shown in full on the loading plate.

---

## 6. Motion

| Event | Duration | Easing | Notes |
|---|---|---|---|
| Button hover / colour | 120ms | `--e-soft` | |
| Button press | 90ms | `--e-in` | `scale(.97)` |
| Info card in (desktop) | 280ms, **delay 240ms** | `--e-out` | delay syncs with camera deceleration |
| Info card out | 180ms | `--e-in` | no delay |
| Bottom sheet in / out | 320 / 200ms | `--e-out` / `--e-in` | |
| Scrim fade | 200ms | linear | |
| Camera fly | ~900ms (`smoothTime .35`) | camera-controls damping | pins dim at 0ms, card at 240ms, `aria-live` announce at settle |
| Pin pulse | 2400ms loop, `delay i*180ms` | `ease-out` | staggered so 12 pins never pulse in lockstep |
| Pin hover / active | 120ms | `--e-out` | |
| Rail room switch | 240ms | `--e-out` | active bar slides |
| Loading veil out | 500ms + 200ms hold | `--e-in` | opacity + `scale(1.03)` on plate |

`@media (prefers-reduced-motion: reduce)`: all transitions → 1ms except opacity fades (120ms, kept for state legibility); pin pulse → static ring at `scale(1.25) opacity .35`, `animation:none`; card delay → 0; **camera fly → `setLookAt(..., false)` (instant cut)**; auto-rotate defaults off and its button shows a "motion" hint.

---

## 7. Responsive

| Breakpoint | Rail | Controls | Card | Canvas share |
|---|---|---|---|---|
| ≥1024 desktop | left rail 232px | top-right card 392px | right panel 392px, under controls | ≥ 78% |
| 768–1023 tablet | left rail 180px, no kana | top-right, labels kept | right panel 340px | ≥ 74% |
| <768 mobile portrait | tabs + snap chip row, ≈92px tall | bottom bar 56px + safe-area | bottom sheet ≤ 62vh | ≥ 70% at rest |
| <768 landscape (`max-height:480px`) | rail collapses to icon-only 56px left | icon-only, no labels | side panel 300px | ≥ 72% |

Mobile portrait is the hard case: chrome is pinned to bottom only, top 100% stays clear so the diorama sits high in frame. Chip row and control bar share one translucent paper plinth, not two stacked cards.

---

## 8. Accessibility checklist

- [ ] Skip link → "Skip 3D view, browse rooms as a list" (z 100).
- [ ] `<canvas role="img" aria-label="Isometric cutaway model of Nobita's house from Doraemon: a two-storey Japanese home with a red tile roof, tatami rooms, kitchen, bathroom and a garden with two trees and a storage shed.">` + sr-only fallback paragraph inside the canvas element.
- [ ] Always-present sr-only `<nav>` listing all 11 rooms + 12 hotspots as real buttons — the non-visual path is never gated on occlusion state.
- [ ] Every toggle a real `<button aria-pressed>`; Reset View has none. Room rows use `aria-current`.
- [ ] Pins are `<button>` in DOM order = room order (not screen position); Tab reaches every non-occluded pin.
- [ ] Focus ring: 2px accent + 4px white halo, visible on both paper and canvas. Never `outline:none` without replacement.
- [ ] Card = `role="dialog"`, labelled, Esc closes, focus enters on open and returns to the pin on close; mobile adds `aria-modal` + `inert`.
- [ ] `#sr-live` `aria-live="polite"` announces: room change, roof/floor/cutaway toggles, "Loaded, 65 of 65 models", card open/close.
- [ ] Text contrast ≥ 4.5:1 everywhere (values in §1); icons ≥ 3:1; state never colour-only (icon glyph + weight change too).
- [ ] Touch targets ≥ 44×44 (pins use a 44px transparent hit box around a 26px disc).
- [ ] `prefers-reduced-motion` honoured incl. camera flight and auto-rotate default.
- [ ] Loading veil sets `aria-busy` and moves focus to `<h1>` on removal.

---

## 9. Wireframes

`docs/wireframe/desktop.html` · `docs/wireframe/mobile.html` — self-contained, no build, no JS. Canvas is a flat SVG placeholder in scene-palette colours so pin contrast is judgeable. Each file stacks labelled screens (loading / main+card / edit mode).

## 10. Open questions

1. Do we show the 4 Tier-2 hotspots (rooms, not props) as pins, or only surface them via the room navigator? 12 pins in one small diorama will crowd — recommend pins for the 8 prop hotspots, room-level content shown when a room is selected.
2. "Whole House" row in the rail vs. a separate Reset View button — currently two ways to do nearly the same thing.
3. Kana subtitles in the navigator: keep as decorative flourish (system JP font, may fail on some Windows installs) or drop for strict English-only?
4. Does cutaway need per-wall control, or is the single global toggle spec'd here enough?
