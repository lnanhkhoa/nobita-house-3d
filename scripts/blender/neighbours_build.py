"""Build the seven neighbour lots and the coin parking lot around Nobita's block.

Three parametric house variants stand one rung below the hero house on the detail ladder:
real massing, roof pitch, eaves, framed openings, walls and gates, but no kawara ribs and no
booleans. Exports as the NEIGHBOURS collection.

Coordinates: built directly in Blender space through `P(x, z, y)`, like `streets_build.py`.
A house is laid out in its own frame — local +X runs along the street, local +Z points at the
street, y is height — and every part is placed through `place()`, which rotates that frame by
the lot's yaw about the house centre before translating. Yaws are quarter turns only, so the
rotation is an axis swap and never has to touch the mesh.

Run:  exec(open("scripts/blender/neighbours_build.py").read())
"""

import math
import os

import bpy

COLLECTION = "NEIGHBOURS"
ROOT_DIR = "/Users/khoale/Devs/khoale/nobita-house-3d"
SCRIPTS_DIR = f"{ROOT_DIR}/scripts/blender"
exec(open(os.path.join(SCRIPTS_DIR, "env_helpers.py")).read())

# --- layout, mirrors layout.neighbours / houseVariants / HOUSE_SETBACK in src/data/scene.ts ---
SETBACK = 3.2
PITCH = math.radians(25)

VARIANTS = {
    "hip2": dict(storeys=2, width=7.5, depth=6.5, upper_inset=0.6, ground_h=2.75, eave_h=5.3,
                 roof=dict(width=7.3, depth=6.3, height=1.47, ridge=1.0, axis="x")),
    "gable2": dict(storeys=2, width=8.0, depth=6.0, upper_inset=0.0, ground_h=2.75, eave_h=5.3,
                   roof=dict(width=9.0, depth=7.0, height=1.63, ridge=9.0, axis="x")),
    "gable1": dict(storeys=1, width=8.5, depth=6.5, upper_inset=0.0, ground_h=2.75, eave_h=2.75,
                   roof=dict(width=9.5, depth=7.5, height=2.22, ridge=7.5, axis="z")),
}

LOTS = [
    dict(id="east", x0=7.9, x1=21.9, z0=-7.2, z1=5.8, facing="+z", variant="gable2",
         offset=0.6, wall="#F2EEE6", roof="#4A3A2E", mirror=False),
    dict(id="east-back", x0=7.9, x1=21.9, z0=-21.2, z1=-7.6, facing="-z", variant="gable1",
         offset=-0.5, wall="#E4E2DC", roof="#4F5B70", mirror=True),
    dict(id="back", x0=-7.5, x1=7.5, z0=-21.2, z1=-7.6, facing="-z", variant="hip2",
         offset=0.4, wall="#EFE3C6", roof="#5E6B82", mirror=False),
    dict(id="west-back", x0=-31.3, x1=-17.3, z0=-21.2, z1=-7.6, facing="+x", variant="hip2",
         offset=-0.7, wall="#E6E4E0", roof="#5A4636", mirror=True),
    dict(id="west", x0=-31.3, x1=-17.3, z0=-7.2, z1=5.8, facing="+x", variant="gable2",
         offset=0.5, wall="#F0DCCF", roof="#4F5B70", mirror=False),
    dict(id="south-west", x0=-31.3, x1=-17.3, z0=15.6, z1=28.6, facing="-z", variant="gable1",
         offset=0.8, wall="#EFE3C6", roof="#4A3A2E", mirror=False),
    dict(id="south-east", x0=9.4, x1=23.4, z0=15.6, z1=28.6, facing="-z", variant="hip2",
         offset=-0.6, wall="#F4F1EA", roof="#5E6B82", mirror=True),
]
PARKING = dict(x0=-7.5, x1=9.0, z0=15.6, z1=28.6, bays=5)

LOT_WALL_H, LOT_WALL_T, GATE_W = 1.4, 0.2, 2.6


def P(x, z, y=0.0):
    return (x, -z, y)


def tint(prefix, hex_value, tile):
    """One material per distinct colour, not per lot: two lots painted alike share a draw call."""
    name = f"{prefix}_{hex_value.lstrip('#').lower()}"
    if name not in COLOURS:
        register_colour(name, hex_rgba(hex_value))
        TILES.setdefault(name, tile)
    return name


