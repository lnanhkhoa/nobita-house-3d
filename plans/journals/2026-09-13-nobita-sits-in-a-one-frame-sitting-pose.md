---
title: Nobita sits in a one-frame Sitting Pose
date: 2026-09-13
summary: "Merged sitting-pose into Nobita only, checked it before placing it, lowered it onto the pavement and moved Doraemon aside"
---

# Nobita sits in a one-frame Sitting Pose

## What happened
- The user asked for Nobita to sit in a new Mixamo download, `sitting-pose.fbx`. I merged it into Nobita's GLB only, passing all nineteen existing clips plus the new one. Nobita now ships at 1.09 MB; the previous files are backed up in `assets/raw/backup-260913-nobita-before-sitting-pose/`.
- Following the last round's lesson, I rendered the clip on its own skeleton before placing it. It is a floor sit: knees up, feet forward, hands down by the feet. The merged mesh matches the source.
- My first joint-height numbers all read 0.00. The script had divided world-space metres by an armature-space leg length, so the fault was in the measurement, not the clip. I re-measured on the merged mesh in metres.
- The clip is two keys one frame apart, so its glTF duration is 0.033 s. I checked it wasn't 0 before relying on `LoopRepeat`: a zero duration would divide by zero in three.js's loop wrap.
- The measurements gave three things to fix:
  - Lowest skin 3.1 cm above the origin: the ground clamp only raises, never lowers.
  - 0.89 m forward reach: the toes stop at 7.29, short of the kerb at 7.7.
  - Right side reaches +0.43, which would overlap Doraemon's −0.43 at x 2.45.

## Decision
- Nobita holds `sitting-pose` with `rest.offset` y −0.031.
- Doraemon moves from x 2.45 to 2.6: 4 cm clear of Nobita, 7 cm clear of Dekisugi, 0.73 m from him in x for walk spacing.
- Headless screenshots show Nobita on the pavement with clear gaps either side. Tests 84/84, typecheck clean, lint clean after formatting.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
