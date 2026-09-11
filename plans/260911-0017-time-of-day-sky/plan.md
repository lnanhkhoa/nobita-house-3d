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
1. Four toolbar controls; exactly one is selected; clicking switches the scene.
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
6. **`ViewControls`** — a second group behind a hairline divider. Implemented as real radio inputs styled as chips rather than `aria-pressed` buttons: exactly one time of day is active, and arrow-key navigation comes for free.
7. **Tests** — preset table integrity (unique ids, sun above horizon for day presets, night flagged).
8. **Docs** — record the new surface in `docs/design-guidelines.md`.

## Result (verified in the browser)

| Criterion | Evidence |
|---|---|
| Four controls, one active | radio group renders; a real ArrowRight keypress moved focus morning → sunset and the scene followed |
| Presets differ | night background `#0f1426` vs morning `#bfe0fa`; key light 0.55 @ `[-19.4, 6, -15.5]` vs 2.2 @ `[12, 18.8, 13.4]` |
| Night lights | 3 point lights at 9/6/5; exactly `house_glass` and `house_curtain` carry a non-black emissive at night, and both restore to `#000000` @ 1.0 in daylight; all 2400 stars sit 121–180 m from the camera, inside `far` 200 |
| Default unchanged | loads on `morning`; emissive returns to ~0.003 after switching back |
| Frame pacing | median 16.6 ms, p99 18.9 ms, zero frames over 20 ms while orbiting at night (200 calls, 767k tris) |
| Gates | lint, typecheck, 16 tests, build all clean |

## Review findings, fixed

A `code-reviewer` pass found four browser-visible defects that every gate had passed:

1. **Emissive leaked across GLBs.** `env_plate` is not unique to the gate nameplate — `streets.glb` and `neighbours.glb` reuse it for pole plates and neighbour signage, so a scene-wide match by material name lit the whole block. Measured three lit instances. `EMISSIVE` is now house-only and the search is scoped to a named `house-root` group.
2. **Load-order race.** The cache gate `touched.length === 0` stopped scanning after whichever GLB resolved first, so the windows could stay dark forever. Now it scans until every target name is found.
3. **Stale dead-band.** Materials captured after the ease settled were never written. Capturing now resets the level so the next frame writes.
4. **The whole starfield was clipped.** `radius 200 + depth 70` put every star 214–289 m from a camera with `far` 200; nothing rasterised. Now 120/40, measured at 121–180 m.

Also: emissive is snapshotted and restored exactly instead of approached; the sky scattering scalars ease like everything else (`<Sky>` is a BackSide box around the camera, so it — not `scene.background` — is what the viewer sees); `prefers-reduced-motion` moved to one shared helper with a live listener, replacing four copies; lamps no longer carry an unrelated `standY` offset; dead `aria-checked` CSS removed and a forced-colors selection cue added.

## Extended 2026-09-11: the whole block lights up

At the user's request the night pass now covers the neighbours and the street lighting.

- **Street lamps did not exist.** `streets_build.py` built poles with crossarms, insulators, a transformer and a sign, but no luminaire. Added a bracket arm, shade and a lens kept as its own material (`env_lamp_lens`) so the app can drive it emissive. The bracket reaches over the carriageway, not back over the lots — the first attempt had it pointing into the gardens.
- **Emissive is now grouped per subtree** (`house-root`, `neighbours-root`, `streets-root`) rather than one flat name table, because material names repeat across GLBs. Neighbour windows glow at 0.8/0.55 against the hero house's 1.15/0.85, so the neighbours stay backdrop.
- **Street lamp point lights are derived from `layout.streets.poles`**, the same table the Blender builder reads, so moving a pole moves its light.

Verified: five materials glow at night and all five restore to `#000000` @ 1.0 in daylight; 8 point lights on at night, 0 in daylight; night orbit median 16.7 ms, p99 18.9 ms, no frame over 20 ms, 141 draw calls.

## Known, pre-existing

A React "change in the order of Hooks" error fires once at mount. Reproduced at `ddbad9f` in a clean worktree, i.e. before both this feature and the block work, so it predates today. Not chased here; worth a separate pass.

## Risk

Shadow direction changes with the sun, so a low dawn or sunset sun throws long shadows that may leave the 60 m shadow frustum. Widen or re-aim the frustum per preset if clipping shows.
