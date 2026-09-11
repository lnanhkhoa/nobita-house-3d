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

- **Street lamp intensity was far too low.** The lenses glowed but cast nothing: at 4.6 m over dark asphalt with decay 2, intensity 14 left the road at its ambient 47/255. Swept to find the usable band — 90 reads, 140 is right, past ~220 the wall and characters blow out. Shipped at 140 with distance 26, measured road luminance 133/255.

Verified: five materials glow at night and all five restore to `#000000` @ 1.0 in daylight; 8 point lights on at night, 0 in daylight; night orbit median 16.7 ms, p99 18.6 ms, no frame over 20 ms.

**Measurement trap worth remembering.** The first intensity sweep showed road luminance frozen at 46.7 across 14 → 3000, which looked like "the lights do not reach these surfaces". The frame loop rewrites `light.intensity` from `userData.baseIntensity` every frame, so setting `intensity` from the console is erased before the next draw. Tuning has to go through `userData.baseIntensity`. A first frame-pacing reading of 32 ms median was likewise noise from measuring during a shader recompile right after a camera jump; three settled runs all came back at 16.7 ms.

## Correction 2026-09-11: the night sky never actually worked

The user reported no starry sky at night. Both earlier "verified" claims about the stars were wrong:

- **Stars were still clipped.** drei's starfield shader emits `vec4(position, 0.5)`, i.e. each star at **twice** its geometric radius. The review fix (radius 120 / depth 40) was verified by measuring geometry positions, 121–180 m, which ignored the doubling: the real distance was 240–320 m, past `camera.far` 200. Proof: at far 200 no star showed; raising far to 3000 made them appear. The stars now sit in a rig that follows the camera at radius 45 / depth 20, i.e. 90–130 m actual.
- **The Preetham sky has no night.** Its fragment shader keeps an ambient floor (`L0 = 0.1 * Fex`) raised through a 1/2.4 gamma, so below the horizon it still outputs about 35% grey — measured sky mean 87/255, a muddy brown. A camera-centred gradient dome (zenith `#03060F`, horizon = eased fog colour so the ground seam disappears) now fades in over it, keyed on the same night level as the stars. The Sky-reads-dark comment in the preset table was removed.

After the fix, at the real far plane: sky band mean 23/255 (was 87), stars rasterise, dome and stars fully off in dawn/morning/sunset. Cost: an interleaved A/B over four rounds showed the same slow-frame count with and without dome and stars (215 vs 236 of ~480); the machine was under load from Blender and a second browser running the app, so absolute frame times from that run are not representative.

Lesson: verify that pixels appear, not that geometry exists.

## Replaced the Preetham sky entirely, 2026-09-11

The user asked what a morning sky should hold. Measured: looking up in the morning the sky was pure white, 255/255/255 across the band, against the hero reference's clear blue (mid 120/190/252) with fair-weather cumulus. Same root cause as the grey night: Preetham emits HDR radiance meant for tone mapping, which this project turns off to keep Doraemon blue saturated, so it clipped to white by day and floored at grey by night.

- **One art-directed gradient dome for all four presets.** Zenith colour per preset; horizon is the eased fog colour, so fogged ground meets sky without a seam at any time of day; a two-lobe halo around the sun for dawn and sunset. `SkyParams` and the `background` field (never visible behind the dome) are gone from the preset table.
- **Clouds.** Sixteen cumulus billboards on a camera-centred shell, texture drawn at startup into a canvas (no asset, no Gemini), tint and opacity from the preset: white morning, pink dawn, lit orange sunset, off at night.
- **Fitted to what the camera actually frames.** The orbit camera always looks down at a target near the ground, so the frame only shows the sky from the horizon to roughly 10–15 degrees. The first cloud ring at 7–28 degrees had zero clouds on screen; they now sit at 4–13 degrees and peek over the rooftops. The gradient reaches the zenith colour by ~8 degrees with a smoothstep, whose zero slope at the horizon also removed a hard line the earlier pow curve drew there.
- Mirrored clouds use a negative scale; three flips face culling for meshes but not sprites, so the sprite material is double-sided.

Cost: clouds interleaved on/off over three rounds, 16.6–16.7 ms median both ways, no frame over 20 ms.

## Sun disc, 2026-09-11

- **Drawn in the sky shader**, no extra draw call: a flat bright disc of ~2.2 degrees radius with a tight bloom, coloured per preset (warm white morning, peach dawn, orange sunset, off at night).
- **Elevation is capped for display at 7 degrees.** The morning sun sits at 46 degrees and the orbit camera never frames the sky above ~14, so a truthful disc would never appear. The disc keeps the true azimuth, so it still lines up with the shadows; the key light keeps the true vector. At 9.5 degrees the disc landed under the title card and toolbar; projected screen positions were measured per preset to pick 7.
- **Clouds thin out around the sun**, each fading to 22% opacity within 6 degrees of it, because a single cloud drifting past otherwise covered the disc for minutes. That needed a material per cloud, at no extra draw calls since sprites are separate draws anyway.
- **The cloud texture was clipped.** A fixed canvas cut the lowest puffs and left a straight horizontal edge on every cloud; the canvas is now sized to the puffs' bounding box.

## Known, pre-existing

A React "change in the order of Hooks" error fires once at mount. Reproduced at `ddbad9f` in a clean worktree, i.e. before both this feature and the block work, so it predates today. Not chased here; worth a separate pass.

## Risk

Shadow direction changes with the sun, so a low dawn or sunset sun throws long shadows that may leave the 60 m shadow frustum. Widen or re-aim the frustum per preset if clipping shows.
