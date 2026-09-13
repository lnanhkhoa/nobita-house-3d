---
title: "An open iron gate, and walk spacing restored after an outside edit"
date: 2026-09-13
summary: Replaced the sliding wooden gate with two iron leaves open 70° into the yard; fixed the rotation mirror in env_build.py; nudged Gian and moved Dekisugi right of Suneo after an outside edit broke walk spacing
---

# An open iron gate, and walk spacing restored after an outside edit

## What happened
- The user asked for Nobita's gate to be an open iron frame. The reference image shows two dark barred leaves standing open into the yard. I built them in `env_build.py`, 20 box members in the new `iron` colour, hinged on the inner post faces.
- `env_build.py` flips every object's Y just before export, which is only correct for unrotated, symmetric boxes. A leaf turned about Z would have exported with its rails pointing the wrong way. The flip loop now also negates the Z rotation. The only existing rotated objects, the vent crosses, turn about Y, so nothing else changed.
- I verified the exported GLB directly. The latch stiles sit where the hinge maths puts them, and each rail's local X axis is parallel to its leaf (dot 1.000).
- Rebuilding `environment.glb` ships whatever the env scripts currently say, and other sessions had uncommitted changes in them (lawn patches removed, new colours). Before relying on the build, I compared node groups against the backup. The old build had 248 nodes, 6 of them wooden gate parts; the new one has 262 = 248 − 6 + 20. Nothing else visible changed.
- Mid-task, `characters.ts` was edited from outside: Shizuka moved to 0.75 in `think`, and Dekisugi to (3.73, 6.8) in `talk`. The walk-route test failed at 0.29 m. The user asked to keep that intent and nudge x.
  - Left side: Gian 0.2 → 0.05 was enough.
  - Right side: spacing allowed Dekisugi only x 3.30–3.33. There `talk` (x −0.35..+0.48) met Doraemon's hand, so he moved right of Suneo to 4.73 (user's pick), 16 cm in front of Suneo's hanging feet.

## Result
- Tests 84/84, typecheck and lint clean.
- Headless screenshots show the open gate, and no character touches another or the gate.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
