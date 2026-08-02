# Three.js + Vite Low-Poly Dollhouse Architecture Report

## Versions & Stack (Verified Aug 2026)

| Component | Version | Notes |
|-----------|---------|-------|
| **three.js** | 0.185.1 | Official `npm install three` |
| **Vite** | 8.2.0 | Rolldown bundler (10-30x faster builds) |
| **WebGPURenderer** | ✅ Production-ready | Since r171 (Sept 2025); automatic WebGL 2 fallback |
| **TypeScript** | Latest | Full support in both libraries |

**Recommendation:** Use **WebGLRenderer** (stick with it). WebGPU is ready but offers 2-10x gains only for 1M+ particle systems or compute shaders—unnecessary for diorama (50-70 props). WebGL 2 covers 99%+ devices including Safari. Swap later if perf metrics demand it.

---

## Companion Libraries (YAGNI-Filtered)

| Library | Purpose | Verdict |
|---------|---------|---------|
| **camera-controls** | Orbit + smooth camera fly-to | ✅ **Include**. Replaces OrbitControls; supports eased transitions. Critical for dollhouse interaction. |
| **GSAP** | Camera/prop tweening | ✅ **Include** if you animate props in rooms (e.g., opening doors). Lightweight for simple fly-to: use camera-controls alone. Choose one. |
| **three-mesh-bvh** | Raycast BVH optimization | ⚠️ **Only if 10+ hotspots on dense geometry.** For 50-70 props with simple geometries: skip. Add later if profiling shows raycast overhead. |
| **@pmndrs/postprocessing** | Effects (bloom, outline) | ⚠️ **Defer.** Low-poly dioramas rarely need FX. Add FXAA (built into Three) for aliasing, then ship. Bloom adds draw calls. |
| **lil-gui** / **stats.js** | Dev UI & perf meter | ✅ **Include** at dev time only (`#ifdef DEBUG`); remove from prod bundle. |
| **nanostores** | State (UI, camera states) | ⚠️ **Skip initially.** Vanilla modules (folder: `src/store/`) sufficient for <10 state vars. Use if UI grows. |

---

## Dollhouse Techniques (Concrete Patterns)

### (a) Roof / Upper Floor Hiding
**Pattern:** `mesh.visible = false` on toggle. No fancy raycasting.
- Roof: single Group, toggle on `hideRoof` event.
- 2nd floor: separate Group, fade-out optional (set `material.opacity` + `transparent: true`) or instant hide.
- **Why:** Diorama is toy-like; instant hide is authentic. Fade looks unreal.

### (b) Wall Cutaway (Always Faces Away from Camera)
**Pattern:** Use shader with `discard` on back-facing fragments, OR render walls with `material.side = THREE.BackSide` in first pass, then override.
- **Simpler:** Make walls `DoubleSide`; keep thickness (<0.1 unit). When inside room, frontface disappears naturally due to camera proximity.
- **Better:** Per-room `LOD` or layer masks; hide walls via `camera.layers` + `object.layers.set()`.
- **Cite:** Three.js layers/LOD examples: `three.js/examples/webgl_lod.html`.

### (c) Per-Room Isolation & Framing
**Pattern:**
```
1. Store room metadata: { name, boundingBox (Vec3, Vec3), cameraTarget (Vec3) }
2. On room-click hotspot:
   - Compute box.getSize() → sphere radius
   - Math: distance = radius / Math.tan(camera.fov * Math.PI / 360)
   - Move camera to (center.x, center.y + 0.2, center.z + distance)
   - lookAt(center)
```
- Use `camera-controls.fitToBox()` if available, else implement Box3 math from three.js docs.
- **Cite:** wejn.org "Cracking the three.js object fitting nut" (2020, still current).

### (d) Smooth Camera Fly-To + Handoff
- **camera-controls**: has `smoothTime`, `dollyToCursor`, built-in easing.
- On transition end → `camera.controls.enabled = true` (restore user control).
- **Alternative (GSAP):** Tween position + lookAt vector, disable controls during tween, enable on complete.

---

## Hotspot System (Recommendation)

**Choice:** **HTML Overlay via `Vector3.project()` + raycasting on invisible proxy meshes**.

| Approach | Pros | Cons | Pick? |
|----------|------|------|-------|
| CSS2DRenderer | Auto-faces camera, no math | Occlusion; adds render pass | ❌ Overkill |
| Raycasting + HTML | Precise, clean, mobile-friendly | Manual projection every frame | ✅ **Yes** |
| Invisible proxy meshes | Simple raycast targets | Extra geometry in scene | ✅ **Pair with raycast** |
| Projected label (Vector3.project) | No occlusion issues | Must recalc every frame | ✅ **Pair with HTML** |

**Implementation:**
1. Raycast on invisible proxy geometries (small spheres/cubes at hotspot centers).
2. On hit, project hit.point to 2D screen via camera: `pos.project(camera)`, scale to pixel coords.
3. Position info-card DOM element at screen coords. **Works perfectly on mobile (touch)**.
4. **Accessibility:** Hotspots = semantic HTML `<button>` with `aria-label`, not bare divs. Tab focus → highlight mesh, show label. Screen reader: "Click to enter kitchen."

---

## Low-Poly Stylized Rendering Recipe

### Materials
- **MeshToonMaterial** with `gradientMap` (1D texture, NearestFilter): gives flat color bands. Best for cartoon style.
  - Alternative: **MeshStandardMaterial** + `flatShading: true` + low metallic/high roughness → faceted, realistic-ish.
