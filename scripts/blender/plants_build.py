"""Stylized clay plants: a lush tree, a clipped hedge dome and a cherry blossom tree.

Built to match assets/ref/{tree,hedge,sakura}: solid merged canopy lobes with sculpted
leaf-cluster bumps, thick trunks with a flared root collar, matte clay surfaces. Canopies are
metaballs converted to mesh so touching lobes fuse with soft transitions instead of the
intersecting-sphere look; each lobe cluster is then decimated to a web budget.

Origin at the trunk base, +Z up in Blender (glTF +Y). Real-world scale; the app rescales each
placement to its own height anyway.

    exec(open("scripts/blender/plants_build.py").read())
"""

import math
import random

import bmesh
import bpy
from mathutils import Vector

COLOURS = {
    "leaf": (0.33, 0.60, 0.27, 1.0),
    "leaf_dark": (0.17, 0.40, 0.15, 1.0),
    "bark": (0.40, 0.36, 0.32, 1.0),
    "bark_dark": (0.26, 0.17, 0.12, 1.0),
    "blossom": (0.96, 0.66, 0.72, 1.0),
}


def material(name):
    key = f"plant_{name}"
    mat = bpy.data.materials.get(key)
    if mat is None:
        mat = bpy.data.materials.new(key)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = COLOURS[name]
        bsdf.inputs["Roughness"].default_value = 0.88
    return mat


def fresh_collection(name):
    existing = bpy.data.collections.get(name)
    if existing:
        for obj in list(existing.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(existing)
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


def blob_mesh(coll, name, elements, resolution, mat_name, target_tris):
    """Fuse a list of (centre, radius) balls into one smooth clay mass."""
    mball = bpy.data.metaballs.new(name)
    mball.resolution = resolution
    mball.threshold = 0.45   # lower = neighbouring balls fuse into one mass sooner
    for centre, radius in elements:
        el = mball.elements.new()
        el.co = Vector(centre)
        el.radius = radius
    holder = bpy.data.objects.new(name, mball)
    coll.objects.link(holder)
    bpy.context.view_layer.update()
    with bpy.context.temp_override(object=holder, active_object=holder, selected_objects=[holder],
                                   selected_editable_objects=[holder]):
        bpy.ops.object.convert(target="MESH")
    # convert() may rename the result; find the converted mesh in the collection instead.
    obj = next(o for o in coll.objects if o.type == "MESH" and o.name.startswith(name))
    obj.name = name
    obj.data.name = name
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris > target_tris:
        mod = obj.modifiers.new("decimate", "DECIMATE")
        mod.ratio = target_tris / tris
        with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj],
                                       selected_editable_objects=[obj]):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(material(mat_name))
    obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    obj.data.update()
    return obj


