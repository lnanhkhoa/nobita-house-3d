---
title: Two broken-looking animations were real clips in the wrong place
date: 2026-09-13
summary: "Nobita and Dekisugi looked broken; the merge was sound, the clips were a wall lean and a cross-legged sit. Fixed by placement and clip choice, then tightened the group"
---

# Two broken-looking animations were real clips in the wrong place

## What happened
- The user reported broken animations on Nobita (`sit-ground-happy`) and Dekisugi (`stand-calm`): a knee jammed into the shorts, crossed legs with shoes passing through each other.
- First suspect was the merge. All eight new downloads came from a third skeleton, with legs of 26.5 against 39.2 for the old clips and 45.0 for Dekisugi's rig. A bone-direction check could not rule out roll, so I compared full rest rotations. Everything was within ~10° except the feet at ~35°: enough to twist a foot, not to lift a knee.
- The decisive test was a stick-figure render of each source FBX on its own skeleton, bone-parented cylinders under Workbench. The source poses matched the merged GLB renders, so the poses were the clips' own content.
- `stand-calm` is a wall lean with one foot propped behind: the rearmost skin sits 2.5 cm behind the origin and the shoulders 2 cm in front, on one plane. Placed 0.7 m from the wall it read as a broken crouch. The user saw that before I finished measuring and asked to put him against the wall.
- The user then asked to pull Gian, Shizuka and Suneo in. The right side hit a real conflict. Walk-loop spacing needs 0.75 m, a proven value, between Dekisugi and Suneo. Suneo must also clear the pier cap at 4.5, and Dekisugi the gate post at 3.01. No position satisfied all three at 0.75 m.

## Decision
- Dekisugi now leans on the wall at z 5.94, facing square. Nobita is back on the floor `sit`, moved to z 6.4 because its hands reached 9 cm through the gate leaf.
- The new layout, left to right, is Gian 0.2, Shizuka 0.95, Nobita 1.7, Doraemon 2.45, Dekisugi 3.33, Suneo 4.03. Clearances come from each resting clip's width measured over its whole loop.
- Neighbours are at least 0.7 m apart. Round the loop's 0.45 m fillets, 0.7 m of path leaves ~0.63 m, over the 0.6 m test, and the walk-route tests pass (79/79). The tightest physical clearances are 5–7 cm.

## Lesson
- When a Mixamo clip looks broken, render the source FBX before suspecting the retarget. A clip's name says nothing about which prop it expects: a wall, a chair, a ledge.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
