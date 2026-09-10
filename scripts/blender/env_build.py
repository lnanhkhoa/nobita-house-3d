"""Build the yard, block wall, gate, sidewalk, road and utility pole for the Nobita house diorama.

Trees and shrubs are deliberately absent: they are placed per instance by the web app from
`src/data/scene.ts`, so a Hyper3D Rodin tree can replace the placeholder without a re-export.

Runs inside Blender. Everything is created in a fresh "ENV" collection so the rest of the
user's scene is untouched. Units are metres, Blender Z-up (glTF export converts to Y-up).
Origin = centre of the house footprint at ground level; the street is at +Y in Blender
(which becomes +Z in the exported glTF).

Run:  exec(open("scripts/blender/env_build.py").read())
"""

import math

import bmesh
import bpy
from mathutils import Vector

# --- layout, mirrors src/data/scene.ts -------------------------------------------------
LOT_W, LOT_D = 15.0, 13.0
WALL_H, WALL_T = 1.6, 0.22
FRONT_Y = 5.8           # front wall line
# Centred on the house door (door x = 2.05 in house_build.py) so gate and entrance align.
GATE_X, GATE_W = 2.05, 1.4
SIDEWALK_D, SIDEWALK_H = 1.9, 0.12
ROAD_D, ROAD_START = 6.0, 7.7
POLE = (8.6, 7.2, 8.0)  # x, y, height

COLLECTION = "ENV"

