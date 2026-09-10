"""Build the yard, block wall, gate, sidewalk, road and utility pole for the Nobita house diorama.

Runs inside Blender. Everything is created in a fresh "ENV" collection so the rest of the
user's scene is untouched. Units are metres, Blender Z-up (glTF export converts to Y-up).
Origin = centre of the house footprint at ground level; the street is at +Y in Blender
(which becomes +Z in the exported glTF).

Run:  exec(open("scripts/blender/env_build.py").read())
"""

import bpy
import bmesh
from mathutils import Vector

# --- layout, mirrors src/data/scene.ts -------------------------------------------------
LOT_W, LOT_D = 15.0, 13.0
WALL_H, WALL_T = 1.6, 0.22
FRONT_Y = 5.8           # front wall line
GATE_X, GATE_W = 0.8, 1.4
SIDEWALK_D, SIDEWALK_H = 1.9, 0.12
ROAD_D, ROAD_START = 6.0, 7.7
POLE = (8.6, 7.2, 8.0)  # x, y, height

COLLECTION = "ENV"

COLOURS = {
    "grass": (0.34, 0.58, 0.25, 1.0),
    "leaf": (0.22, 0.50, 0.18, 1.0),
    "leaf_light": (0.32, 0.62, 0.24, 1.0),
    "bark": (0.30, 0.20, 0.12, 1.0),
    "concrete": (0.74, 0.71, 0.66, 1.0),
    "concrete_dark": (0.60, 0.58, 0.54, 1.0),
    "wood": (0.55, 0.34, 0.16, 1.0),
    "asphalt": (0.19, 0.20, 0.22, 1.0),
    "paving": (0.70, 0.68, 0.64, 1.0),
    "metal": (0.45, 0.45, 0.47, 1.0),
    "plate": (0.90, 0.89, 0.85, 1.0),
}


