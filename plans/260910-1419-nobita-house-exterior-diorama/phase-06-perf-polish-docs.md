# Phase 6 — Perf, polish, docs

**Done 2026-09-10.**

- Measured (M4, headless Chromium): 60 FPS, 76 draw calls, 511k tris, 18 textures, 16 MB models. Draw calls were 304 before `flatten`+`join` landed in `build-assets.mjs`.
- `docs/tech-stack.md` rewritten for React + R3F + bun; records the SoftShadows/three-0.186 trap, the React `~19.2` pin, coordinate conventions, and measured numbers.
- `docs/design-guidelines.md` trimmed to the six shipped surfaces; `src/styles/tokens.css` declared the token source of truth. Old dollhouse spec remains in git history.
- Review: self-review pass over `src/`; one cleanup applied (foliage height measurement no longer clones the scene). Data tests green; no E2E per original decision.
- Open: mobile-device pass (FPS + touch-target audit), root README (blocked by repo markdown-location rule).
