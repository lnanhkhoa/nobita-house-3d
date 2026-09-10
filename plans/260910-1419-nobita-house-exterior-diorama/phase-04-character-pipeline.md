# Phase 4 — Character pipeline: Rodin → Blender → Mixamo → GLB

## Per character (×5)
1. **Import** `assets/raw/<id>.glb` in Blender (MCP). Decimate to ≤ 30k tris, keep UVs, bake nothing (Rodin ships albedo).
2. **Normalize**: feet on z=0, facing -Y (Blender) so it faces +Z in glTF; scale to canon height (Doraemon 1.29 m, Nobita 1.40, Shizuka 1.38, Jaian 1.57, Suneo 1.35); apply transforms.
3. **Pose check**: arms must be away from body. If Rodin produced arms-down, fix with proportional edit / simple bone pose in Blender (fallback documented).
4. **Export** `assets/raw/mixamo-in/<id>.fbx` (mesh + textures embedded, no armature).
5. **User**: upload to mixamo.com → Auto-Rigger (place markers) → download **T-pose** FBX (with skin), then animations **Idle** (Breathing Idle) and **Waving** (with skin, 30 fps, no keyframe reduction). Save to `assets/raw/mixamo-out/<id>/{tpose,idle,wave}.fbx`.
6. **Merge** (`scripts/blender/merge_mixamo.py`): import tpose; import idle & wave as actions; push to NLA as `idle`, `wave`; rename bones prefix stripping `mixamorig:`; export `public/models/characters/<id>.glb` with animations.
7. `npm run assets:build` (meshopt; skinning-safe).

## Fallback (Doraemon or any failed rig)
`character.tsx` supports `animationMode: 'rig' | 'procedural'`; procedural = sin bob + arm-pivot rotation on a named sub-mesh (or whole body tilt).

## Validation
Each GLB has 2 clips; plays in app; skin weights not exploding; file ≤ 4 MB.
