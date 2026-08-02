---
name: verified-external-api-facts
description: Empirically verified gltf-transform CLI 4.4.2 and camera-controls 3.1.2 behaviours that Phases 4 and 5 depend on — verified 2026-08-02, avoid re-installing to re-check
metadata:
  type: reference
---

Facts verified by installing the real packages on 2026-08-02 (not from model memory). Re-verify only if the pinned version changes.

**`@gltf-transform/cli@4.4.2`** (`gltf-transform help <cmd>`):
- `weld` — **zero** command-specific options. No `--tolerance`.
- `inspect` — `--format` is `one of "pretty","csv","md", default: "pretty"`. **No JSON output.** This is why `scripts/build-assets.mjs` hand-parses the GLB header for triangle counts; that decision is justified, not gold-plating.
- `simplify` — `--ratio` (0–1, vertices *kept*), `--error` (default 0.0001), `--lock-border`. Help says weld first is "for best results", not a hard requirement.
- `resize` — `--width`, `--height`, `--filter`, plus `--pattern` and `--power-of-two`.
- `meshopt` — `--level` `one of "medium","high", default: "high"`, plus `--quantize-*` and `--quantization-volume`.
- `accessor.count` survives `EXT_meshopt_compression` in the JSON chunk, so post-meshopt triangle counting from the header is exact.

**`camera-controls@3.1.2`**:
- `update(delta)` has **no** `_enabled` guard — a `setLookAt` transition keeps damping while `enabled === false`. (This resolves the item plan.md lists as "Still unverified".)
- The `enabled` setter's `cancel()` only clears `_state`/`_activePointers` for *user dragging*; it never touches `_sphericalEnd`/`_targetEnd`. It also does **not** detach listeners — it resets `touchAction`/`userSelect` and input is gated internally.
- `_createOnRestPromise` attaches a listener to the `rest` event, so `Promise.all([setLookAt(...), setFocalOffset(...)])` resolves correctly; both await the same event.

Pinned versions all exist on npm as of 2026-08-02: vite 8.2.0, typescript 7.0.2, @biomejs/biome 2.5.6, vitest 4.1.10, three 0.185.1, camera-controls 3.1.2, lil-gui 0.21.0, @types/three 0.185.3.

See [[dollhouse-plan-red-team-findings]].
