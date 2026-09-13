# Code review: opening arrangement (six characters after assets/home.jpg)

Scope: only this feature's hunks in characters.ts, character.tsx, characters.test.ts, chrome.tsx, app.tsx and the docs. The walk, stride, music and studio-link hunks come from other sessions and are not reviewed.

## Critical / High
None.

## Medium
1. **The plan no longer matches the code.** plan.md still lists Gian and Suneo sitting on the wall, Suneo at x 4.6, a `wall.copingTop` value and a wall-seat test. The code has no wall sitters and puts Suneo at x 5.2 (`src/data/characters.ts:136`). The phase status still says "pending". Failure scenario: the next session works from plan.md and builds against a table that is out of date. Fix: the lead updates the table and marks the wall-sit work as deferred.

## Low
2. **Nobita stands up for a moment on load, or bows briefly if already selected.** In `src/scene/character.tsx:162`, `clips` starts out all false, so `resting` is false on the first commit. The sit clip then fades in over 0.2 s (`:78`), so Nobita sinks from his standing pose to sitting. If he was selected while his placeholder model was showing, the welcome effect runs with `greet=true` before the clip check updates `clips`. The bow then starts and fades out over 0.15 s. Fix: on first mount, play the rest clip at full weight with no fade. Or work out whether the GLB has each clip during render (`gltf.animations` is available right away) instead of in an effect.
3. **The rest offset jumps while the clip fades.** At `:201` the offset switches instantly while the sit clip blends in or out over 0.2 s. Nobita's offset is zero, so nothing shows today. A future wall sitter would jump 1.67 m while still in a standing pose.
4. **The idle sway still runs on the seated body.** Yaw of ±0.022 rad swings Nobita's toes, 0.67 m out, by about ±1.5 cm. The squash also adds a second breath on top of "Sitting Idle". The plan already names this risk.
5. **The reorder changes the roster order and tab order** (`src/ui/chrome.tsx:66`), and the breathing phases (`character.tsx:172`). It follows from the new left-to-right order, but it goes against the plan's line "nothing else in the UI changed".

## Checks
- (a) Order, poses, no greeting while seated and no Walk button: all met in code. The screenshot criterion was not verified here.
- (b) `sampleWalk` homes and the home test use `characters` positions and the same index as `scene.tsx`, so they stay consistent. Camera focus uses `def.position` (offset is zero). The studio default is looked up by id. `walkMode` has no other trigger and is not persisted.
- (c) In reduced motion the fade still finishes, because weight follows mixer time, not the paused action's time. Rest, welcome and walk effects each have their own dependencies, so selecting a character does not restart the sit clip.
- (d) Comment style matches existing code.
- (e) `RestPose` and `rest?` are additions only. `WelcomeProbe` was internal.

All six GLBs contain `sit`.

Status: DONE_WITH_CONCERNS