def prepare(spec):
    """Fill in the derived placement a lot's geometry is built from."""
    v = VARIANTS[spec["variant"]]
    cx_lot, cz_lot = (spec["x0"] + spec["x1"]) / 2, (spec["z0"] + spec["z1"]) / 2
    if spec["facing"] == "+z":
        cx, cz, yaw = cx_lot + spec["offset"], spec["z1"] - SETBACK - v["depth"] / 2, 0.0
    elif spec["facing"] == "-z":
        cx, cz, yaw = cx_lot + spec["offset"], spec["z0"] + SETBACK + v["depth"] / 2, math.pi
    else:
        cx, cz, yaw = spec["x1"] - SETBACK - v["depth"] / 2, cz_lot + spec["offset"], math.pi / 2
    spec.update(v=v, cx=cx, cz=cz, yaw=yaw,
                wall_mat=tint("wall", spec["wall"], ("tile-stucco", 2.2, 0.45)),
                roof_mat=tint("roof", spec["roof"], ("tile-asphalt", 1.0, 0.35)))
    return spec


def place(spec, lx, lz):
    """House-local (along street, toward street) -> world glTF (x, z). Yaw about +Y."""
    s, c = math.sin(spec["yaw"]), math.cos(spec["yaw"])
    return spec["cx"] + lx * c + lz * s, spec["cz"] - lx * s + lz * c


def swapped(spec):
    """True for the quarter-turn lots, where a local X size becomes a world Z size."""
    return abs(math.sin(spec["yaw"])) > 0.5


def slope_rotation(spec, axis, sign, angle):
    """Blender euler index and angle for a part lying on a roof slope that falls toward the
    house-local `axis` * `sign`.

    Both halves of this matter. A local axis lands on a different Blender axis *and a
    different direction* per yaw — local +Z is Blender -Y at yaw 0 but +Y at yaw pi — and a
    rotation about Blender X puts +Y on the opposite side of the horizon from what a rotation
    about Blender Y does to +X. Folding in only the axis, as an earlier version did, mirrored
    every course lip on the yaw-0 and quarter-turn lots.
    """
    c, s = math.cos(spec["yaw"]), math.sin(spec["yaw"])
    # Where the local axis points, in Blender: glTF (x, z) -> Blender (x, -z).
    bx, by = (s, -c) if axis == "z" else (c, s)
    if abs(bx) > abs(by):
        # Thin axis is Blender X, so tilt about Blender Y. R_y(+t) sends +X to (cos, 0, -sin).
        return 1, sign * math.copysign(1.0, bx) * angle
    # Thin axis is Blender Y, so tilt about Blender X. R_x(+t) sends +Y to (0, cos, +sin).
    return 0, -sign * math.copysign(1.0, by) * angle


def house_box(coll, name, spec, size, local, mat_name, slope=None):
    """Box given in the house's own frame: size (along street, toward street, height).
    `slope` is (local axis, sign, angle) for a part that lies on a roof slope."""
    w, d, h = size
    lx, lz, y = local
    x, z = place(spec, lx, lz)
    if swapped(spec):
        w, d = d, w
    obj = add_box(coll, name, (w, d, h), P(x, z, y), mat_name)
    if slope is not None:
        index, angle = slope_rotation(spec, *slope)
        obj.rotation_euler[index] = angle
    return obj


def face_local(face, half_normal, u, out, y):
    """Point `out` metres proud of one wall face, `u` along it, in the house frame."""
    if face == "front":
        return (u, half_normal + out, y)
    if face == "back":
        return (u, -half_normal - out, y)
    if face == "left":
        return (-half_normal - out, u, y)
    return (half_normal + out, u, y)


def face_size(face, along, thickness, height):
    return (along, thickness, height) if face in ("front", "back") else (thickness, along, height)


