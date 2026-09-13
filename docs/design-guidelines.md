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
| Performance | paper card stacked under the title: FPS with a status dot (green ≥55, amber ≥30, red below), then frame / worst-frame ms, draw calls and triangles in tabular monospace; averaged over 500 ms windows by `scene/perf-probe.tsx`; not a live region |
| View controls | top-right toolbar, two groups split by a hairline: **Camera** (Reset view as a plain action; Auto-rotate as an `aria-pressed` toggle. The Walk toggle is hidden since 2026-09-13 because a seated character has no way to stand up and set off; the walk loop and `walkMode` in the store remain, so restoring the button in `ui/chrome.tsx` brings it back) and **Time of day** (Dawn / Morning / Sunset / Night). The time group is a `<fieldset>` of real radio inputs styled as chips — one choice is active at a time and arrow keys move between them; the input stays in the layout at zero opacity so focus and keyboard behaviour survive. |
| Roster | bottom-left pill row, one button per character with colour swatch; `aria-current` on selection; doubles as the keyboard/SR path to character selection |
| Info card | desktop right panel 360px / mobile bottom sheet; eyebrow in character colour, Fraunces title, kana subtitle, ≤62ch body; Esc closes, focus returns to the roster button |
| Music | last group of the view-controls toolbar (top-right; on mobile it travels with the toolbar to the bottom bar), after a hairline: one `aria-pressed` "♪ Music" toggle. It plays and pauses a looped track of `config.music.src` (`public/audio/background-music.mp3`) through `useBackgroundMusic`. Music auto-plays on load; if the browser blocks sound before a user gesture, it starts on the first click or key press. The on/off choice is saved in `localStorage` (`nobita-house.music`), so a visitor who turned it off stays silent after a reload; the pressed state follows the element's play/pause events; leaving the diorama pauses it. |

Canvas: `role="img"` with a scene-describing `aria-label`; `#ui-root` is `pointer-events:none`, only leaf panels re-enable.

## 4. Motion

| Event | Duration |
|---|---|
| Button hover / press | 120 / 90 ms |
| Card in / out | 280 / 180 ms (mobile sheet 320) |
| Camera fly (`CameraControls`) | smoothTime 0.35 |
| Character idle | breath ~1.55 Hz bob + squash, slow sway, phase-offset per character |
| Time-of-day change | ~1.4 s exponential ease on sun direction, light colour/intensity, background and fog; stars cut in once the sky has darkened |
| Resting pose | a character with `rest` in `characters.ts` loops that clip at home (Nobita sits on the ground at the gate in `sit`), shifted by `rest.offset`; it stands on its spot if its GLB lacks the clip |
| Select greeting | ~0.95 s dip → hop → settle, slight yaw wave; held back while out walking, played on arrival home if still selected; a resting (seated) character never greets |
| Walk mode (UI hidden since 2026-09-13) | 1 m/s round the block, reached in 0.6 s and braked as fast; five characters swing their legs through the authored `walk` clip, one cycle per stride of ground, and Doraemon waddles procedurally; the procedural step bounce halves and the waddle drops where the clip plays; a slight forward lean replaces the idle; yaw turns toward the route at ~8 rad/s; 0.35 s standstill to turn round |
| Walker follow | the selected walker is tracked with a 0.2 s ease, keeping the user's orbit angle; turning onto another street swings the eye to the street side once if a lot wall would hide the walker |

`prefers-reduced-motion`: camera cuts instantly (a followed walker is tracked without easing), character idle and procedural gait motion freeze while walk mode still walks them round the block and their authored leg clip keeps stepping, time-of-day snaps rather than eases, card/veil transitions collapse to fades. Implemented in `use-character-motion.ts` and `camera-rig.tsx`, media-query-driven in CSS.

## 5. Accessibility checklist (current state)

- [x] Canvas `role="img"` + descriptive label
- [x] Roster buttons mirror 3D click targets; `aria-current` selection
- [x] Info card `role="dialog"`, labelled, Esc closes, focus in/out managed
- [x] Toggles use `aria-pressed`; plain actions do not
- [x] Focus ring: 2px accent + 4px white halo, survives on canvas
- [x] Text contrast ≥ 4.5:1 (values in §1)
- [x] Reduced motion honoured end to end
- [ ] Touch-target audit on mobile chrome (roster pills < 44px tall) — open
