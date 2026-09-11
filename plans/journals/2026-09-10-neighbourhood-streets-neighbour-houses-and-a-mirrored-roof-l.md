---
title: "Neighbourhood: streets, neighbour houses, and a mirrored roof lip"
date: 2026-09-10
summary: Implemented the four-phase neighbourhood plan in one session; the one real bug was a yaw-independent tilt sign that mirrored roof course lips on three of seven houses.
---

# Neighbourhood: streets, neighbour houses, and a mirrored roof lip

## What happened

Executed `plans/260910-2250-neighbourhood-streets` end to end: layout data + proxies +
camera colliders (phase 1), `streets_build.py` (2), `neighbours_build.py` (3), integration,
measurement and docs (4). The single-lot diorama is now a crossroads with seven neighbour
lots and a coin parking lot.

Two environment surprises shaped the session. The Blender MCP addon was down at the start —
headless `Blender --background --python` was verified as a fallback, but the user asked to
retry and the addon came up, so everything went through MCP. The Claude-in-Chrome extension
never connected, so all browser verification was done by driving Chrome over the DevTools
Protocol directly (`--headless=new`, real Metal GPU on the M4). That turned out better than
the extension would have been: it made `gl.info.render`, `Input.dispatchMouseEvent` and
scripted camera probes available in one script.

## What the review caught

`code-reviewer` returned DONE_WITH_CONCERNS. The substantive finding was mine to own:
`add_courses` passed a roof-lip tilt as `(axis, -sign * PITCH)` and `house_box` rewrote only
the *axis* for quarter-turn lots. But a house-local axis lands on a different Blender axis
**and a different direction** per yaw — local +Z is Blender −Y at yaw 0 and +Y at yaw π — and
`R_x(+t)` sends +Y to `(0, cos, +sin)` while `R_y(+t)` sends +X to `(cos, 0, −sin)`, opposite
z-signs. So the sign was only right for the yaw-π family. Every course lip on `east`, `west`
and `west-back` was mirrored, ~50° off its slope, and already baked into the shipped GLB.

I had reasoned about the axis swap carefully and completely missed that the *sign* needed the
same treatment. What would have caught it: I checked the placement invariant numerically
(TS `houseTransform` vs Blender `gf_*` centres — zero drift on all seven lots) but never
checked the orientation invariant. Normals are as checkable as positions. The fix now
verifies each lip's world-space top-face normal against its own roof shell — max error 0.001
across all seven lots.

Three medium findings were also real: the camera collider was the wall footprint + 0.3 m
while the eaves overhang 0.5 m; the proxy kerbs sat on the road side of each edge where the
GLB puts them on the pavement side; and only the kerb *band* was rounded at the junction, so
a square nub of pavement stood out past the curve.

## Decisions

- **Missed the draw-call and triangle budgets on purpose.** 195 calls / 763k triangles
  against ≤110 / ≤650k. It is not the new geometry — streets + neighbours are 15k triangles
  and 31 primitives, under 4% of the frame. `Foliage` clones a whole GLB per instance, so 34
  plants are 113 of the 195 calls. Both levers the plan itself named were taken (planting
  outside the hero lot stopped casting shadows; the two least visible trees were dropped),
  which got 259 → 195 and 850k → 763k. The rest needs either a prop-GLB material merge or
  `InstancedMesh` foliage — a feature, not a tuning knob. 60 fps holds at every azimuth.
  Cutting delivered content to chase a number that still would not be met is pure loss, so
  the overage was reported with ranked options instead.
- **`+π/2`, not the plan's `−π/2`, for a `+x`-facing house.** Rotating +Z by +π/2 about +Y
  lands on +X in three.js. The plan's sign would have faced the west lots away from the side
  road. A test now discriminates the two.
- **`kerbRadius` 1.5, not 2.0.** A 2 m arc is wider than the 1.9 m sidewalk it belongs to and
  left the corner pole 2 cm inside the kerb.

## Next steps

- Nothing is committed; `streets.glb`, `neighbours.glb`, both new `.tsx` files and the three
  Python builders are still untracked.
- If the draw-call budget ever matters: merge the duplicate `plant_bark` / `plant_bark_textured`
  materials in `plants_build.py` (~36 calls, no visual change), then instance the foliage.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