def add_opening(coll, name, spec, face, half_normal, u, y, w, h, glass_mat="glass"):
    """Framed window: four bars proud of the wall, glass just behind them, dark backing flush.
    Nothing is cut into the wall — the frame reads as an inset opening from the street."""
    bar = 0.07
    for tag, along, height, du, dy in (("t", w + bar * 2, bar, 0, h / 2 + bar / 2),
                                       ("b", w + bar * 2, bar, 0, -h / 2 - bar / 2),
                                       ("l", bar, h, -w / 2 - bar / 2, 0),
                                       ("r", bar, h, w / 2 + bar / 2, 0)):
        house_box(coll, f"{name}_{tag}", spec, face_size(face, along, 0.09, height),
                  face_local(face, half_normal, u + du, 0.045, y + dy), "frame")
    house_box(coll, f"{name}_glass", spec, face_size(face, w, 0.03, h),
              face_local(face, half_normal, u, 0.015, y), glass_mat)
    house_box(coll, f"{name}_back", spec, face_size(face, w, 0.06, h),
              face_local(face, half_normal, u, -0.03, y), "interior")


def add_roof(coll, name, spec, base_y, mat_name):
    """Hip or gable roof from four eave corners and a ridge line. A ridge as long as the roof
    turns the two end triangles into vertical gable ends, so one build covers every variant.
    Sizes are given along the street / toward the street and swapped by the lot's yaw."""
    r = spec["v"]["roof"]
    wx, wz = (r["width"], r["depth"]) if not swapped(spec) else (r["depth"], r["width"])
    axis = r["axis"] if not swapped(spec) else ("z" if r["axis"] == "x" else "x")
    ridge = r["ridge"]
    cx, cz = spec["cx"], spec["cz"]
    top = base_y + r["height"]
    corners = [(-wx / 2, -wz / 2), (wx / 2, -wz / 2), (wx / 2, wz / 2), (-wx / 2, wz / 2)]
    if axis == "x":
        ends = [(-ridge / 2, 0.0), (ridge / 2, 0.0)]
        faces = [(3, 2, 5, 4), (1, 0, 4, 5), (0, 3, 4), (2, 1, 5)]
    else:
        ends = [(0.0, -ridge / 2), (0.0, ridge / 2)]
        faces = [(0, 3, 5, 4), (2, 1, 4, 5), (3, 2, 5), (1, 0, 4)]
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    bm = bmesh.new()
    verts = [bm.verts.new(P(cx + dx, cz + dz, base_y)) for dx, dz in corners]
    verts += [bm.verts.new(P(cx + dx, cz + dz, top)) for dx, dz in ends]
    for face in faces:
        if len({verts[i].co.to_tuple(4) for i in face}) < 3:
            continue
        bm.faces.new([verts[i] for i in face])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.data.materials.append(material(mat_name))
    return obj


def add_courses(coll, spec, base_y, mat_name):
    """Course lips every 0.29 m up the two main slopes: the tile banding the eye reads as a
    kawara roof at a distance, at two boxes per course instead of a rib per tile."""
    r = spec["v"]["roof"]
    span = (r["depth"] if r["axis"] == "x" else r["width"]) / 2
    slope = math.hypot(span, r["height"])
    steps = max(int(slope / 0.29), 1)
    eave_across = r["width"] if r["axis"] == "x" else r["depth"]
    # A ridge along local X means the slopes fall toward local +/-Z, and the other way round.
    fall = "z" if r["axis"] == "x" else "x"
    for i in range(1, steps):
        t = i / steps
        s = t * slope
        drop = span * t
        y = base_y + r["height"] * t
        # On a hip the slope is a trapezoid narrowing from the eave to the ridge, so each
        # course has to shorten with it. A gable has ridge == eave_across and stays full
        # width. Holding it constant left the upper courses hanging past the hip lines.
        across = eave_across + (r["ridge"] - eave_across) * t
        for sign in (1, -1):
            offset = sign * (span - drop)
            local = (0.0, offset, y + 0.02) if fall == "z" else (offset, 0.0, y + 0.02)
            size = (across, 0.07, 0.03) if fall == "z" else (0.07, across, 0.03)
            house_box(coll, f"course_{spec['id']}_{i}_{sign}", spec, size, local, mat_name,
                      slope=(fall, sign, PITCH))


