# Phase 5 — Web app: scene, animation, interaction, UI

## Requirements
- `character.tsx`: `useGLTF` + `useAnimations`; idle loop; on select → `wave` once (`LoopOnce`, clampWhenFinished) → crossfade back to idle. Hover = subtle outline via drei `<Outlines>` or emissive lift.
- Click/tap on character or on its name in the UI → store `selectedCharacterId` → camera-rig flies to a pre-computed framing (`CameraControls` from drei, `setLookAt` damped) → info card.
- Info card (right panel desktop, bottom sheet mobile), Esc closes, focus returns. Reuse tokens from `docs/design-guidelines.md` §1–3 (paper/ink + Doraemon blue accent), Fraunces + Hanken Grotesk.
- View controls: Reset View, Auto-rotate.
- Loading veil with `useProgress`.
- Lighting: sky gradient bg, drei `<Sky>` or flat colour, soft shadows (`<SoftShadows>` or `ContactShadows`), `ACESFilmic` off / neutral tone mapping to keep saturated Doraemon blue.
- Camera limits: minPolar 0.15π, maxPolar 0.48π, distance 6–30 m, target locked to lot centre unless framing.
- Character DOM names list in an sr-only nav for a11y; canvas `role="img"` + aria-label.

## Files
`src/scene/*`, `src/ui/*`, `src/state/store.ts`, `src/data/characters.ts` (bios, English).

## Validation
All 6 acceptance criteria except perf; keyboard walkthrough; reduced-motion honoured (instant camera cut, idle still plays).