COLOURS = {
    "grass": (0.34, 0.58, 0.25, 1.0),
    "concrete": (0.74, 0.71, 0.66, 1.0),
    "concrete_dark": (0.60, 0.58, 0.54, 1.0),
    "wood": (0.55, 0.34, 0.16, 1.0),
    "asphalt": (0.19, 0.20, 0.22, 1.0),
    "paving": (0.70, 0.68, 0.64, 1.0),
    "metal": (0.45, 0.45, 0.47, 1.0),
    "plate": (0.90, 0.89, 0.85, 1.0),
    "mortar": (0.52, 0.50, 0.46, 1.0),
    "stone": (0.78, 0.77, 0.73, 1.0),
    "shed_wall": (0.42, 0.30, 0.18, 1.0),
    "shed_roof": (0.48, 0.16, 0.11, 1.0),
    "postbox": (0.62, 0.14, 0.10, 1.0),
    "pole_concrete": (0.68, 0.67, 0.64, 1.0),
    "insulator": (0.88, 0.89, 0.87, 1.0),
    "wire": (0.10, 0.10, 0.11, 1.0),
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


def add_cylinder(coll, name, radius, depth, location, mat_name, verts=12, radius_top=None,
                 rot=None):
    """Cylinder (optionally tapered) with its own local origin, so the final Y-flip stays valid."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=radius, radius2=radius_top if radius_top is not None else radius,
                          depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    if rot:
        obj.rotation_euler = rot
    obj.data.materials.append(material(mat_name, COLOURS[mat_name]))
    return obj


def add_wire(coll, name, span, location, sag=0.35, radius=0.014):
    """Sagging cable along X: a low-poly polyline tube, local coords so the Y-flip stays valid."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    steps = 10
    rings = []
    for i in range(steps + 1):
        t = i / steps
        x = -span / 2 + span * t
        z = -sag * 4.0 * t * (1.0 - t)
        ring = [bm.verts.new((x, -radius, z - radius)), bm.verts.new((x, radius, z - radius)),
                bm.verts.new((x, radius, z + radius)), bm.verts.new((x, -radius, z + radius))]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(4):
            bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.data.materials.append(material("wire", COLOURS["wire"]))
    return obj


def add_gable_prism(coll, name, size, location, mat_name):
    """Solid gable volume, ridge along X. The mesh is symmetric in local Y, which keeps it
    valid through the final Y-flip (mesh-internal Y offsets mirror; object locations do not)."""
    w, d, h = size
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    a = bm.verts.new((-w / 2, -d / 2, 0))
    b = bm.verts.new((w / 2, -d / 2, 0))
    c = bm.verts.new((w / 2, d / 2, 0))
    d2 = bm.verts.new((-w / 2, d / 2, 0))
    e = bm.verts.new((-w / 2, 0, h))
    f = bm.verts.new((w / 2, 0, h))
    for face in ((a, b, f, e), (c, d2, e, f), (b, c, f), (d2, a, e), (a, d2, c, b)):
        bm.faces.new(face)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    obj.data.materials.append(material(mat_name, COLOURS[mat_name]))
    return obj


def build_shed(coll):
    """Storage shed in the back corner of the yard, red gable roof, doors facing the house."""
    sx, sy = -6.0, -5.6
    add_box(coll, "shed_slab", (2.40, 1.80, 0.10), (sx, sy, 0.05), "concrete")
    add_box(coll, "shed_walls", (2.20, 1.60, 1.85), (sx, sy, 0.10 + 1.85 / 2), "shed_wall")
    for k in range(2):
        door_x = sx - 0.50 + k * 1.00
        add_box(coll, f"shed_door_{k}", (0.88, 0.05, 1.55), (door_x, sy + 0.81, 0.92), "wood")
        add_box(coll, f"shed_door_frame_{k}", (0.06, 0.06, 1.55),
                (door_x + 0.46, sy + 0.82, 0.92), "shed_wall")
    add_box(coll, "shed_handle", (0.05, 0.06, 0.22), (sx, sy + 0.85, 0.95), "metal")
    add_gable_prism(coll, "shed_roof", (2.60, 2.05, 0.62), (sx, sy, 1.95), "shed_roof")
    add_box(coll, "shed_ridge", (2.64, 0.10, 0.06), (sx, sy, 2.57), "shed_wall")


def build_path(coll):
    """Paved approach from the gate to the porch step, then stepping stones wandering left
    along the garden front. The porch step itself already bridges most of the gap, so the
    approach is one slab; a stone trail under the step would just disappear beneath it."""
    add_box(coll, "gate_apron", (1.70, 0.85, 0.05), (GATE_X, FRONT_Y - 0.44, 0.025), "stone")
    stones = [(1.05, 4.92), (0.15, 4.60), (-0.85, 4.35), (-1.85, 4.15)]
    for k, (x, y) in enumerate(stones):
        size = 0.50 - (k % 2) * 0.05
        add_box(coll, f"path_stone_{k}", (size, size * 0.8, 0.05), (x, y, 0.025), "stone")


def build_street_details(coll):
    """Post box on the gate pier, drain covers along the kerb, a zebra crossing."""
    add_box(coll, "postbox", (0.34, 0.20, 0.26),
            (GATE_X + GATE_W / 2 + 0.13, FRONT_Y + 0.22, 1.32), "postbox")
    add_box(coll, "postbox_slot", (0.24, 0.03, 0.03),
            (GATE_X + GATE_W / 2 + 0.13, FRONT_Y + 0.33, 1.40), "concrete_dark")
    for k, dx in enumerate((-5.0, 2.6, 7.0)):
        add_box(coll, f"drain_{k}", (0.55, 0.32, 0.018), (dx, FRONT_Y + SIDEWALK_D - 0.28,
                                                          SIDEWALK_H + 0.009), "metal")
    for k in range(6):
        add_box(coll, f"zebra_{k}", (0.55, 0.85, 0.02),
                (-9.0, ROAD_START + 0.75 + k * 1.0, 0.07), "plate")


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

    # Block coursing: recessed-looking mortar lines. Horizontal joints on every run,
    # staggered vertical joints on the street-facing segments only.
    course_h = 0.4
    runs = [
        ("front_l", (-half_w + left_len / 2, FRONT_Y), left_len, "x", True),
        ("front_r", (half_w - right_len / 2, FRONT_Y), right_len, "x", True),
        ("back", (0, back_y), LOT_W, "x", False),
        ("left", (-half_w, FRONT_Y - half_d), LOT_D, "y", False),
        ("right", (half_w, FRONT_Y - half_d), LOT_D, "y", False),
    ]
    for tag, (cx, cy), length, axis, stagger in runs:
        for level in range(1, 4):
            size = (length - 0.05, WALL_T + 0.016, 0.018) if axis == "x" else                    (WALL_T + 0.016, length - 0.05, 0.018)
            add_box(coll, f"joint_h_{tag}_{level}", size, (cx, cy, course_h * level), "mortar")
        if not stagger:
            continue
        for level in range(4):
            offset = (course_h if level % 2 else 0.0)
            n = int(length / 0.8)
            for k in range(n + 1):
                x = cx - length / 2 + offset + k * 0.8
                if x < cx - length / 2 + 0.1 or x > cx + length / 2 - 0.1:
                    continue
                add_box(coll, f"joint_v_{tag}_{level}_{k}", (0.016, WALL_T + 0.014, course_h - 0.03),
                        (x, cy, course_h * level + course_h / 2), "mortar")

    # Breeze-block vents in the top course: recessed dark opening, thin frame, X-pattern insert.
    vent_y = FRONT_Y
    vent_z = WALL_H - 0.32
    for i in range(-6, 7):
        x = i * 1.0
        if abs(x - GATE_X) < GATE_W / 2 + 0.4 or abs(x) > half_w - 0.3:
            continue
        add_box(coll, f"vent_back_{i}", (0.34, WALL_T - 0.06, 0.34), (x, vent_y, vent_z),
                "concrete_dark")
        for tag, size, off in (("t", (0.40, WALL_T + 0.03, 0.035), (0, 0.183)),
                               ("b", (0.40, WALL_T + 0.03, 0.035), (0, -0.183)),
                               ("l", (0.035, WALL_T + 0.03, 0.40), (-0.183, 0)),
                               ("r", (0.035, WALL_T + 0.03, 0.40), (0.183, 0))):
            add_box(coll, f"vent_frame_{i}_{tag}", size, (x + off[0], vent_y, vent_z + off[1]),
                    "concrete")
        for sign, tag in ((1, "a"), (-1, "b")):
            bar = add_box(coll, f"vent_cross_{i}_{tag}", (0.44, WALL_T + 0.02, 0.05),
                          (x, vent_y, vent_z), "concrete")
            bar.rotation_euler[1] = sign * math.radians(45)

    # Reinforcing piers: at the corners and mid-run, with a small cap, like real block walls.
    pier_positions = [(-half_w, FRONT_Y), (half_w, FRONT_Y), (-half_w, back_y), (half_w, back_y),
                      (-3.7, FRONT_Y), (4.5, FRONT_Y)]
    for index, (px, py) in enumerate(pier_positions):
        add_box(coll, f"pier_{index}", (0.32, WALL_T + 0.12, WALL_H + 0.10),
                (px, py, (WALL_H + 0.10) / 2), "concrete")
        add_box(coll, f"pier_cap_{index}", (0.38, WALL_T + 0.18, 0.06),
                (px, py, WALL_H + 0.13), "concrete_dark")

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

    # Japanese concrete utility pole: tapered shaft, two crossarms with insulators, a
    # transformer drum, step bolts, and sagging lines running along the street.
    px, py, ph = POLE
    add_cylinder(coll, "pole", 0.15, ph, (px, py, ph / 2), "pole_concrete", verts=14,
                 radius_top=0.09)
    add_cylinder(coll, "pole_collar", 0.19, 0.5, (px, py, 0.25), "concrete_dark", verts=14)
    add_cylinder(coll, "pole_cap", 0.10, 0.05, (px, py, ph + 0.025), "metal", verts=10)
    # Crossarms sit perpendicular to the lines, which run along the road (X).
    wire_rows = [(ph - 0.45, (-0.55, 0.0, 0.55)), (ph - 1.15, (-0.45, 0.45))]
    for arm_index, (az, offsets) in enumerate(wire_rows):
        add_box(coll, f"pole_arm_{arm_index}", (0.09, 1.45, 0.09), (px, py, az), "metal")
        edge = (LOT_W + 8) / 2
        for k, oy in enumerate(offsets):
            add_cylinder(coll, f"pole_insulator_{arm_index}_{k}", 0.045, 0.14,
                         (px, py + oy, az + 0.11), "insulator", verts=8)
            long_span = px + edge
            add_wire(coll, f"wire_{arm_index}_{k}_a", long_span,
                     ((px - edge) / 2, py + oy, az + 0.18), sag=0.40)
            short_span = edge - px
            add_wire(coll, f"wire_{arm_index}_{k}_b", short_span,
                     ((px + edge) / 2, py + oy, az + 0.18), sag=0.06)
    # Transformer drum below the lower arm, hung on the road side of the shaft.
    add_cylinder(coll, "pole_transformer", 0.24, 0.75, (px + 0.34, py, ph - 1.95), "metal",
                 verts=12)
    add_box(coll, "pole_transformer_strap", (0.55, 0.08, 0.08), (px + 0.17, py, ph - 1.70),
            "metal")
    # Step bolts alternating up the shaft.
    for k in range(6):
        side = 1 if k % 2 else -1
        add_cylinder(coll, f"pole_step_{k}", 0.02, 0.28, (px, py + side * 0.16, 2.6 + k * 0.7),
                     "metal", verts=6, rot=(math.radians(90), 0, 0))
    add_box(coll, "pole_sign", (0.03, 0.22, 0.34), (px, py - 0.16, 2.1), "plate")

    build_shed(coll)
    build_path(coll)
    build_street_details(coll)

    # Blender is Z-up/Y-forward and the glTF exporter maps Blender +Y to glTF -Z, which would
    # put the street behind the house. Every primitive here is symmetric about its own Y axis,
    # so negating each object's Y is enough to land the street at +Z in the exported file.
    # Anything built after this loop would export mirrored, so it must stay last.
    for obj in coll.objects:
        obj.location.y = -obj.location.y

    print(f"ENV built: {len(coll.objects)} objects")
    return coll


build()