def add_eaves(coll, spec, base_y, mat_name):
    """Fascia band round the roof edge with a soffit slab tucked under it."""
    r = spec["v"]["roof"]
    for tag, size, local in (
        ("f", (r["width"] + 0.08, 0.12, 0.14), (0.0, r["depth"] / 2, base_y - 0.05)),
        ("b", (r["width"] + 0.08, 0.12, 0.14), (0.0, -r["depth"] / 2, base_y - 0.05)),
        ("l", (0.12, r["depth"], 0.14), (-r["width"] / 2, 0.0, base_y - 0.05)),
        ("r", (0.12, r["depth"], 0.14), (r["width"] / 2, 0.0, base_y - 0.05)),
    ):
        house_box(coll, f"eave_{spec['id']}_{tag}", spec, size, local, mat_name)
    house_box(coll, f"soffit_{spec['id']}", spec,
              (r["width"] - 0.1, r["depth"] - 0.1, 0.05), (0.0, 0.0, base_y - 0.11), "fascia")


def build_house(coll, spec):
    v, tag = spec["v"], spec["id"]
    wall, roof_mat = spec["wall_mat"], spec["roof_mat"]
    side = -1 if spec["mirror"] else 1
    half_w, half_d = v["width"] / 2, v["depth"] / 2

    house_box(coll, f"gf_{tag}", spec, (v["width"], v["depth"], v["ground_h"]),
              (0.0, 0.0, v["ground_h"] / 2), wall)
    house_box(coll, f"plinth_{tag}", spec, (v["width"] + 0.14, v["depth"] + 0.14, 0.35),
              (0.0, 0.0, 0.175), "concrete_dark")

    upper_h = v["eave_h"] - v["ground_h"]
    uw, ud = v["width"] - 2 * v["upper_inset"], v["depth"] - 2 * v["upper_inset"]
    if v["storeys"] == 2:
        house_box(coll, f"uf_{tag}", spec, (uw, ud, upper_h),
                  (0.0, 0.0, v["ground_h"] + upper_h / 2), wall)
        if v["upper_inset"] > 0:
            # The set-back upper storey needs a balcony deck over the ground floor roof line.
            house_box(coll, f"deck_{tag}", spec, (v["width"], 0.9, 0.08),
                      (0.0, half_d - 0.45, v["ground_h"] + 0.04), "concrete")

    # --- openings -------------------------------------------------------------------
    door_u = side * v["width"] * 0.30
    add_opening(coll, f"door_{tag}", spec, "front", half_d, door_u, 1.05, 0.95, 2.1,
                glass_mat="wood_door")
    house_box(coll, f"step_{tag}", spec, (1.5, 0.7, 0.14), (door_u, half_d + 0.35, 0.07),
              "concrete")
    house_box(coll, f"porch_{tag}", spec, (1.9, 1.1, 0.12), (door_u, half_d + 0.5, 2.45),
              roof_mat)

    if spec["variant"] == "gable1":
        add_opening(coll, f"veranda_{tag}", spec, "front", half_d, -side * v["width"] * 0.20,
                    1.45, 2.4, 1.55)
    else:
        for k, u in enumerate((-side * v["width"] * 0.30, -side * v["width"] * 0.08)):
            add_opening(coll, f"gfw_{tag}_{k}", spec, "front", half_d, u, 1.55, 1.35, 1.25)

    if v["storeys"] == 2:
        upper_half_d = ud / 2
        for k, u in enumerate((-uw * 0.26, uw * 0.26)):
            add_opening(coll, f"ufw_{tag}_{k}", spec, "front", upper_half_d, u, 4.05, 1.3, 1.2)
        if spec["variant"] == "gable2":
            # Balcony across the upper front, the block's one bit of projecting structure.
            house_box(coll, f"balcony_{tag}", spec, (uw * 0.66, 1.2, 0.12),
                      (0.0, upper_half_d + 0.6, 3.42), "concrete")
            for i in range(9):
                house_box(coll, f"balrail_{tag}_{i}", spec, (0.05, 0.05, 0.9),
                          (uw * 0.33 - i * (uw * 0.66 / 8), upper_half_d + 1.15, 3.93), "frame")
            house_box(coll, f"balcap_{tag}", spec, (uw * 0.66, 0.07, 0.07),
                      (0.0, upper_half_d + 1.15, 4.41), "frame")
        for face, u_half in (("left", half_w), ("right", half_w)):
            add_opening(coll, f"sidew_{tag}_{face}", spec, face, u_half, -0.4, 1.6, 1.0, 1.15)
    else:
        for face in ("left", "right"):
            add_opening(coll, f"sidew_{tag}_{face}", spec, face, half_w, -0.4, 1.6, 1.0, 1.15)

    add_opening(coll, f"backw_{tag}", spec, "back", half_d, 0.0, 1.6, 1.2, 1.15)

    # --- roof -----------------------------------------------------------------------
    add_eaves(coll, spec, v["eave_h"], "fascia")
    add_roof(coll, f"roof_{tag}", spec, v["eave_h"], roof_mat)
    add_courses(coll, spec, v["eave_h"], roof_mat)
    r = v["roof"]
    ridge_size = ((r["ridge"] + 0.1, 0.18, 0.1) if r["axis"] == "x"
                  else (0.18, r["ridge"] + 0.1, 0.1))
    house_box(coll, f"ridge_{tag}", spec, ridge_size, (0.0, 0.0, v["eave_h"] + r["height"]),
              "concrete_dark")

    # --- services -------------------------------------------------------------------
    house_box(coll, f"ac_{tag}", spec, (0.85, 0.36, 0.6),
              (-side * (half_w - 0.9), -half_d - 0.22, 0.65), "plate")
    house_box(coll, f"gutter_{tag}", spec, (r["width"], 0.1, 0.1),
              (0.0, r["depth"] / 2 + 0.06, v["eave_h"] - 0.16), "metal")
    house_box(coll, f"downpipe_{tag}", spec, (0.09, 0.09, v["eave_h"] - 0.1),
              (side * (r["width"] / 2 - 0.15), half_d + 0.06, (v["eave_h"] - 0.1) / 2), "metal")


