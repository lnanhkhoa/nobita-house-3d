---
title: "Opening arrangement of the six characters after assets/home.jpg"
description: "At rest the gang sits and stands round Nobita's gate like the hero illustration: Gian and Suneo on the front wall, Nobita sitting at the gate, Shizuka, Doraemon and Dekisugi standing. Walk mode is hidden for now."
status: pending
priority: P2
effort: "5h"
branch: main
tags: [r3f, characters, animation, layout]
created: 2026-09-13
blockedBy: []
blocks: []
---

# Opening arrangement of the six characters after `assets/home.jpg`

## Contract

**Outcome.** On page load, walk mode off, the six characters are placed and posed as in
`assets/home.jpg`, with Dekisugi added (user decisions, 2026-09-13):

| Left → right | x | Where | Pose | Clip |
|---|---|---|---|---|
| Gian (`jaian`) | 0.05 | On the front wall coping, left of the gate | Sitting, laughing | `sit-wall-laugh` |
| Shizuka | 0.75 | Sidewalk, below and right of Gian | Standing, thinking | `think` |
| Nobita | 1.7, z 6.4 | At the gate, on the ground | Sitting, knees up, feet forward | `sitting-pose`, lowered 3.1 cm (earlier `sit`, and `sit-ground-happy`, whose crossed shoes clipped) |
| Doraemon | 2.6 | Beside Nobita, clear of his spread feet | Standing | `stand-cheerful` |
| Suneo | 4.03 | On the front wall coping, between the right gate post and the pier at 4.5 | Sitting, talking | `sit-wall-talk` |
| Dekisugi | 4.73, z 6.8 | Out on the sidewalk, right of Suneo | Standing, talking | `talk` (earlier a wall lean in `stand-calm` at 3.33) |

Shizuka's and Dekisugi's clips and spots were changed outside this session on 2026-09-13; the x
values above then moved Gian and Dekisugi just enough to restore walk spacing. Neighbours are
≥ 0.7 m apart in x (Gian–Shizuka and Suneo–Dekisugi are the tightest): the walk loop keeps that
spacing, and round its 0.45 m fillets 0.7 m of path still clears the 0.6 m walk-route test. Between
Doraemon and Suneo only x 3.30–3.33 met that spacing, and there `talk` put Dekisugi's hand into
Doraemon's, so he moved right of Suneo (user decision).

The gate behind Nobita is now two wrought-iron leaves standing open 70° into the yard, after the
reference image (`scripts/blender/env_build.py`, `iron` in `env_helpers.py`).

Walk mode is **temporarily removed** from the UI (user decision, 2026-09-13): no seated-to-walking
transition is built. The walk code and its tests stay in the repo, untouched in behaviour.

**Constraints.**
- `src/data/walk-routes.ts` and `src/scene/walk-clock.ts` unchanged; their tests stay green with the
  new home spots. `position` stays the feet anchor on the sidewalk (the walk-loop home), and a
  seated pose is an extra offset on top of it, so walk mode can come back later without a rewrite.
- Clip availability is read from the loaded GLB, as everywhere else: a character whose GLB lacks
  `sit` stands on its `position` instead of hovering at the seat offset.
- No new runtime dependency, no new Mixamo download, no Blender rebuild — unless phase 1's
  decision gate says otherwise and the user agrees.

**Non-goals.** Camera framing, opening the gate, a gate step, a stand-up or hop-down transition,
the `idle` clip at rest (that is phase 4 of `260912-1356-character-studio-mixamo`, which should
build on the rest-clip path added here).

**Acceptance criteria.**
- Default-camera screenshot on load matches the table: order, who sits, who stands.
- Gian's and Suneo's hips rest on the wall coping (top at y 1.67) with no body through the wall
  and no visible gap; Nobita's hips on the ground, feet not through the sidewalk.
- Selecting a seated character opens the card without the character standing up or hopping.
- No Walk button; nothing else in the UI changed.
- `bun run test`, typecheck and lint pass.

## Phases

| # | Phase | Status | Depends on |
|---|---|---|---|
| 1 | [Measure the `sit` clip and the seats](./phase-01-measure-sit-clip.md) | Pending | — |
| 2 | [Home spots and seated rest pose](./phase-02-seated-rest-pose.md) | Pending | 1 |
| 3 | [Hide walk mode and verify the scene](./phase-03-hide-walk-mode.md) | Pending | 2 |
| 4 | [Per-character resting clips after the image](./phase-04-per-character-clips.md) | Pending (waiting on manual Mixamo downloads) | 2 |

Standing characters hold `idle` at home when their GLB carries it (user decision 2026-09-13, after
the Mixamo GLBs showed a T-pose at rest).

## Key risk

One `sit` clip has to serve two different seats: the wall coping (hips at 1.67 m, legs hanging,
needs a chair-type sit) and the ground at the gate (needs a floor-type sit). Whichever type the clip
is, one of the two seats will not fit. Phase 1 measures it and stops at a decision gate before any
code is written.

## Correction to the brainstorm

The brainstorm proposed that a seated character waves instead of bowing. Mixamo `Waving` is a
standing clip: it would stand the character up on the wall. Seated characters play no greeting
clip and no procedural hop; selection only opens the info card.