def material(name, rgba, roughness=0.85):
    mat = bpy.data.materials.get(f"env_{name}")
    if mat is None:
        mat = bpy.data.materials.new(f"env_{name}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def fresh_collection():
    existing = bpy.data.collections.get(COLLECTION)
    if existing:
        for obj in list(existing.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(existing)
    coll = bpy.data.collections.new(COLLECTION)
    bpy.context.scene.collection.children.link(coll)
    return coll


def add_box(coll, name, size, location, mat_name):
    """Axis-aligned box given as (width_x, depth_y, height_z) centred at location."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.data.materials.append(material(mat_name, COLOURS[mat_name]))
    return obj


def add_cylinder(coll, name, radius, depth, location, mat_name, verts=12):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.data.materials.append(material(mat_name, COLOURS[mat_name]))
    return obj


def add_sphere(coll, name, radius, location, mat_name, subdivisions=2):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.data.materials.append(material(mat_name, COLOURS[mat_name]))
    return obj


def add_tree(coll, name, location, height, canopy_radius):
    """Stylized tree: tapered trunk plus three overlapping faceted canopy blobs."""
    x, y = location
    trunk_h = height * 0.45
    add_cylinder(coll, f"{name}_trunk", 0.16, trunk_h, (x, y, trunk_h / 2), "bark", verts=8)
    blobs = (
        (0.0, 0.0, trunk_h + canopy_radius * 0.75, canopy_radius, "leaf"),
        (-canopy_radius * 0.5, canopy_radius * 0.2, trunk_h + canopy_radius * 1.25,
         canopy_radius * 0.72, "leaf_light"),
        (canopy_radius * 0.48, -canopy_radius * 0.25, trunk_h + canopy_radius * 1.05,
         canopy_radius * 0.66, "leaf"),
    )
    for i, (dx, dy, z, r, mat) in enumerate(blobs):
        add_sphere(coll, f"{name}_canopy_{i}", r, (x + dx, y + dy, z), mat)


def add_hedge(coll, name, location, length, height=0.7):
    """Row of overlapping low spheres reading as a clipped shrub row."""
    x, y = location
    count = max(2, int(length / 0.6))
    for i in range(count):
        t = (i / (count - 1)) - 0.5
        add_sphere(coll, f"{name}_{i}", height * 0.62,
                   (x + t * length, y, height * 0.5), "leaf_light", subdivisions=1)


def build_foliage(coll):
    # Two street trees flanking the house, matching the reference photo composition.
    add_tree(coll, "tree_left", (-5.4, 2.6), 5.2, 2.0)
    add_tree(coll, "tree_right", (5.6, 3.4), 4.6, 1.8)
    # Shrubs along the inside of the front wall and beside the gate.
    add_hedge(coll, "hedge_left", (-4.2, FRONT_Y - 0.75), 4.4)
    add_hedge(coll, "hedge_right", (4.6, FRONT_Y - 0.75), 2.6)
    add_tree(coll, "tree_back", (-3.0, -4.2), 3.4, 1.3)


def build():
    coll = fresh_collection()
    half_w, half_d = LOT_W / 2, LOT_D / 2
    back_y = FRONT_Y - LOT_D

    # yard
    add_box(coll, "yard", (LOT_W, LOT_D, 0.08), (0, FRONT_Y - half_d, -0.04), "grass")

    # front wall, split around the gate opening
    left_len = (GATE_X - GATE_W / 2) + half_w
    right_len = half_w - (GATE_X + GATE_W / 2)
    add_box(coll, "wall_front_left", (left_len, WALL_T, WALL_H),
            (-half_w + left_len / 2, FRONT_Y, WALL_H / 2), "concrete")
    add_box(coll, "wall_front_right", (right_len, WALL_T, WALL_H),
            (half_w - right_len / 2, FRONT_Y, WALL_H / 2), "concrete")
    # coping course on top of every wall run
    add_box(coll, "wall_coping_left", (left_len, WALL_T + 0.06, 0.07),
            (-half_w + left_len / 2, FRONT_Y, WALL_H + 0.035), "concrete_dark")
    add_box(coll, "wall_coping_right", (right_len, WALL_T + 0.06, 0.07),
            (half_w - right_len / 2, FRONT_Y, WALL_H + 0.035), "concrete_dark")

    # breeze-block vent squares recessed into the front wall's top course
    vent_y = FRONT_Y
    for i in range(-6, 7):
        x = i * 1.0
        if abs(x - GATE_X) < GATE_W / 2 + 0.4 or abs(x) > half_w - 0.3:
            continue
        add_box(coll, f"wall_vent_{i}", (0.34, WALL_T + 0.02, 0.34), (x, vent_y, WALL_H - 0.32),
                "concrete_dark")

    # side + back walls
    add_box(coll, "wall_left", (WALL_T, LOT_D, WALL_H), (-half_w, FRONT_Y - half_d, WALL_H / 2), "concrete")
    add_box(coll, "wall_right", (WALL_T, LOT_D, WALL_H), (half_w, FRONT_Y - half_d, WALL_H / 2), "concrete")
    add_box(coll, "wall_back", (LOT_W, WALL_T, WALL_H), (0, back_y, WALL_H / 2), "concrete")

    # gate: two posts, a sliding wooden leaf, and the 野比 nameplate
    post_h = WALL_H + 0.25
    for sign, tag in ((-1, "l"), (1, "r")):
        add_box(coll, f"gate_post_{tag}", (0.26, 0.26, post_h),
                (GATE_X + sign * (GATE_W / 2 + 0.13), FRONT_Y, post_h / 2), "concrete_dark")
    add_box(coll, "gate_leaf", (GATE_W, 0.06, 1.45), (GATE_X, FRONT_Y, 0.78), "wood")
    for i in range(5):
        add_box(coll, f"gate_slat_{i}", (GATE_W - 0.08, 0.09, 0.16),
                (GATE_X, FRONT_Y, 0.28 + i * 0.28), "wood")
    add_box(coll, "nameplate", (0.26, 0.03, 0.34),
            (GATE_X + GATE_W / 2 + 0.28, FRONT_Y - 0.12, 1.15), "plate")

    # sidewalk and road
    add_box(coll, "sidewalk", (LOT_W + 8, SIDEWALK_D, SIDEWALK_H),
            (0, FRONT_Y + SIDEWALK_D / 2, SIDEWALK_H / 2), "paving")
    add_box(coll, "kerb", (LOT_W + 8, 0.16, SIDEWALK_H + 0.06),
            (0, FRONT_Y + SIDEWALK_D, (SIDEWALK_H + 0.06) / 2), "concrete_dark")
    add_box(coll, "road", (LOT_W + 8, ROAD_D, 0.06), (0, ROAD_START + ROAD_D / 2, 0.03), "asphalt")
    for i in range(-4, 5):
        add_box(coll, f"road_line_{i}", (1.6, 0.12, 0.02),
                (i * 3.0, ROAD_START + ROAD_D / 2, 0.07), "plate")

    # utility pole with a crossarm
    add_cylinder(coll, "pole", 0.16, POLE[2], (POLE[0], POLE[1], POLE[2] / 2), "concrete_dark")
    add_box(coll, "pole_arm", (1.5, 0.09, 0.09), (POLE[0], POLE[1], POLE[2] - 0.7), "metal")
    add_box(coll, "pole_box", (0.4, 0.4, 0.6), (POLE[0], POLE[1] - 0.32, POLE[2] - 2.2), "metal")

    build_foliage(coll)

    # Blender is Z-up/Y-forward and the glTF exporter maps Blender +Y to glTF -Z, which would
    # put the street behind the house. Every primitive here is symmetric about its own Y axis,
    # so negating each object's Y is enough to land the street at +Z in the exported file.
    for obj in coll.objects:
        obj.location.y = -obj.location.y

    print(f"ENV built: {len(coll.objects)} objects")
    return coll


build()
