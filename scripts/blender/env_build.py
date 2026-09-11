"""Build the yard, block wall, gate and lot props for the Nobita house diorama.

Trees and shrubs are deliberately absent: they are placed per instance by the web app from
`src/data/scene.ts`, so a Hyper3D Rodin tree can replace the placeholder without a re-export.

The sidewalk, road, kerb and utility poles are NOT here: `streets_build.py` owns every
surface outside a lot wall, so the crossroads is not built twice and cannot z-fight.

Runs inside Blender. Everything is created in a fresh "ENV" collection so the rest of the
user's scene is untouched. Units are metres, Blender Z-up (glTF export converts to Y-up).
Origin = centre of the house footprint at ground level; the street is at +Y in Blender
(which becomes +Z in the exported glTF).

Run:  exec(open("scripts/blender/env_build.py").read())
"""

import math
import os

import bpy

# bmesh, Vector and the primitive helpers come in with env_helpers.py, below.

# --- layout, mirrors src/data/scene.ts -------------------------------------------------
LOT_W, LOT_D = 15.0, 13.0
WALL_H, WALL_T = 1.6, 0.22
FRONT_Y = 5.8           # front wall line
# Centred on the house door (door x = 2.05 in house_build.py) so gate and entrance align.
GATE_X, GATE_W = 2.05, 1.4

COLLECTION = "ENV"
ROOT_DIR = "/Users/khoale/Devs/khoale/nobita-house-3d"
SCRIPTS_DIR = f"{ROOT_DIR}/scripts/blender"
exec(open(os.path.join(SCRIPTS_DIR, "env_helpers.py")).read())

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


def build_gate_props(coll):
    """Post box mounted on the gate pier. Drains and crossings belong to streets_build.py."""
    add_box(coll, "postbox", (0.34, 0.20, 0.26),
            (GATE_X + GATE_W / 2 + 0.13, FRONT_Y + 0.22, 1.32), "postbox")
    add_box(coll, "postbox_slot", (0.24, 0.03, 0.03),
            (GATE_X + GATE_W / 2 + 0.13, FRONT_Y + 0.33, 1.40), "concrete_dark")


