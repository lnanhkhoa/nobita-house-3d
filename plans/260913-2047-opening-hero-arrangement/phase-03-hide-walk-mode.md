---
phase: 3
title: "Hide walk mode and verify the scene"
status: pending
priority: P2
effort: "1h"
dependencies: [2]
---

# Phase 3: Hide walk mode and verify the scene

## Overview
Take the Walk button out of the UI so nobody can trigger the seated-to-walking snap, update the
scene's accessible description, and verify the arrangement against `assets/home.jpg`.

## Requirements
- Functional: no Walk button in `ViewControls`; `walkMode` can no longer become true from the UI.
- Functional: the `<Canvas>` aria-label in `src/app.tsx` describes the new arrangement (who sits on
  the wall, who sits at the gate, who stands) and no longer branches on `walkMode`.
- Non-functional: walk code, store field and tests remain, so re-enabling is a one-line revert.
- Docs: update only where docs describe the Walk button as a current feature.

## Related Code Files
- Modify: `src/ui/chrome.tsx` (remove the Walk button and its two selectors), `src/app.tsx`
  (aria-label), docs that describe walk mode as user-facing, if any
- Do not modify: `src/state/store.ts` (keep `walkMode` and `toggleWalkMode`), walk code

## Implementation Steps
1. Remove the Walk button and the now-unused `walkMode` / `toggleWalkMode` selectors from `ViewControls`.
2. Rewrite the aria-label in `app.tsx` for the new arrangement; drop the `walkMode` selector there.
3. `grep -rn -i "walk mode\|Walk button" docs/ README.md` and adjust any user-facing mention to say it
   is temporarily hidden.
4. Run the tests, typecheck and lint scripts from `package.json`.
5. Start the dev server (check first for one already running on the project port; reuse it), open the
   diorama at the default camera, screenshot, compare with `assets/home.jpg`; also check day and night.
6. Close up on the wall from the side: no body through the coping, no gap under the hips.
7. Stop the dev server if this phase started it.

## Success Criteria
- [x] No Walk button; the rest of the toolbar unchanged.
- [x] Screenshot matches the plan table's order; Nobita seated, standing characters in `idle`
      (headless Chromium, 2026-09-13).
- [x] Gian and Suneo seated on the wall: done in phase 4 (default-camera screenshot).
- [x] Close-up of the wall sitters on the coping: done in phase 4, through the roster fly-to on each
      (no body through the coping; Gian crouches on it, a property of his clip). Not a strict side
      view, and the night preset was not checked.
- [x] Tests, typecheck and lint pass.

## Risk Assessment
- **Unused store action trips lint.** Signal: lint error on `toggleWalkMode`. Response: it is still
  referenced by the store type; if lint still complains, keep the selector out and silence nothing —
  report it and ask whether to delete the action.
- **Label and seat numbers need retuning after seeing it live.** Signal: visible gap or clipping.
  Response: adjust `rest.offset` in `characters.ts`; the wall-seat test tolerance decides what passes.
