# Design Guidelines — nobita-house-3d

Trimmed 2026-09-10 to the surfaces that exist. The scene is the hero; chrome is a paper-and-ink annotation layer. The 2026-08-02 version specified dollhouse surfaces (room rail, hotspot pins, editor mode) that were never built after the pivot; git history keeps it.

Rules: chrome stays translucent paper or absent; the scene owns all saturation except one blue accent; nothing blocks orbit unless it must.

## 1. Palette

UI tokens are **implemented in `src/styles/tokens.css`** — that file is the source of truth. Summary:

| Group | Tokens | Use |
|---|---|---|
| Paper | `--paper-100…400` (#FFFCF6 → #E0D3BC) | panel fills, hover/pressed states |
| Ink | `--ink-900/700/500` (#2A241E / #4E453B / #6F6355) | text hierarchy; 13.7:1 / 8.4:1 / 5.2:1 on paper |
| Lines | `--line`, `--line-strong` | hairlines, dashed plate frame |
| Accent | `--accent-600` #0B63C5 (+700 pressed, 400 glow, soft fill) | the only interactive hue; Doraemon blue darkened to pass AA |
| Overlay | `--panel-bg` rgba paper .92 + blur | every floating panel |

Never put chrome in kawara blue, tatami green or Doraemon yellow; those belong to the model. Per-character accent colours come from `data/characters.ts` and appear only in roster swatches and the card eyebrow.

## 2. Typography

| Role | Font | Where |
|---|---|---|
| Display | Fraunces 600, `SOFT 100, WONK 1` | loading title, card title, app title |
| UI/body | Hanken Grotesk 400–700 | everything else |
| JP flourish | system JP stack | character name kana in the info card |

Loaded from Google Fonts in `index.html`, `display=swap`.

## 3. Surfaces (all implemented in `src/ui/` + `src/styles/app.css`)

| Surface | Spec |
|---|---|
| Loading veil | full-bleed warm wash, paper plate with dashed offset frame, 3px accent progress rule, `n / N models` tabular counter; `role="progressbar"`, removed from DOM after fade |
| Title card | top-left paper card, Fraunces title + uppercase micro eyebrow |
| View controls | top-right toolbar: Reset view (plain action), Auto-rotate (`aria-pressed`) |
| Roster | bottom-left pill row, one button per character with colour swatch; `aria-current` on selection; doubles as the keyboard/SR path to character selection |
| Info card | desktop right panel 360px / mobile bottom sheet; eyebrow in character colour, Fraunces title, kana subtitle, ≤62ch body; Esc closes, focus returns to the roster button |
| Credits | one micro line bottom-left: `Doraemon © Fujiko Pro / Shogakukan / TV Asahi · fan project, non-commercial` |

Canvas: `role="img"` with a scene-describing `aria-label`; `#ui-root` is `pointer-events:none`, only leaf panels re-enable.

## 4. Motion

| Event | Duration |
|---|---|
| Button hover / press | 120 / 90 ms |
| Card in / out | 280 / 180 ms (mobile sheet 320) |
| Camera fly (`CameraControls`) | smoothTime 0.35 |
| Character idle | breath ~1.55 Hz bob + squash, slow sway, phase-offset per character |
| Select greeting | ~0.95 s dip → hop → settle, slight yaw wave |

`prefers-reduced-motion`: camera cuts instantly, character motion freezes, card/veil transitions collapse to fades. Implemented in `use-character-motion.ts` and `camera-rig.tsx`, media-query-driven in CSS.

## 5. Accessibility checklist (current state)

- [x] Canvas `role="img"` + descriptive label
- [x] Roster buttons mirror 3D click targets; `aria-current` selection
- [x] Info card `role="dialog"`, labelled, Esc closes, focus in/out managed
- [x] Toggles use `aria-pressed`; plain actions do not
- [x] Focus ring: 2px accent + 4px white halo, survives on canvas
- [x] Text contrast ≥ 4.5:1 (values in §1)
- [x] Reduced motion honoured end to end
- [ ] Touch-target audit on mobile chrome (roster pills < 44px tall) — open
