# Asset pipeline — Gemini → Hyper3D Rodin → Blender → Mixamo → GLB

Manual steps are marked **(you)**; everything else runs from this repo or through the Blender MCP connection.

## 1. Reference images (Gemini)

```sh
bun run gen:refs -- --subject doraemon      # one subject
bun run gen:refs -- --all                   # every subject, skips existing files
bun run gen:refs -- --subject house --force # regenerate
```

Needs `GEMINI_API_KEY` in `.env`. Default model `gemini-3-pro-image` (2K). Output: `assets/ref/<subject>/{front,left,back,three-quarter}.png`. The front view is generated first and passed back as a reference so the other angles stay consistent.

Subjects: `doraemon`, `nobita`, `shizuka`, `jaian`, `suneo`, `house`.

## 2. Image-to-3D on hyper3d.ai **(you)**

Per subject, in the Rodin web UI:

| Setting | Value |
|---|---|
| Mode | Image to 3D, **multi-view**: upload `front`, `left`, `back`, `three-quarter` (front first) |
| Quality | highest your plan allows |
| Pose / character option | keep the input pose (A-pose). Do **not** let Rodin re-pose or auto-rig; Mixamo does that later |
| Material / texture | PBR or "shaded" with textures on |
| Export | **GLB**, textures embedded |

Save as `assets/raw/<subject>.glb` (gitignored). File names must match the subject ids above.

## 3. Blender cleanup (me, via MCP)

Scripts live in `scripts/blender/`. For each raw GLB: decimate (character ≤ 30k tris, house ≤ 60k), feet/ground at z = 0, pivot at ground centre, face −Y (exports as +Z), scale to canon height (Doraemon 1.29 m, Nobita 1.40, Shizuka 1.38, Gian 1.57, Suneo 1.35; house 8.4 m wide), apply transforms.

- House → `public/models/house.glb` directly.
- Characters → `assets/raw/mixamo-in/<id>.fbx` (mesh + embedded textures, no armature).

## 4. Rigging on mixamo.com **(you)**

1. Upload `assets/raw/mixamo-in/<id>.fbx` → **Auto-Rigger**. Place chin, wrists, elbows, knees, groin markers. Doraemon: choose the *no fingers* skeleton.
2. Download **T-pose**: Format FBX Binary, Skin "With Skin", no animation.
3. Search animation **"Breathing Idle"** → download: With Skin, 30 fps, keyframe reduction none.
4. Search **"Waving"** (the short two-second one) → download the same way.

Save to `assets/raw/mixamo-out/<id>/tpose.fbx`, `idle.fbx`, `wave.fbx`.

## 5. Merge + export (me, via MCP)

`scripts/blender/merge_mixamo.py` imports the T-pose, attaches `idle` and `wave` as NLA clips, strips the `mixamorig:` bone prefix, exports `public/models/characters/<id>.glb`.

## 6. Optimise

```sh
bun run assets:build   # gltf-transform: weld → simplify guard → resize textures → meshopt
```

The app (`src/scene/model-or-proxy.tsx`) HEAD-checks every model URL at start. Anything missing renders as a placeholder, so partial delivery is fine.

## Fallback

If a character rigs badly in Mixamo, set `animationMode: 'procedural'` for it in `src/data/characters.ts` (planned in Phase 4) and the app bobs/tilts the static mesh instead.
