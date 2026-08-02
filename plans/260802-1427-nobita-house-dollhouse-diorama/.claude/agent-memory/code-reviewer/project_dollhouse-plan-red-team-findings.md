---
name: dollhouse-plan-red-team-findings
description: Outcome of the 2026-08-02 adversarial review of the dollhouse plan — 2 blockers and 6 high findings that must be fixed in the phase files before implementation
metadata:
  type: project
---

Adversarial review of `plans/260802-1427-nobita-house-dollhouse-diorama/` on 2026-08-02 returned **not safe to implement as-is**. Full report: `plans/reports/from-red-team-to-lead-260802-1427-dollhouse-plan-adversarial-review.md`.

**Why:** the two blockers are silent-failure defects that pass every gate the plan defines for itself — (1) Phase 3's north/west wall-ownership rule contradicts Phase 2's authored `WallSpec` data, so interior partitions get built zero times while T9 and SC-7 both pass; (2) Phase 8's `toEntry()` omits the instance index, so the 13 objects belonging to `count > 1` props collapse onto `#0` on reload, and the round-trip test cannot see it. Six HIGH findings are cross-phase contract breaks (`roomAzimuth` argmax inverted; `houseBox` includes the yard; nobody hides 2F props; Phase 6 lacks the `anchorWorld` path that Reconciled #8 claims is unnecessary; Phase 5 redeclares `export const CAMERA`; literal `65` in Phases 7/8/9 vs the real 63/54).

**How to apply:** these are edits to phase files, not redesigns. Settle Phase 3's data/builder wall contract before any code is written — it is the one that forces rework if deferred. Treat the plan's own `plan.md` §Reconciled contracts as authoritative but **not** exhaustive: reconciliation #8 was verified wrong, and Phases 7/8/9 were never updated to honour #5.

Verified sound and not to be re-litigated: both floor tessellations are numerically exact, Phase 4's gltf-transform CLI table is accurate, and Phase 5's `controls.enabled = false` assumption holds — see [[verified-external-api-facts]].
