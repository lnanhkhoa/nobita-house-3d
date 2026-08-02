# Hyper3D Rodin Manual Asset Pipeline for Three.js Diorama

## 1. Rodin Web UI Export Capabilities

| Feature | Details | Source |
|---------|---------|--------|
| **Export Formats** | GLB, FBX, OBJ, USDZ, STL | [Hyper3D Blog 2026](https://hyper3d.ai/blog/3d-file-formats) |
| **PBR Textures** | Embedded (baseColor, normal, roughness, metallic) | [Hyper3D Docs](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2) |
| **Texture Resolution** | Default 2K; 4K via "HighPack" tier | [Rodin Gen-2.5 Guide](https://www.3daistudio.com/Models/Rodin-Gen-2-5) |
| **Polygon Control** | 2k–200k custom; presets: 4k/8k/18k/50k faces | [Hyper3D UI Features](https://trellis2.com/hyper3d-rodin) |
| **Gen-2.5 Max Output** | 10M+ polygons; geometry 4s, full model 5s | [80.lv Hyper3D Gen-2.5](https://80.lv/articles/how-hyper3d-rodin-gen-2-5-is-bringing-production-level-control-to-ai-3d-generation) |
| **Topology Options** | Quad (cleaner) or triangle (high-fidelity) | [WaveSpeed AI](https://wavespeed.ai/blog/posts/introducing-hyper3d-rodin-v2-text-to-3d-on-wavespeedai/) |
| **Pricing** | Free tier (pay-per-download ~$1.50/credit); Creator $24/mo; Business $120/mo | [Hyper3D Pricing 2026](https://hyper3d.ai/pricing) |

## 2. Model Conventions & Gotchas

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| **Axis** | GLTF = Y-up (Three.js native). No rotation needed. | [Three.js Docs](https://discoverthreejs.com/book/first-steps/load-models/) |
| **Inverted Normals** | Multi-view reconstruction fails on weakly-seen regions. | Blender: Shift+N (Recalculate Outside) |
| **Self-Intersections** | Independent parts collide during reconstruction. | Boolean union in Blender or PrusaSlicer/OrcaSlicer |
| **Non-Manifold** | AI mesh may have open edges; breaks 3D printing validation. | Netfabb in slicer; or self-union Boolean |
| **Pivot/Origin** | Meshes rarely center. Three.js has no auto-centering. | Manual offset in load code or pre-process with gltf-transform |
| **Unit Scale** | Rodin outputs meters; verify with scene scale | Check scene bounds in Three.js viewer |

## 3. Image-to-3D vs Text-to-3D for Style Consistency

| Dimension | Image-to-3D | Text-to-3D | Recommendation |
|-----------|------------|-----------|-----------------|
| **Default Mesh** | 500K triangles (high detail) | 18K quads (cleaner topo) | Text for consistent furniture; image for fine detail |
| **Multi-View Inputs** | 3–5 reference views needed; risks mash-up if views differ | N/A; prompt-based | Image: ensure all views show same object/lighting |
| **Prompt Limit** | N/A | 1024 chars max | Text: be concise; use style keywords (e.g., "mid-century wood chair") |
| **Style Consistency Risk** | **HIGH** if refs vary in lighting/scale | **MEDIUM**; repeatable prompts | Use text-to-3D for ~40–60 prop suite; image for detail refinement |
| **Prompt Tips** | Use 3–5 consistent angle photos; same lighting/background | Include art style + material (e.g., "Danish modern teak sofa, minimal lines") | Batch text generation with fixed seed/mode for consistency |

**Key Risk:** Multi-view image inputs with varying character/pose/lighting produce Frankenstein meshes. Enforce consistent photo guidelines (same object, same angles, same lighting).

## 4. Post-Download Optimization (macOS CLI)

**Recommended npm packages** (latest 2025–2026):
```bash
npm install -D @gltf-transform/cli@4.4.2 gltfpack meshoptimizer
```

**Optimization sequence for low-poly diorama:**
```bash
# 1. Weld & deduplicate vertices
gltf-transform weld input.glb temp1.glb

# 2. Simplify mesh (target 30–50% poly reduction for diorama)
gltf-transform simplify temp1.glb temp2.glb --ratio 0.5

# 3. Resize textures to 1K (sufficient for low-poly)
gltf-transform resize temp2.glb temp3.glb --width 1024 --height 1024

# 4. Compress with Draco (better ratio; decode cost ~5–10ms)
gltf-transform draco temp3.glb temp4.glb --level 7

# Alternative: Meshopt (faster decode; ~95% of Draco ratio)
gltf-transform meshopt temp3.glb temp4.glb --level medium

# 5. (Optional) KTX2 + Basis for textures (requires ETC1S fallback setup)
gltf-transform uastc temp4.glb final-uastc.glb --level 4 --rdo --rdo-lambda 4
gltf-transform etc1s final-uastc.glb final.glb --quality 255

# Simpler: WebP textures
gltf-transform webp temp4.glb final.glb --slots "baseColor"
```

**Draco vs Meshopt:**
| Metric | Draco | Meshopt |
|--------|-------|---------|
| Compression Ratio | ~95% reduction | ~90% reduction |
| Decode Speed | Slower (~10–20ms for complex meshes) | Faster (~5–10ms) |
| Loader Size | ~20 KB (pure JS) or 100 KB (WASM) | ~15 KB |
| **Recommendation** | Budget-constrained bandwidth (mobile) | Real-time sensitive (VR, games) |

For diorama: **Meshopt** preferred (decode speed matters for smooth UX; 90% compression still good).

## 5. Alternatives (Fallback Only)

[Meshy](https://www.meshy.ai) (full pipeline: rigging + 500 animations, ~30s, watertight), [Tripo](https://www.meshy.ai/compare/meshy-vs-tripo) (fast ~10s, generous free tier, no native rigging), [Luma AI](https://www.luma.ai) (photorealistic but needs retopology). Rodin excels at balance of speed, quality, and web-native PBR export. **Do not switch unless Rodin fails the art direction test.**

## 6. Asset Naming & Manifest Convention

**Folder structure:**
```
assets/models/
├── furniture/
│   ├── chair_modern_oak.glb
│   ├── chair_modern_oak.json
│   ├── sofa_sectional_gray.glb
│   ├── sofa_sectional_gray.json
│   └── ...
└── architecture/
    ├── door_frame_wood.glb
    ├── door_frame_wood.json
    └── ...
```

**Naming:** `{category}_{type}_{variant}.glb` (e.g., `chair_modern_oak.glb`).

**Metadata JSON** (`chair_modern_oak.json`):
```json
{
  "name": "Modern Oak Chair",
  "category": "furniture",
  "scale": [1, 1, 1],
  "offset": [0, 0, 0],
  "room": "living-room",
  "hotspot": { "label": "seat", "pos": [0, 0.45, 0] },
  "tags": ["mid-century", "wood", "lounge"],
  "polyCount": 2400,
  "textureRes": "1K"
}
```

**Loader logic:** Scan `assets/models/**/*.json`, load corresponding `.glb` by filename match. Deterministic, human-friendly, no hardcoded paths.

---

## Summary

- **Rodin output:** GLB + PBR (2K default, 4K paid), 2k–200k polys, quad/triangle topo.
- **Three.js compat:** Y-up native; watch for inverted normals, non-manifold, uncentered pivots.
- **Art direction:** Text-to-3D for style consistency (prompt-based, repeatable); image-to-3D for detail (but enforce multi-view discipline).
- **Pipeline:** gltf-transform (weld → simplify 50% → resize 1K → meshopt).
- **Naming:** kebab-case files + per-asset JSON metadata for deterministic loading.

**Key risk:** Inconsistent multi-view photo inputs produce garbage. Enforce style guide + lighting / pose / scale consistency across ~40–60 prop suite.

---

## Sources

- [Hyper3D Blog: 3D File Formats](https://hyper3d.ai/blog/3d-file-formats)
- [Hyper3D Pricing](https://hyper3d.ai/pricing)
- [Hyper3D Gen-2 API Docs](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2)
- [80.lv: Rodin Gen-2.5 Production Control](https://80.lv/articles/how-hyper3d-rodin-gen-2-5-is-bringing-production-level-control-to-ai-3d-generation)
- [Hyper3D Rodin at Trellis2](https://trellis2.com/hyper3d-rodin)
- [WaveSpeed AI: Rodin V2 Text-to-3D](https://wavespeed.ai/blog/posts/introducing-hyper3d-rodin-v2-text-to-3d-on-wavespeedai/)
- [Three.js: Load Models](https://discoverthreejs.com/book/first-steps/load-models/)
- [glTF-Transform CLI](https://gltf-transform.dev/cli)
- [glTF-Transform Simplify](https://gltf-transform.dev/modules/functions/functions/simplify)
- [Three.js Performance Tips 2026](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Draco Compression Deep Dive](https://compress-glb.com/blog/draco-compression/)
- [Meshy vs Tripo Comparison 2026](https://www.meshy.ai/compare/meshy-vs-tripo)
- [Automatic3D: Fixing Non-Manifold Meshes](https://www.automatic3d.com/guides/fixing-non-manifold-meshes)