def build_lot(coll, spec):
    """Yard slab, block wall with a coping course, gate posts and leaf, nameplate."""
    tag = spec["id"]
    x0, x1, z0, z1 = spec["x0"], spec["x1"], spec["z0"], spec["z1"]
    add_box(coll, f"yard_{tag}", (x1 - x0, z1 - z0, 0.08),
            P((x0 + x1) / 2, (z0 + z1) / 2, -0.03), "grass")

    gate_centre = spec["cx"] if spec["facing"] in ("+z", "-z") else spec["cz"]
    open_z = z1 if spec["facing"] == "+z" else z0 if spec["facing"] == "-z" else None
    open_x = x1 if spec["facing"] == "+x" else None

    def run(name, a0, a1, b0, b1):
        if a1 - a0 < 0.05 or b1 - b0 < 0.05:
            return
        add_box(coll, f"wall_{tag}_{name}", (a1 - a0, b1 - b0, LOT_WALL_H),
                P((a0 + a1) / 2, (b0 + b1) / 2, LOT_WALL_H / 2), "concrete")
        add_box(coll, f"coping_{tag}_{name}", (a1 - a0 + 0.05, b1 - b0 + 0.05, 0.07),
                P((a0 + a1) / 2, (b0 + b1) / 2, LOT_WALL_H + 0.035), "concrete_dark")

    for side_z in (z0, z1):
        b0, b1 = side_z - LOT_WALL_T / 2, side_z + LOT_WALL_T / 2
        if side_z == open_z:
            run(f"x{side_z}a", x0, gate_centre - GATE_W / 2, b0, b1)
            run(f"x{side_z}b", gate_centre + GATE_W / 2, x1, b0, b1)
        else:
            run(f"x{side_z}", x0, x1, b0, b1)
    for side_x in (x0, x1):
        a0, a1 = side_x - LOT_WALL_T / 2, side_x + LOT_WALL_T / 2
        if side_x == open_x:
            run(f"z{side_x}a", a0, a1, z0, gate_centre - GATE_W / 2)
            run(f"z{side_x}b", a0, a1, gate_centre + GATE_W / 2, z1)
        else:
            run(f"z{side_x}", a0, a1, z0, z1)

    # Gate: two piers and a light metal leaf between them, facing the street.
    along_x = spec["facing"] in ("+z", "-z")
    edge = open_z if along_x else open_x
    for k, sign in enumerate((-1, 1)):
        pier = gate_centre + sign * (GATE_W / 2 + 0.14)
        pos = P(pier, edge, (LOT_WALL_H + 0.3) / 2) if along_x else P(edge, pier, (LOT_WALL_H + 0.3) / 2)
        add_box(coll, f"gatepier_{tag}_{k}", (0.28, 0.28, LOT_WALL_H + 0.3), pos, "concrete_dark")
    leaf_pos = P(gate_centre, edge, 0.62) if along_x else P(edge, gate_centre, 0.62)
    leaf_size = (GATE_W, 0.05, 1.15) if along_x else (0.05, GATE_W, 1.15)
    add_box(coll, f"gateleaf_{tag}", leaf_size, leaf_pos, "frame")
    plate_pos = (P(gate_centre + GATE_W / 2 + 0.3, edge - 0.1, 1.2) if along_x
                 else P(edge - 0.1, gate_centre + GATE_W / 2 + 0.3, 1.2))
    plate_size = (0.22, 0.04, 0.3) if along_x else (0.04, 0.22, 0.3)
    add_box(coll, f"nameplate_{tag}", plate_size, plate_pos, "plate")


