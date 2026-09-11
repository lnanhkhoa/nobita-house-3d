# Perf re-measure after time-of-day + street lamps

2026-09-11 13:47–14:05. Apple M4, Chrome headless-new over CDP, ANGLE Metal, 1280×713 @ DPR 1.
Measured two builds side by side, interleaved in one tab, 3 rounds, alternating order:

- **HEAD** `5c28417` (committed: 11 trees, 23 shrubs, time-of-day, 8 point lights) on :5174 from a worktree
- **worktree** = HEAD + another session's uncommitted planting (26 trees, 42 shrubs) on :5173

Cost = median of 50 `gl.render()` + 1 px `readPixels` (forces GPU sync). Default hero camera.

## Absolute numbers are not trustworthy today

An almost empty frame ("floor": 3 draw calls, 14 triangles — sky, ground, stars, empty shadow
pass) took **25–48 ms median**. On an idle M4 that is ~1–2 ms. The GPU was shared with Blender
(~35% CPU), another session's browser rendering this same app continuously, and WindowServer;
load average 5–7. rAF showed 18–42 fps for the full scene, but that says more about the machine
than about the app. Three of my own failed-run Chromes were also alive during the runs, parked on
a Vite error page with no WebGL loop; they are killed now.

## What survives the noise (paired, same round, same tab)

| Change | HEAD (3 pairs) | worktree (3 pairs) |
|---|---|---|
| Remove the 8 point lights | 90→52, 111→65, 68→46 ms (**−32…−42 %**) | 86→56, 79→55, 60→42 ms (**−29…−35 %**) |
| Hide foliage | 90→75, 111→83, 68→71 ms (−16 %, one pair flat) | 86→67, 79→67, 60→46 ms (−15…−23 %) |
| morning vs night | 85/89/63 vs 90/111/68 — no consistent gap | 88/98/59 vs 86/79/60 — no consistent gap |
| HEAD vs +15 trees +19 shrubs (+47 draw calls) | — | no consistent gap |

1. **The street lamps are the largest single cost, and they cost it all day.** Every one of six
   pairs drops 29–42 % when the point lights leave the light list. Morning costs the same as night
   because `night-lights.tsx` keeps all 8 `pointLight`s mounted and only drives `intensity` to 0;
   three.js still loops over every light in every lit fragment shader.
2. **The frame is fragment-bound, not draw-call-bound.** 47 extra draw calls of planting made no
   measurable difference, while removing per-pixel lighting did. The ≤110 draw-call budget is the
   wrong lever to chase right now.
3. Draw calls: HEAD 197–198, worktree 244–245. Triangles: 764k / 827k.

## Recommendations

1. Take the point lights out of the light list when `lampLevel` is 0 (`visible = false`), so the
   day presets stop paying for them. Cost: one shader recompile when switching into or out of
   night — a one-off hitch on a button click. Further options if night itself is too slow: fewer
   real lights (e.g. porch + 2 nearest lamps) with the rest as emissive + a baked light pool on
   the road.
2. Only then revisit foliage (prop material merge ~36 calls, or `InstancedMesh`).
3. Get a clean absolute number with the machine idle (Blender and other browser sessions
   closed), ideally at DPR 2 where the per-pixel cost matters 4× more.

## Unresolved

- Absolute fps on an idle machine / at DPR 2 — not measurable during this session.

## Fix applied (14:30)

`src/scene/night-lights.tsx`: below `lampLevel` 0.01 the 8 point lights are set `visible = false`,
which takes them out of three's light list; they also mount invisible so the default morning
load compiles the lit shaders once, not twice. `lampLevel` eases exponentially and never quite
reaches 0, hence the threshold (shared with the existing emissive restore).

Only **morning** has `lampLevel` 0 — dawn (0.35), sunset (0.55) and night (1) keep the lamps on
by design, so they are unchanged. Morning is the default preset, i.e. what every visitor loads.

Re-measured with the machine much quieter (load avg ~4, synced frame ~12–17 ms instead of 50–90):

| Check | Result |
|---|---|
| Point lights in the light list, morning / night | 0 of 8 / 8 of 8 |
| Morning, fixed vs lamps pinned visible (old behaviour), 8 alternating pairs | fixed cheaper in **8/8**; median **16.6 → 12.3 ms** (≈ −26 %; per pair −23…−36 %, one −49 % outlier) |
| rAF fps, morning / night | 60 / 60 |
| First switch into a lit preset in a session (cold shader compile) | one 50 ms frame, then one 33 ms |
| Any later switch, either direction | worst frame 17 ms — no hitch (three keeps a program per light state on each material) |

Correction to the table above: the −29…−42 % there was measured under heavy GPU contention and
overstated the effect somewhat; the clean 8-pair figure is about −26 %. The direction and the
conclusion — lamps were the largest avoidable daytime cost — hold.

Screenshots: `lamps-morning.png`, `lamps-night.png`.

Trade-off accepted: before the fix the lamp shaders compiled at startup and switching never
hitched; now the first switch into dawn/sunset/night per session drops ~2 frames. Pre-warming
with `renderer.compileAsync` would remove it, at the cost of timing it against the GLBs'
independent Suspense boundaries — not worth it for a one-off on a button press.