def tapered_tube(coll, name, points, radii, mat_name, segments=10):
    """Sweep rings of decreasing radius through a polyline; a flared collar comes from radii[0]."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    rings = []
    for (px, py, pz), r in zip(points, radii):
        ring = [bm.verts.new((px + r * math.cos(2 * math.pi * k / segments),
                              py + r * math.sin(2 * math.pi * k / segments), pz))
                for k in range(segments)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(segments):
            bm.faces.new((a[k], a[(k + 1) % segments], b[(k + 1) % segments], b[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(material(mat_name))
    obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    return obj


def canopy_elements(rng, centre, spread, lobe_r, big_count, bump_count, bump_r, flatten=0.8):
    """Big lobes on a squashed shell plus small bumps riding on their surface."""
    cx, cy, cz = centre
    elements = [((cx, cy, cz), lobe_r * 1.15)]
    lobes = []
    for i in range(big_count):
        a = 2 * math.pi * i / big_count + rng.uniform(-0.25, 0.25)
        d = spread * rng.uniform(0.75, 1.0)
        z = cz + rng.uniform(-0.25, 0.35) * spread * flatten
        r = lobe_r * rng.uniform(0.8, 1.05)
        lobes.append(((cx + d * math.cos(a), cy + d * math.sin(a), z), r))
    lobes.append(((cx, cy, cz + spread * 0.75 * flatten), lobe_r * 0.95))
    elements += lobes
    for _ in range(bump_count):
        (lx, ly, lz), lr = lobes[rng.randrange(len(lobes))]
        u, v = rng.uniform(0, 2 * math.pi), rng.uniform(-0.2, 1.0)
        # Bumps sit at 78% of the lobe radius so they read as sculpted lumps on the mass,
        # not as loose balls stuck to its surface.
        elements.append(((lx + lr * 0.78 * math.cos(u) * math.sqrt(1 - v * v),
                          ly + lr * 0.78 * math.sin(u) * math.sqrt(1 - v * v),
                          lz + lr * 0.78 * v), bump_r * rng.uniform(0.8, 1.15)))
    return elements


def build_tree(coll, seed=3, height=5.2):
    rng = random.Random(seed)
    trunk_h = height * 0.42
    lean = 0.12
    trunk_pts = [(0, 0, 0), (0.02, 0.01, trunk_h * 0.28), (0.06, 0.02, trunk_h * 0.62),
                 (lean * 0.6, 0.03, trunk_h * 0.9), (lean, 0.04, trunk_h + 0.35)]
    trunk_r = [0.30, 0.20, 0.17, 0.15, 0.11]
    tapered_tube(coll, "tree_trunk", trunk_pts, trunk_r, "bark")
    top = Vector(trunk_pts[-2])
    for i in range(4):
        a = 2 * math.pi * i / 4 + 0.5
        end = (top.x + 0.7 * math.cos(a), top.y + 0.7 * math.sin(a), trunk_h + 0.55)
        mid = ((top.x + end[0]) / 2, (top.y + end[1]) / 2, trunk_h + 0.25)
        tapered_tube(coll, f"tree_branch_{i}", [tuple(top), mid, end], [0.11, 0.08, 0.05], "bark", 7)
    crown_c = (lean, 0.04, trunk_h + height * 0.24)
    spread = height * 0.21
    elements = canopy_elements(rng, crown_c, spread, lobe_r=height * 0.21, big_count=7,
                               bump_count=34, bump_r=height * 0.085, flatten=1.0)
    blob_mesh(coll, "tree_canopy", elements, resolution=height * 0.022, mat_name="leaf",
              target_tris=16000)


def build_hedge(coll, seed=5, height=0.8):
    rng = random.Random(seed)
    for i in range(3):
        a = 2 * math.pi * i / 3
        tapered_tube(coll, f"hedge_stem_{i}", [(0.08 * math.cos(a), 0.08 * math.sin(a), 0),
                                              (0.14 * math.cos(a), 0.14 * math.sin(a), height * 0.3)],
                     [0.035, 0.02], "bark_dark", 6)
    dome_c = (0, 0, height * 0.52)
    elements = [(dome_c, height * 0.44)]
    for _ in range(18):
        u, v = rng.uniform(0, 2 * math.pi), rng.uniform(-0.15, 1.0)
        r = height * 0.42
        elements.append(((r * math.cos(u) * math.sqrt(1 - v * v), r * math.sin(u) * math.sqrt(1 - v * v),
                          dome_c[2] + r * v), height * rng.uniform(0.10, 0.15)))
    blob_mesh(coll, "hedge_dome", elements, resolution=height * 0.03, mat_name="leaf_dark",
              target_tris=3500)


def build_sakura(coll, seed=8, height=3.8):
    rng = random.Random(seed)
    trunk_h = height * 0.40
    lean = 0.28
    trunk_pts = [(0, 0, 0), (0.05, 0, trunk_h * 0.35), (lean * 0.6, 0.02, trunk_h * 0.75),
                 (lean, 0.03, trunk_h + 0.3)]
    tapered_tube(coll, "sakura_trunk", trunk_pts, [0.26, 0.17, 0.14, 0.10], "bark_dark")
    top = Vector(trunk_pts[-2])
    for i, (ax, ay) in enumerate(((-0.8, 0.5), (0.7, -0.4), (0.2, 0.9))):
        end = (top.x + ax * 0.8, top.y + ay * 0.8, trunk_h + 0.55)
        mid = (top.x + ax * 0.4, top.y + ay * 0.4, trunk_h + 0.2)
        tapered_tube(coll, f"sakura_branch_{i}", [tuple(top), mid, end], [0.10, 0.07, 0.04],
                     "bark_dark", 7)
    crown_c = (lean * 0.8, 0.05, trunk_h + height * 0.26)
    elements = canopy_elements(rng, crown_c, height * 0.19, lobe_r=height * 0.24, big_count=4,
                               bump_count=7, bump_r=height * 0.11, flatten=0.85)
    blob_mesh(coll, "sakura_canopy", elements, resolution=height * 0.024, mat_name="blossom",
              target_tris=12000)


def build_all():
    out = {}
    for name, fn in (("tree", build_tree), ("hedge", build_hedge), ("sakura", build_sakura)):
        coll = fresh_collection(f"PLANT_{name}")
        fn(coll)
        tris = 0
        for obj in coll.objects:
            obj.data.calc_loop_triangles()
            tris += len(obj.data.loop_triangles)
        out[name] = tris
        print(f"{name}: {len(coll.objects)} objects, {tris} tris")
    return out


build_all()