def build_parking(coll, spec):
    """Coin parking opposite Nobita's gate: asphalt, painted bays, wheel stops, chain fence,
    a sign board and a ticket machine. Deliberately not a house — the default camera stands
    here and a building would hide the hero."""
    x0, x1, z0, z1 = spec["x0"], spec["x1"], spec["z0"], spec["z1"]
    width, depth = x1 - x0, z1 - z0
    pitch = width / spec["bays"]
    add_box(coll, "parking_slab", (width, depth, 0.08), P((x0 + x1) / 2, (z0 + z1) / 2, 0.02),
            "asphalt")
    for i in range(spec["bays"] + 1):
        x = x0 + i * pitch
        add_box(coll, f"bay_line_{i}", (0.12, depth * 0.52, 0.02), P(x, z0 + depth * 0.42, 0.07),
                "plate")
    for i in range(spec["bays"]):
        x = x0 + (i + 0.5) * pitch
        add_box(coll, f"wheelstop_{i}", (pitch * 0.5, 0.18, 0.16), P(x, z0 + depth * 0.74, 0.14),
                "concrete")
        add_cylinder(coll, f"meter_{i}", 0.11, 0.5, P(x, z0 + depth * 0.16, 0.31), "metal", verts=8)
        add_box(coll, f"meter_head_{i}", (0.26, 0.2, 0.2), P(x, z0 + depth * 0.16, 0.65), "plate")
    # Chain fence along the back and sides; the street edge stays open for cars.
    posts = ([(x, z1) for x in [x0 + i * (width / 6) for i in range(7)]]
             + [(x0, z1 - i * (depth / 3)) for i in range(1, 4)]
             + [(x1, z1 - i * (depth / 3)) for i in range(1, 4)])
    for i, (px, pz) in enumerate(posts):
        add_cylinder(coll, f"fence_post_{i}", 0.05, 0.7, P(px, pz, 0.35), "metal", verts=6)
    add_box(coll, "fence_rail_back", (width, 0.04, 0.04), P((x0 + x1) / 2, z1, 0.66), "metal")
    for k, px in enumerate((x0, x1)):
        add_box(coll, f"fence_rail_side_{k}", (0.04, depth * 0.66, 0.04),
                P(px, z1 - depth * 0.33, 0.66), "metal")
    # Sign board on the street corner.
    for k, sign in enumerate((-1, 1)):
        add_cylinder(coll, f"sign_post_{k}", 0.05, 2.4, P(x1 - 1.2 + sign * 0.5, z0 + 0.8, 1.2),
                     "metal", verts=6)
    add_box(coll, "sign_board", (1.5, 0.08, 0.9), P(x1 - 1.2, z0 + 0.8, 2.05), "plate")
    add_box(coll, "sign_band", (1.5, 0.1, 0.22), P(x1 - 1.2, z0 + 0.8, 2.36), "concrete_dark")


def build():
    coll = fresh_collection(COLLECTION)
    for spec in LOTS:
        prepare(spec)
        build_lot(coll, spec)
        build_house(coll, spec)
    build_parking(coll, PARKING)
    bpy.context.view_layer.update()
    apply_world_uvs(coll.objects)
    faces = sum(len(o.data.polygons) for o in coll.objects if o.type == "MESH")
    mats = {s.material.name for o in coll.objects for s in o.material_slots if s.material}
    print(f"NEIGHBOURS built: {len(coll.objects)} objects, {faces} faces, {len(mats)} materials")
    return coll


build()