def build_yard_props(coll):
    """Lived-in details around the house. Must run before the export Y-flip; every mesh is
    symmetric about its own Y so only object locations mirror."""
    # Clothesline between the house back and the shed: two T-poles, a pole, two towels.
    for k, px in enumerate((-2.0, 1.5)):
        add_cylinder(coll, f"laundry_post_{k}", 0.045, 1.70, (px, -5.2, 0.85), "metal", verts=8)
        add_cylinder(coll, f"laundry_tee_{k}", 0.035, 0.70, (px, -5.2, 1.62), "metal", verts=6,
                     rot=(0, math.radians(90), 0))
    add_cylinder(coll, "laundry_pole", 0.025, 4.20, (-0.25, -5.2, 1.55), "wood", verts=6,
                 rot=(0, math.radians(90), 0))
    for k, (tx, mat) in enumerate(((-1.1, "laundry_a"), (0.15, "laundry_b"), (0.8, "laundry_a"))):
        add_box(coll, f"laundry_towel_{k}", (0.55, 0.025, 0.48), (tx, -5.2, 1.29), mat)

    # Bonsai bench beside the porch — Nobita's dad's pride.
    add_box(coll, "bonsai_bench", (1.60, 0.50, 0.10), (4.85, 4.45, 0.42), "wood")
    for k, lx in enumerate((-0.55, 0.0, 0.55)):
        add_box(coll, f"bonsai_leg_{k}", (0.08, 0.42, 0.42), (4.85 + lx, 4.45, 0.21), "wood")
    for k, lx in enumerate((-0.5, 0.05, 0.55)):
        add_cylinder(coll, f"bonsai_pot_{k}", 0.14, 0.14, (4.85 + lx, 4.45, 0.54), "pot", verts=10)
        add_cylinder(coll, f"bonsai_trunk_{k}", 0.03, 0.22, (4.85 + lx, 4.45, 0.70), "bark", verts=6)
        add_sphere(coll, f"bonsai_top_{k}", 0.16 + 0.03 * (k % 2), (4.85 + lx, 4.45, 0.88), "leaf")

    # Garden tap with basin and bucket, near the stepping stones.
    add_box(coll, "tap_post", (0.12, 0.12, 0.78), (-5.6, 2.0, 0.39), "concrete_dark")
    add_cylinder(coll, "tap_spout", 0.025, 0.22, (-5.6, 2.16, 0.68), "metal", verts=6,
                 rot=(math.radians(90), 0, 0))
    add_box(coll, "tap_basin", (0.55, 0.45, 0.16), (-5.6, 2.35, 0.08), "concrete")
    add_cylinder(coll, "tap_bucket", 0.14, 0.24, (-5.05, 2.25, 0.12), "postbox", verts=10)

    # Machinery against the walls: AC outdoor unit (left), water heater (right).
    add_box(coll, "ac_unit", (0.36, 0.85, 0.62), (-4.42, 1.0, 0.36), "appliance")
    add_box(coll, "ac_grille", (0.04, 0.55, 0.44), (-4.61, 1.0, 0.38), "metal")
    add_box(coll, "heater", (0.40, 0.55, 0.95), (4.44, -1.4, 0.48), "appliance")
    add_cylinder(coll, "heater_flue", 0.045, 0.30, (4.44, -1.4, 1.10), "metal", verts=8)

    # Stone lantern in the back corner of the garden.
    add_cylinder(coll, "lantern_base", 0.24, 0.22, (6.3, -5.9, 0.11), "concrete_dark", verts=10)
    add_cylinder(coll, "lantern_column", 0.11, 0.55, (6.3, -5.9, 0.50), "concrete", verts=8)
    add_box(coll, "lantern_house", (0.34, 0.34, 0.28), (6.3, -5.9, 0.92), "concrete_dark")
    mesh_cone = add_cylinder(coll, "lantern_cap", 0.30, 0.22, (6.3, -5.9, 1.17), "concrete",
                             verts=8, radius_top=0.05)
    add_sphere(coll, "lantern_tip", 0.06, (6.3, -5.9, 1.32), "concrete_dark")

    # Flower bed along the inside of the front wall, left of the gate.
    add_box(coll, "flowerbed_soil", (3.2, 0.5, 0.14), (-4.6, 5.30, 0.07), "soil")
    palette = ("flower_red", "flower_yellow", "flower_white", "flower_red", "flower_yellow",
               "flower_white", "flower_red", "flower_yellow")
    for k, mat in enumerate(palette):
        fx = -6.0 + k * 0.40
        add_sphere(coll, f"flower_leaf_{k}", 0.11, (fx, 5.30, 0.16), "leaf")
        add_sphere(coll, f"flower_{k}", 0.07, (fx, 5.30, 0.28), mat)

    # Gravel drainage band hugging the house base on the non-street sides.
    add_box(coll, "gravel_left", (0.35, 7.2, 0.03), (-4.42, 0.0, 0.015), "stone")
    add_box(coll, "gravel_right", (0.35, 7.2, 0.03), (4.42, 0.0, 0.015), "stone")
    add_box(coll, "gravel_back", (9.2, 0.35, 0.03), (0.0, -3.78, 0.015), "stone")

    # Mottled lawn: flat darker patches so the grass stops reading as one flat sheet.
    for k, (gx, gy, r) in enumerate(((-3.0, 1.5, 1.2), (2.5, -2.0, 1.0), (-5.0, -3.5, 1.4),
                                     (5.5, 1.0, 0.9), (0.5, -6.3, 1.1), (-6.3, 0.2, 0.8))):
        add_cylinder(coll, f"lawn_patch_{k}", r, 0.012, (gx, gy, 0.006), "grass_dark", verts=14)


def build():
    coll = fresh_collection(COLLECTION)
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

    build_shed(coll)
    build_path(coll)
    build_gate_props(coll)
    build_yard_props(coll)

    # Blender is Z-up/Y-forward and the glTF exporter maps Blender +Y to glTF -Z, which would
    # put the street behind the house. Every primitive here is symmetric about its own Y axis,
    # so negating each object's Y is enough to land the street at +Z in the exported file.
    # Anything built after this loop would export mirrored, so it must stay last.
    for obj in coll.objects:
        obj.location.y = -obj.location.y
    bpy.context.view_layer.update()
    apply_world_uvs(coll.objects)

    print(f"ENV built: {len(coll.objects)} objects")
    return coll


build()
