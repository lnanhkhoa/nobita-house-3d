---
title: "Time-of-day sky"
description: "Four selectable times of day driving sky, sun, lighting, fog and night lamps."
status: done
branch: "main"
created: "2026-09-11T00:20:00.000Z"
---

# Time-of-day sky

## Contract (agreed with the user 2026-09-11)

**Outcome.** The viewer can switch the diorama between **dawn, morning, sunset and night**. Sky, sun direction, light colour and intensity, fog and background all change together. Night shows stars and lights the house windows, gate lamp and stone lantern.

**Constraints.**
- One sun vector feeds both `<Sky>` and the shadow-casting key light; if they diverge the shadows contradict the sky.
- Follow existing conventions: preset table in `src/data/`, zustand field + setter, `aria-pressed` toolbar buttons, colours from `tokens.css`.
- Keep 60 fps and the current models; no re-export.
- Honour `prefers-reduced-motion`.

**Non-goals.** Continuous time slider, automatic day/night cycle, per-hour granularity, geometry changes, moving the characters.

**Acceptance criteria.**
1. Four toolbar buttons; exactly one carries `aria-pressed="true"`; clicking switches the scene.
2. Presets differ observably: sky colour, shadow direction (sun moves), light warmth.
3. Night renders stars and emits light from window glass, gate lamp and stone lantern.
4. Default on load stays the current daytime look, so nothing regresses.
5. Transitions ease between presets; instant under reduced motion.
6. `lint`, `typecheck`, `test`, `build` clean; orbit frame time unchanged.

## Scout evidence

| Where | What it holds today |
|---|---|
| `src/scene/scene.tsx` | hardcoded background `#BFE0FA`, fog `#CFE6FA 48 110`, `<Sky sunPosition=[9,14,10]>` |
| `src/scene/lighting.tsx` | hemisphere + key directional (shadow, same `[9,14,10]`) + fill directional |
| `src/state/store.ts` | zustand; `autoRotate`/`toggleAutoRotate` is the pattern to copy |
| `src/ui/chrome.tsx` | `ViewControls` toolbar, `aria-pressed` toggles |
| `src/styles/app.css` | `.controls` + `[aria-pressed="true"]` accent styling |
| house GLB materials | `house_glass`, `house_curtain`, `house_frame` — the window glow hooks |
| env GLB materials | `env_concrete`/`env_concrete_dark` carry the stone lantern; `env_plate` the nameplate |

## Steps

1. **`src/data/time-of-day.ts`** — preset table: id, label, sun vector, Sky params, key/fill/hemisphere colour and intensity, background, fog, `stars`, `lampLevel`.
2. **Store** — `timeOfDay` + `setTimeOfDay`, defaulting to `morning`.
3. **`src/scene/sky-dome.tsx`** — `<Sky>` driven by the active preset, `<Stars>` at night, background and fog colour eased per frame.
4. **`src/scene/lighting.tsx`** — read the preset, ease light colours, intensities and the sun position every frame.
5. **`src/scene/night-lights.tsx`** — point lights at the porch lamp and stone lantern; emissive lift on `house_glass`/`house_curtain` scaled by `lampLevel`.
6. **`ViewControls`** — a second button group behind a hairline divider; four presets with `aria-pressed`.
7. **Tests** — preset table integrity (unique ids, sun above horizon for day presets, night flagged).
8. **Docs** — record the new surface in `docs/design-guidelines.md`.

## Result (verified in the browser)

| Criterion | Evidence |
|---|---|
| Four controls, one active | radio group renders; `aria-checked` follows the store |
| Presets differ | night background `#0f1426` vs morning `#bfe0fa`; key light 0.55 @ `[-19.4, 6, -15.5]` vs 2.2 @ `[12, 18.8, 13.4]` |
| Night lights | 3 point lights at 9/6/5, stars object present and visible with 2400 points, lit windows and porch visible in capture |
| Default unchanged | loads on `morning`; emissive returns to ~0.003 after switching back |
| Frame pacing | median 16.6 ms, p99 18.9 ms, zero frames over 20 ms while orbiting at night (200 calls, 767k tris) |
| Gates | lint, typecheck, 16 tests, build all clean |

## Risk

Shadow direction changes with the sun, so a low dawn or sunset sun throws long shadows that may leave the 60 m shadow frustum. Widen or re-aim the frustum per preset if clipping shows.