- **Avoid MeshLambertMaterial** (deprecated path in WebGL 2).

### Lighting
- **Key light** (warm, e.g., `Color(0xffa500)`): `position (2, 3, 2)`, intensity 1.5.
- **Fill light** (cool, e.g., `Color(0x0088ff)`): opposite side, intensity 0.6, non-shadow-casting.
- **Rim light** (highlights edges): direction away from key, soft, low intensity (0.3).
- **Hemisphere light** (ambient): `Color(sky)`, `Color(ground)`, intensity 0.8. No harsh shadows alone.

### Shadows
- **Baked shadow plane:** Single plane under furniture, pre-rendered shadow texture. **Ideal for static diorama.**
  - Use `AccumulativeShadows` pattern (compute once, reuse) or manually bake in Blender, apply as decal.
- **Contact shadows:** No PCFSoft shadowmap overhead. Render baked/decal shadows → instant 60fps.
- **Optional:** `THREE.ColorManagement.enabled = true`; set `renderer.outputColorSpace = THREE.SRGBColorSpace`. Ensures color fidelity (low-poly palettes depend on this).

---

## Performance Budget (Mobile Safari/Chrome)

| Metric | Target | Reasoning |
|--------|--------|-----------|
| **Draw calls** | <50 | Mobile GPU bottleneck; 1 call per unique material (not per mesh). |
| **Triangles** | <50K total | 50-70 props @ 500-800 tris each = ~40K. Leave margin. |
| **Texture memory** | <50 MB | Mobile RAM limited. Compress to BC1/ASTC for mobile. |
| **FPS** | 60 (locked) | Request animation frame cap or vsync. |

### Optimization Strategy
- **BatchedMesh** (r160+): Merge props sharing same material/atlas into single draw call. Example: all furniture wood materials → 1 call.
- **InstancedMesh:** Repeat small props (books, cups). 1 call for 50 instances.
- **Texture atlas:** Single 2048×2048 atlas (BC1) covers all low-poly colors + patterns. Use UV offset per mesh in material.data.
- **Wireframe LOD:** If prop is <2% screen size, swap to lower-poly LOD (halve triangles).

**Avoid:** Shadows (bake instead), post-processing, per-pixel lighting (use baked AO maps).

---

## Project Structure (Vanilla TS + Vite)

```
nobita-house-3d/
├── src/
│   ├── main.ts              # Vite entry
│   ├── index.css            # Global styles
│   ├── scene/
│   │   ├── Scene.ts         # Scene init, THREE.Scene setup
│   │   ├── lights.ts        # Key/fill/rim/hemisphere
│   │   └── environment.ts   # Sky, floor plane
│   ├── loaders/
│   │   ├── asset-loader.ts  # GLTFLoader wrapper
│   │   └── texture-loader.ts
│   ├── camera/
│   │   ├── CameraController.ts  # camera-controls wrapper
│   │   └── room-framing.ts      # Box3 math for fly-to
│   ├── interaction/
│   │   ├── raycaster.ts         # Raycast + hotspot detection
│   │   └── hotspot-ui.ts        # HTML overlay positioning
│   ├── ui/
│   │   ├── InfoCard.ts          # Info panel DOM
│   │   └── MenuUI.ts            # Room list, toggles (roof/floor)
│   ├── store/
│   │   └── app-state.ts         # { activeRoom, hideRoof, etc. }
│   ├── utils/
│   │   ├── types.ts             # Room, Hotspot interfaces
│   │   └── helpers.ts           # Math utils (fit-to-box, project)
│   └── config.ts                # Constants (room data)
├── public/
│   └── assets/
│       ├── models/              # .glb files (Hyper3D Rodin exports)
│       └── textures/            # .png atlas
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Vite Config Essentials
```typescript
export default {
  plugins: [glsl()],  // vite-plugin-glsl for inline shaders
  server: { port: 5173 },
  build: { outDir: 'dist' }
}
```

---

## Top 3 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Raycast overhead on 50+ hotspots** | Frame drops (mobile). | Pre-filter raycast targets; use three-mesh-bvh only if profiling hits >10ms raycast. Start with simple spheres. |
| **Texture memory (compressed formats)** | OOM crash on low-end phones. | Test on actual device. Use basis/ktx2 compression or deliver atlas as BC1-compressed WebP. Profile `renderer.info.memory`. |
| **Camera interp glitches** | Jarring transitions if timings conflict. | Disable controls during fly-to. Use camera-controls' built-in `enabled` flag. Test on touch (fingers may accidentally pan mid-transition). |

---

## Unresolved Questions

1. Will Hyper3D Rodin GLBs export with pre-baked lighting, or will you bake shadows post-export? (Affects material setup.)
2. Is keyboard navigation required (Tab → hotspots), or mouse/touch only? (Affects accessibility scope.)
3. How many unique materials/textures per prop? (Determines atlas strategy.)

---

## Summary

**Stick with WebGLRenderer + camera-controls for smooth interaction. No WebGPU, no postprocessing, no state lib yet.** Render with MeshToonMaterial or flatShaded MeshStandardMaterial, bake shadows, use texture atlas, merge props via BatchedMesh. Target <50 draw calls, <50K tris. HTML hotspots via raycasting + Vector3.project() work flawlessly on mobile. Structure code by concern (scene, loaders, camera, interaction, ui, store). Vite + vite-plugin-glsl handles builds.
