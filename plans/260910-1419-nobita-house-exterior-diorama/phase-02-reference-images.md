# Phase 2 — Reference image generation (Gemini) + Rodin handoff

## Context
User's Hyper3D Creator plan has no API. User will run image-to-3D manually on hyper3d.ai. I supply the images.

## Requirements
- `scripts/gen-ref-images.mjs` using `@google/genai`, key from `.env` `GEMINI_API_KEY`. Never log the key.
- Default `gemini-2.5-flash-image` at 1K, three views (front / left / three-quarter) on plain white bg. Pro model and 2K available behind `--model` / `--size`.
- Subjects: `doraemon`, `nobita`, `shizuka`, `jaian`, `suneo` (A-pose, arms ~45° from body, feet apart, neutral face, no props), `house` (exterior, no fence/trees, canonical cream walls, blue-grey kawara roof, brown shutters).
- Shared style prefix: "3D rendered, Stand By Me Doraemon movie style, soft studio lighting, clean white background, full body, centered, no shadow on ground".
- Output `assets/ref/<subject>/<view>.png` + `assets/ref/README.md` with the exact Rodin settings to use (image-to-3D, multi-view, quality high, T/A-pose retained, export GLB, filename `<subject>.glb` → `assets/raw/`).

## Steps
1. Write script with `--subject` and `--all` flags; retries on 429.
2. Generate `doraemon` first → user eyeballs style → then `--all`.
3. Hand off list to user.

## Validation
Images open; all views same character/colours; house matches anime facade.

## Risk
Gemini refuses trademarked characters by name → fallback prompt describes appearance without names ("blue robotic cat with white belly, red collar, bell").

## Status 2026-09-10

Generated with `gemini-3-pro-image` at 2K:

| Subject | Views on disk |
|---|---|
| doraemon, nobita, shizuka, jaian | front, left, back, three-quarter |
| suneo | front, left |
| house | none |

Run halted by `RESOURCE_EXHAUSTED`: *"Your project has exceeded its monthly spending cap"* (Google AI Studio project spend cap, not a rate limit). Raise the cap at https://ai.studio/spend, then re-run `bun run gen:refs -- --all` — existing files are skipped, so it only generates what is missing.

### Cost change 2026-09-10

The first run used `gemini-3-pro-image` at 2K with four views, 18 images total, and exhausted the project's monthly spend cap. Defaults are now `gemini-2.5-flash-image` at 1K with three views. Back views already generated for doraemon, nobita, shizuka and jaian are kept, since deleting paid-for assets saves nothing.

Still missing: `suneo/three-quarter`, and all three views of `house`.
