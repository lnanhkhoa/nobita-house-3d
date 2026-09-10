# Phase 6 — Perf, polish, docs

- Measure: r3f-perf or stats; draw calls, tris, GPU ms on desktop + iPhone Safari. Fix by merging env meshes, lowering shadow map, LOD-free (scene is small).
- Texture cap 1024 for characters, 2048 house; KTX2 only if texture memory > 40 MB.
- Rewrite `docs/tech-stack.md` (React + R3F, new asset pipeline, removed items) and trim `docs/design-guidelines.md` to the surfaces that exist (loading veil, info card, view controls, credits). Add `docs/asset-pipeline.md` (Gemini → Rodin → Blender → Mixamo runbook).
- README with run instructions + attribution.
- Final review via code-review skill.
