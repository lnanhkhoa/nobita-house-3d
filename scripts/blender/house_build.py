"""Build Nobita's house exterior with real architectural detail.

Runs inside Blender, into a fresh "HOUSE" collection so nothing else in the file is touched.
Units are metres, Blender Z-up. The house **faces Blender -Y**, which the glTF exporter turns
into +Z, matching the street side of the diorama.

Massing follows `assets/nobita_house_characters_scene.png`: a wide ground floor under a hipped
tile apron, a narrower upper storey set back behind it under a gable whose end faces the street,
and an entrance porch with its own gable projecting into the yard.

Detail follows the hero detail ladder: the silhouette carries the two stacked roof pitches, the
porch gable and the eave overhangs; the medium band gives every opening a 12 cm inset with real
frame thickness; the fine band adds the kawara rib profile, course lips, rafter tails, gutter
brackets and 2-3 cm bevels on the hard edges.
"""

import math

import bmesh
import bpy
from mathutils import Euler, Vector

COLLECTION = "HOUSE"

# --- dimensions -----------------------------------------------------------------------
GF = {"w": 8.4, "d": 7.2, "h": 2.75}          # ground floor
UF = {"w": 6.4, "d": 5.0, "h": 2.55}          # upper storey
UF_FRONT = -1.5                                # upper storey front wall, Blender Y
GF_FRONT = -GF["d"] / 2                        # -3.6
APRON_EAVE_Z = GF["h"]                         # 2.75
APRON_TOP_Z = 3.55                             # where the apron meets the upper wall
OVERHANG = 0.55
UF_BASE_Z = GF["h"]
UF_TOP_Z = UF_BASE_Z + UF["h"]                 # 5.30
GABLE_OVERHANG = 0.5
GABLE_PITCH = math.radians(20.0)

TILE_W = 0.30        # kawara pan width
TILE_RIB = 0.045     # how far the roll stands proud of the pan
COURSE_L = 0.29      # visible length of one course up the slope
COURSE_LIP = 0.022   # how far each course overlaps the one below

COLOURS = {
    "stucco": (0.815, 0.775, 0.688, 1.0),
    "stucco_shadow": (0.690, 0.655, 0.580, 1.0),
    "interior": (0.055, 0.050, 0.048, 1.0),
    "curtain": (0.720, 0.700, 0.660, 1.0),
    "tile": (0.185, 0.213, 0.281, 1.0),
    "tile_ridge": (0.150, 0.175, 0.236, 1.0),
    "fascia": (0.700, 0.672, 0.618, 1.0),
    "soffit": (0.775, 0.745, 0.685, 1.0),
    "wood_shutter": (0.560, 0.360, 0.160, 1.0),
    "wood_door": (0.330, 0.180, 0.085, 1.0),
    "frame": (0.640, 0.660, 0.685, 1.0),
    "glass": (0.240, 0.360, 0.470, 1.0),
    "metal": (0.320, 0.340, 0.360, 1.0),
    "concrete": (0.640, 0.625, 0.600, 1.0),
}

ROUGHNESS = {"glass": 0.12, "metal": 0.35, "tile": 0.55}


def material(name):
    mat = bpy.data.materials.get(f"house_{name}")
    if mat is not None:
        return mat
    mat = bpy.data.materials.new(f"house_{name}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = COLOURS[name]
    bsdf.inputs["Roughness"].default_value = ROUGHNESS.get(name, 0.82)
    if name == "glass":
        bsdf.inputs["Metallic"].default_value = 0.15
    if name == "metal":
        bsdf.inputs["Metallic"].default_value = 0.75
    return mat


def fresh_collection():
    existing = bpy.data.collections.get(COLLECTION)
    if existing:
        for obj in list(existing.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(existing)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    coll = bpy.data.collections.new(COLLECTION)
    bpy.context.scene.collection.children.link(coll)
    return coll


def finish(coll, name, bm, mat_name, bevel=0.0):
    """Turn a bmesh into an object, optionally bevelling every hard edge for a highlight."""
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.verts) + list(bm.edges), offset=bevel,
                        segments=2, profile=0.7, affect="EDGES", clamp_overlap=True)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material(mat_name))
    coll.objects.link(obj)
    return obj


def box(coll, name, size, centre, mat_name, bevel=0.02, rot=None):
    """Axis-aligned box. `rot` is an XYZ euler applied about the box's own centre."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if rot:
        matrix = Euler(rot, "XYZ").to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(centre), verts=bm.verts)
    return finish(coll, name, bm, mat_name, bevel)


# --- kawara tiled surface -------------------------------------------------------------
def tile_offset(u_metres, v_metres):
    """Height above the bare slope plane: a rolled rib across the slope, a lip per course."""
    # Rolled rib: a raised half-cosine over the last third of each pan.
    phase = (u_metres % TILE_W) / TILE_W
    rib = 0.0
    if phase > 0.62:
        rib = TILE_RIB * math.sin((phase - 0.62) / 0.38 * math.pi)
    # Course lip: each course sits proud of the one below, fading over its own length.
    cphase = (v_metres % COURSE_L) / COURSE_L
    lip = COURSE_LIP * (1.0 - cphase) ** 1.6
    return rib + lip


def tiled_patch(coll, name, corners, mat_name="tile", u_per_tile=4, thickness=0.06):
    """Tile a bilinear quad. corners = (eave_left, eave_right, ridge_right, ridge_left)."""
    e0, e1, r1, r0 = (Vector(c) for c in corners)
    eave_len = (e1 - e0).length
    slope_len = max((r0 - e0).length, (r1 - e1).length)
    nu = max(4, int(round(eave_len / TILE_W * u_per_tile)))
    nv = max(2, int(round(slope_len / COURSE_L * 2)))

    normal = (e1 - e0).cross(r0 - e0)
    if normal.length < 1e-6:
        raise ValueError(f"{name}: degenerate patch")
    normal.normalize()
    if normal.z < 0:
        normal = -normal

    def point(u, v, lift):
        low = e0.lerp(e1, u)
        high = r0.lerp(r1, u)
        base = low.lerp(high, v)
        return base + normal * lift

    bm = bmesh.new()
    top = [[None] * (nv + 1) for _ in range(nu + 1)]
    bottom = [[None] * (nv + 1) for _ in range(nu + 1)]
    for i in range(nu + 1):
        u = i / nu
        for j in range(nv + 1):
            v = j / nv
            lift = tile_offset(u * eave_len, v * slope_len)
            top[i][j] = bm.verts.new(point(u, v, lift))
            bottom[i][j] = bm.verts.new(point(u, v, -thickness))
    bm.verts.ensure_lookup_table()
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
            bm.faces.new((bottom[i][j + 1], bottom[i + 1][j + 1], bottom[i + 1][j], bottom[i][j]))
    # Close the four borders so the slab reads as solid at the eave and verges.
    for i in range(nu):
        bm.faces.new((top[i + 1][0], top[i][0], bottom[i][0], bottom[i + 1][0]))
        bm.faces.new((top[i][nv], top[i + 1][nv], bottom[i + 1][nv], bottom[i][nv]))
    for j in range(nv):
        bm.faces.new((top[0][j], top[0][j + 1], bottom[0][j + 1], bottom[0][j]))
        bm.faces.new((top[nu][j + 1], top[nu][j], bottom[nu][j], bottom[nu][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = finish(coll, name, bm, mat_name, bevel=0.0)
    obj.data.polygons.foreach_set("use_smooth", [False] * len(obj.data.polygons))
    return obj


def ridge_cap(coll, name, start, end, width=0.26, height=0.17):
    """Rounded ridge tile: a half-cylinder run with a disc cap at each visible end."""
    start, end = Vector(start), Vector(end)
    axis = end - start
    length = axis.length
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12,
                          radius1=width / 2, radius2=width / 2, depth=length)
    bmesh.ops.scale(bm, vec=Vector((1.0, height / (width / 2), 1.0)), verts=bm.verts)
    obj = finish(coll, name, bm, "tile_ridge", bevel=0.0)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = axis.to_track_quat("Z", "Y")
    obj.location = (start + end) / 2
    return obj


# --- openings -------------------------------------------------------------------------
INSET = 0.12          # how far the glass sits behind the wall face
NICHE = 0.30          # depth of the recess cut into the wall

# Openings register a cutter here; apply_openings() subtracts them from the named wall so the
# recess is real geometry rather than a panel buried inside a solid box.
CUTTERS = []


def register_cut(wall, size, centre):
    """`wall` is the object itself, not its name: a leftover object from an earlier run can hold
    the name and silently absorb every cut while the real wall stays solid."""
    CUTTERS.append((wall, tuple(size), tuple(centre)))


def apply_openings(coll):
    """Boolean-difference every registered cutter out of its wall."""
    scene_coll = bpy.context.scene.collection
    by_wall = {}
    for wall, size, centre in CUTTERS:
        by_wall.setdefault(wall.name, (wall, []))[1].append((size, centre))
    for wall_name, (target, cuts) in by_wall.items():
        for index, (size, centre) in enumerate(cuts):
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
            bmesh.ops.translate(bm, vec=Vector(centre), verts=bm.verts)
            mesh = bpy.data.meshes.new(f"{wall_name}_cut_{index}")
            bm.to_mesh(mesh)
            bm.free()
            cutter = bpy.data.objects.new(f"{wall_name}_cut_{index}", mesh)
            scene_coll.objects.link(cutter)
            mod = target.modifiers.new(f"cut_{index}", "BOOLEAN")
            mod.operation = "DIFFERENCE"
            mod.solver = "EXACT"
            mod.object = cutter
            # modifier_apply reads the active object out of the operator context, so give it an
            # explicit override; setting view_layer.objects.active alone silently does nothing here.
            before = len(target.data.vertices)
            with bpy.context.temp_override(object=target, active_object=target,
                                           selected_objects=[target],
                                           selected_editable_objects=[target]):
                bpy.ops.object.modifier_apply(modifier=mod.name)
            after = len(target.data.vertices)
            if after <= before:
                raise RuntimeError(
                    f"{wall_name}: cut {index} changed nothing ({before} -> {after} verts)")
            bpy.data.objects.remove(cutter, do_unlink=True)
    CUTTERS.clear()
FRAME_T = 0.07        # frame bar thickness
FRAME_D = 0.09        # frame depth


def sliding_window(coll, name, centre, width, height, panes=2, facing=-1.0, wall=None):
    """Aluminium sliding window: reveal, outer frame, sashes with a meeting mullion, glass, sill."""
    cx, cy, cz = centre
    if wall:
        register_cut(wall, (width, NICHE * 2, height), (cx, cy, cz))
    face_y = cy + facing * 0.0
    back_y = cy - facing * INSET
    parts = []

    # Dark interior behind the glass, and a curtain hint so the pane is not a black void.
    parts.append(box(coll, f"{name}_interior", (width + 0.04, 0.02, height + 0.04),
                     (cx, cy - facing * (NICHE - 0.02), cz), "interior", bevel=0.0))
    parts.append(box(coll, f"{name}_curtain", (width * 0.42, 0.015, height - 0.10),
                     (cx - width * 0.24, cy - facing * (NICHE - 0.06), cz), "curtain", bevel=0.0))
    # Outer frame, four bars on the recessed plane.
    fy = back_y + facing * 0.02
    for tag, size, off in (
        ("top", (width, FRAME_D, FRAME_T), (0, 0, height / 2 - FRAME_T / 2)),
        ("bottom", (width, FRAME_D, FRAME_T), (0, 0, -height / 2 + FRAME_T / 2)),
        ("left", (FRAME_T, FRAME_D, height), (-width / 2 + FRAME_T / 2, 0, 0)),
        ("right", (FRAME_T, FRAME_D, height), (width / 2 - FRAME_T / 2, 0, 0)),
    ):
        parts.append(box(coll, f"{name}_frame_{tag}", size,
                         (cx + off[0], fy, cz + off[2]), "frame", bevel=0.008))
    # Meeting rails between panes; the sashes overlap so the bar is doubled in depth.
    for i in range(1, panes):
        mx = cx - width / 2 + width * i / panes
        parts.append(box(coll, f"{name}_mullion_{i}", (0.055, FRAME_D * 1.15, height - FRAME_T * 2),
                         (mx, fy, cz), "frame", bevel=0.006))
    # Glass, set behind the frame so it catches a different reflection.
    parts.append(box(coll, f"{name}_glass", (width - FRAME_T * 2, 0.012, height - FRAME_T * 2),
                     (cx, fy - facing * FRAME_D * 0.4, cz), "glass", bevel=0.0))
    # Sill projecting past the wall face with a drip edge.
    parts.append(box(coll, f"{name}_sill", (width + 0.16, INSET + 0.10, 0.05),
                     (cx, back_y + facing * (INSET / 2 - 0.05), cz - height / 2 - 0.03),
                     "concrete", bevel=0.012))
    return parts


def louvre_shutter(coll, name, centre, width, height, facing=-1.0, wall=None):
    """Wooden storm shutter: a box frame filled with angled horizontal slats."""
    cx, cy, cz = centre
    if wall:
        register_cut(wall, (width, NICHE * 2, height), (cx, cy, cz))
    back_y = cy - facing * INSET
    parts = [box(coll, f"{name}_backing", (width + 0.04, 0.02, height + 0.04),
                 (cx, cy - facing * (NICHE - 0.02), cz), "stucco_shadow", bevel=0.0)]
    fy = back_y + facing * 0.03
    parts.append(box(coll, f"{name}_panel", (width, 0.05, height), (cx, fy + facing * 0.02, cz),
                     "wood_shutter", bevel=0.012))
    for tag, size, off in (
        ("top", (width + 0.05, 0.09, 0.075), (0, 0, height / 2 - 0.0375)),
        ("bottom", (width + 0.05, 0.09, 0.075), (0, 0, -height / 2 + 0.0375)),
        ("left", (0.075, 0.09, height + 0.05), (-width / 2 + 0.0375, 0, 0)),
        ("right", (0.075, 0.09, height + 0.05), (width / 2 - 0.0375, 0, 0)),
    ):
        parts.append(box(coll, f"{name}_stile_{tag}", size, (cx + off[0], fy, cz + off[2]),
                         "wood_shutter", bevel=0.008))
    slat_h = 0.075
    count = int((height - 0.18) / slat_h)
    for i in range(count):
        z = cz - (height - 0.18) / 2 + slat_h * (i + 0.5)
        # Tilted so each slat catches the sun on its top edge and shades the one below.
        parts.append(box(coll, f"{name}_slat_{i}", (width - 0.10, 0.055, slat_h * 0.72),
                         (cx, fy + facing * 0.035, z), "wood_shutter", bevel=0.005,
                         rot=(math.radians(16), 0.0, 0.0)))
    return parts


def panel_door(coll, name, centre, width, height, facing=-1.0, wall=None):
    """Front door: recessed leaf, vertical planks, a glazed light and a handle."""
    cx, cy, cz = centre
    if wall:
        register_cut(wall, (width, NICHE * 2, height), (cx, cy, cz))
    back_y = cy - facing * INSET
    parts = [box(coll, f"{name}_backing", (width + 0.06, 0.02, height + 0.04),
                 (cx, cy - facing * (NICHE - 0.02), cz), "interior", bevel=0.0)]
    fy = back_y + facing * 0.04
    parts.append(box(coll, f"{name}_leaf", (width, 0.07, height), (cx, fy, cz), "wood_door",
                     bevel=0.012))
    planks = 5
    for i in range(planks):
        px = cx - width / 2 + width * (i + 0.5) / planks
        parts.append(box(coll, f"{name}_plank_{i}", (width / planks * 0.82, 0.022, height - 0.09),
                         (px, fy + facing * 0.045, cz), "wood_door", bevel=0.006))
    parts.append(box(coll, f"{name}_light", (width * 0.34, 0.03, 0.34),
                     (cx, fy + facing * 0.055, cz + height * 0.28), "glass", bevel=0.0))
    parts.append(box(coll, f"{name}_handle", (0.045, 0.08, 0.30),
                     (cx + width / 2 - 0.13, fy + facing * 0.08, cz - 0.02), "metal", bevel=0.012))
    for tag, size, off in (
        ("top", (width + 0.22, 0.10, 0.09), (0, 0, height / 2 + 0.045)),
        ("left", (0.09, 0.10, height + 0.09), (-width / 2 - 0.055, 0, 0)),
        ("right", (0.09, 0.10, height + 0.09), (width / 2 + 0.055, 0, 0)),
    ):
        parts.append(box(coll, f"{name}_case_{tag}", size, (cx + off[0], fy - facing * 0.02,
                                                            cz + off[2]), "frame", bevel=0.008))
    return parts


# --- eaves, gutters, trim -------------------------------------------------------------
def eave_run(coll, name, start, end, out_dir, fascia_h=0.12, soffit=0.5, rafters=True):
    """Fascia board, soffit panel and exposed rafter tails along one eave line."""
    start, end = Vector(start), Vector(end)
    axis = end - start
    length = axis.length
    mid = (start + end) / 2
    horizontal = Vector((axis.x, axis.y, 0)).normalized()
    out = Vector(out_dir).normalized()
    parts = []

    def oriented(sub_name, size, offset, mat, bevel=0.01):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
        obj = finish(coll, sub_name, bm, mat, bevel)
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = horizontal.to_track_quat("X", "Z")
        obj.location = mid + Vector(offset)
        return obj

    parts.append(oriented(f"{name}_fascia", (length, 0.06, fascia_h),
                          out * 0.03 + Vector((0, 0, -fascia_h / 2)), "fascia"))
    parts.append(oriented(f"{name}_soffit", (length, soffit, 0.04),
                          -out * soffit / 2 + Vector((0, 0, -fascia_h + 0.02)), "soffit"))
    if rafters:
        count = max(2, int(length / 0.46))
        for i in range(count):
            t = (i + 0.5) / count
            pos = start.lerp(end, t) - mid
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=Vector((0.07, soffit * 0.55, 0.10)), verts=bm.verts)
            obj = finish(coll, f"{name}_rafter_{i}", bm, "fascia", 0.008)
            obj.rotation_mode = "QUATERNION"
            obj.rotation_quaternion = horizontal.to_track_quat("X", "Z")
            obj.location = mid + pos - out * soffit * 0.22 + Vector((0, 0, -fascia_h - 0.03))
            parts.append(obj)
    return parts


def gutter_run(coll, name, start, end, out_dir, radius=0.075):
    """Half-round gutter with brackets, hung just below and outside the fascia."""
    start, end = Vector(start), Vector(end)
    axis = end - start
    length = axis.length
    out = Vector(out_dir).normalized()
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=10,
                          radius1=radius, radius2=radius, depth=length)
    obj = finish(coll, f"{name}_trough", bm, "metal", 0.0)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = axis.to_track_quat("Z", "Y")
    obj.location = (start + end) / 2 + out * (radius * 0.8) + Vector((0, 0, -radius - 0.14))
    parts = [obj]
    count = max(2, int(length / 0.9))
    for i in range(count):
        t = (i + 0.5) / count
        pos = start.lerp(end, t) + out * (radius * 0.4) + Vector((0, 0, -radius - 0.05))
        parts.append(box(coll, f"{name}_bracket_{i}", (0.05, radius * 2.4, 0.05), pos,
                         "metal", bevel=0.006))
    return parts


def downpipe(coll, name, top, bottom, radius=0.048):
    top, bottom = Vector(top), Vector(bottom)
    axis = bottom - top
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8,
                          radius1=radius, radius2=radius, depth=axis.length)
    obj = finish(coll, name, bm, "metal", 0.0)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = axis.to_track_quat("Z", "Y")
    obj.location = (top + bottom) / 2
    parts = [obj]
    for i in range(max(2, int(axis.length / 1.2))):
        t = (i + 0.5) / max(2, int(axis.length / 1.2))
        parts.append(box(coll, f"{name}_clip_{i}", (radius * 3.0, radius * 3.0, 0.035),
                         top.lerp(bottom, t), "metal", bevel=0.006))
    return parts


def rotate_parts(parts, angle_z, pivot):
    """Spin a group of freshly built parts about a vertical axis, for walls that do not face -Y."""
    pivot = Vector(pivot)
    for obj in parts:
        offset = obj.location - pivot
        obj.location = pivot + Vector((
            offset.x * math.cos(angle_z) - offset.y * math.sin(angle_z),
            offset.x * math.sin(angle_z) + offset.y * math.cos(angle_z),
            offset.z,
        ))
        if obj.rotation_mode == "QUATERNION":
            obj.rotation_mode = "XYZ"
        obj.rotation_euler[2] += angle_z
    return parts


def gable_wall(coll, name, half_width, y, z_base, z_apex, thickness=0.22, mat="stucco",
               centre_x=0.0):
    """Triangular wall closing a gable end."""
    bm = bmesh.new()
    front = y - thickness / 2
    back = y + thickness / 2
    pts = []
    for yy in (front, back):
        pts.append([
            bm.verts.new((centre_x - half_width, yy, z_base)),
            bm.verts.new((centre_x + half_width, yy, z_base)),
            bm.verts.new((centre_x, yy, z_apex)),
        ])
    bm.faces.new(pts[0])
    bm.faces.new(list(reversed(pts[1])))
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((pts[0][i], pts[0][j], pts[1][j], pts[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(coll, name, bm, mat, bevel=0.0)


def build():
    coll = fresh_collection()
    parts = []

    gf_half_w = GF["w"] / 2                 # 4.20
    gf_front = GF_FRONT                     # -3.60
    gf_back = GF["d"] / 2                   # 3.60
    uf_half_w = UF["w"] / 2                 # 3.20
    uf_back = UF_FRONT + UF["d"]            # 3.50
    eave_half_w = gf_half_w + OVERHANG      # 4.75
    eave_front = gf_front - OVERHANG        # -4.15
    eave_back = gf_back + OVERHANG          # 4.15

    # --- masses ---
    ground_wall = box(coll, "ground_floor", (GF["w"], GF["d"], GF["h"]), (0, 0, GF["h"] / 2),
                      "stucco", bevel=0.03)
    parts.append(ground_wall)
    parts.append(box(coll, "plinth", (GF["w"] + 0.10, GF["d"] + 0.10, 0.36),
                     (0, 0, 0.18), "concrete", bevel=0.025))
    upper_wall = box(coll, "upper_floor", (UF["w"], UF["d"], UF["h"]),
                     (0, UF_FRONT + UF["d"] / 2, UF_BASE_Z + UF["h"] / 2), "stucco", bevel=0.03)
    parts.append(upper_wall)

    # --- lower hipped tile apron wrapping the upper storey ---
    apron = {
        "front": ((-eave_half_w, eave_front, APRON_EAVE_Z), (eave_half_w, eave_front, APRON_EAVE_Z),
                  (uf_half_w, UF_FRONT, APRON_TOP_Z), (-uf_half_w, UF_FRONT, APRON_TOP_Z)),
        "back": ((eave_half_w, eave_back, APRON_EAVE_Z), (-eave_half_w, eave_back, APRON_EAVE_Z),
                 (-uf_half_w, uf_back, APRON_TOP_Z), (uf_half_w, uf_back, APRON_TOP_Z)),
        "left": ((-eave_half_w, eave_back, APRON_EAVE_Z), (-eave_half_w, eave_front, APRON_EAVE_Z),
                 (-uf_half_w, UF_FRONT, APRON_TOP_Z), (-uf_half_w, uf_back, APRON_TOP_Z)),
        "right": ((eave_half_w, eave_front, APRON_EAVE_Z), (eave_half_w, eave_back, APRON_EAVE_Z),
                  (uf_half_w, uf_back, APRON_TOP_Z), (uf_half_w, UF_FRONT, APRON_TOP_Z)),
    }
    for tag, corners in apron.items():
        parts.append(tiled_patch(coll, f"apron_{tag}", corners))
    # Hip ridges where the apron faces meet, plus the flashing run along the upper wall.
    for sx in (-1, 1):
        parts.append(ridge_cap(coll, f"apron_hip_front_{sx}",
                               (sx * eave_half_w, eave_front, APRON_EAVE_Z + 0.05),
                               (sx * uf_half_w, UF_FRONT, APRON_TOP_Z + 0.05), width=0.20, height=0.13))
        parts.append(ridge_cap(coll, f"apron_hip_back_{sx}",
                               (sx * eave_half_w, eave_back, APRON_EAVE_Z + 0.05),
                               (sx * uf_half_w, uf_back, APRON_TOP_Z + 0.05), width=0.20, height=0.13))

    # --- upper gable roof ---
    ridge_z = UF_TOP_Z + (uf_half_w + GABLE_OVERHANG) * math.tan(GABLE_PITCH)
    verge_front = UF_FRONT - GABLE_OVERHANG
    verge_back = uf_back + GABLE_OVERHANG
    gable_eave_x = uf_half_w + GABLE_OVERHANG
    parts.append(tiled_patch(coll, "gable_left",
                             ((-gable_eave_x, verge_front, UF_TOP_Z), (-gable_eave_x, verge_back, UF_TOP_Z),
                              (0, verge_back, ridge_z), (0, verge_front, ridge_z))))
    parts.append(tiled_patch(coll, "gable_right",
                             ((gable_eave_x, verge_back, UF_TOP_Z), (gable_eave_x, verge_front, UF_TOP_Z),
                              (0, verge_front, ridge_z), (0, verge_back, ridge_z))))
    parts.append(ridge_cap(coll, "gable_ridge", (0, verge_front - 0.05, ridge_z + 0.06),
                           (0, verge_back + 0.05, ridge_z + 0.06), width=0.30, height=0.20))
    # Barge boards along both verges, and the triangular wall they close.
    apex_under = ridge_z - 0.10
    parts.append(gable_wall(coll, "gable_wall_front", uf_half_w, UF_FRONT, UF_TOP_Z - 0.02, apex_under))
    parts.append(gable_wall(coll, "gable_wall_back", uf_half_w, uf_back, UF_TOP_Z - 0.02, apex_under))
    for tag, yy, out in (("front", verge_front, (0, -1, 0)), ("back", verge_back, (0, 1, 0))):
        for sx in (-1, 1):
            bm = bmesh.new()
            run = math.hypot(gable_eave_x, ridge_z - UF_TOP_Z)
            bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=Vector((run, 0.07, 0.19)), verts=bm.verts)
            obj = finish(coll, f"barge_{tag}_{sx}", bm, "fascia", 0.012)
            obj.location = (sx * gable_eave_x / 2, yy + out[1] * 0.05, (UF_TOP_Z + ridge_z) / 2 - 0.08)
            obj.rotation_euler[1] = sx * GABLE_PITCH
            parts.append(obj)
    # Gable vent, the small louvre high on the street-facing triangle.
    parts.append(box(coll, "gable_vent", (0.62, 0.10, 0.22),
                     (0, UF_FRONT - 0.07, UF_TOP_Z + 0.72), "wood_shutter", bevel=0.01))

    # --- eaves, gutters, downpipes ---
    parts += eave_run(coll, "eave_apron_front", (-eave_half_w, eave_front, APRON_EAVE_Z),
                      (eave_half_w, eave_front, APRON_EAVE_Z), (0, -1, 0), soffit=OVERHANG)
    parts += eave_run(coll, "eave_apron_back", (-eave_half_w, eave_back, APRON_EAVE_Z),
                      (eave_half_w, eave_back, APRON_EAVE_Z), (0, 1, 0), soffit=OVERHANG, rafters=False)
    for sx, tag in ((-1, "left"), (1, "right")):
        parts += eave_run(coll, f"eave_apron_{tag}", (sx * eave_half_w, eave_front, APRON_EAVE_Z),
                          (sx * eave_half_w, eave_back, APRON_EAVE_Z), (sx, 0, 0), soffit=OVERHANG)
        parts += eave_run(coll, f"eave_gable_{tag}", (sx * gable_eave_x, verge_front, UF_TOP_Z),
                          (sx * gable_eave_x, verge_back, UF_TOP_Z), (sx, 0, 0),
                          fascia_h=0.15, soffit=GABLE_OVERHANG)
        parts += gutter_run(coll, f"gutter_gable_{tag}", (sx * gable_eave_x, verge_front, UF_TOP_Z),
                            (sx * gable_eave_x, verge_back, UF_TOP_Z), (sx, 0, 0))
    parts += gutter_run(coll, "gutter_apron_front", (-eave_half_w, eave_front, APRON_EAVE_Z),
                        (eave_half_w, eave_front, APRON_EAVE_Z), (0, -1, 0))
    parts += downpipe(coll, "downpipe_upper", (gable_eave_x + 0.06, verge_front + 0.40, UF_TOP_Z - 0.24),
                      (gable_eave_x + 0.06, verge_front + 0.40, APRON_TOP_Z + 0.35))
    parts += downpipe(coll, "downpipe_lower", (gf_half_w + 0.12, eave_front + 0.12, APRON_EAVE_Z - 0.20),
                      (gf_half_w + 0.12, eave_front + 0.12, 0.05))

    # --- openings on the street facade ---
    parts += sliding_window(coll, "win_upper", (-1.05, UF_FRONT, 4.18), 1.80, 1.20,
                            wall=upper_wall)
    parts += louvre_shutter(coll, "shutter_upper", (1.32, UF_FRONT, 4.18), 0.98, 1.20,
                            wall=upper_wall)
    parts += sliding_window(coll, "win_ground", (-1.65, gf_front, 1.15), 2.60, 1.70, panes=3,
                            wall=ground_wall)
    # Pent roof over the ground-floor window, the small tiled hood in the reference.
    hood_z = 1.15 + 1.70 / 2 + 0.30
    parts.append(tiled_patch(coll, "hood_ground",
                             ((-1.65 - 1.55, gf_front - 0.52, hood_z - 0.14),
                              (-1.65 + 1.55, gf_front - 0.52, hood_z - 0.14),
                              (-1.65 + 1.55, gf_front + 0.02, hood_z + 0.10),
                              (-1.65 - 1.55, gf_front + 0.02, hood_z + 0.10)), u_per_tile=3))
    parts += eave_run(coll, "hood_eave", (-1.65 - 1.55, gf_front - 0.52, hood_z - 0.14),
                      (-1.65 + 1.55, gf_front - 0.52, hood_z - 0.14), (0, -1, 0),
                      fascia_h=0.10, soffit=0.30, rafters=False)

    # --- side windows ---
    # Side windows are built facing -Y, spun about the world origin so the outward direction
    # becomes -X, and only then translated onto the left wall. Rotating after the translation
    # would swing them off the building, because box() bakes its position into the mesh.
    for win_name, wall, wall_x, depth_y, size, height_z in (
        ("win_left_side", ground_wall, -gf_half_w, 0.60, (1.30, 1.10), 1.35),
        ("win_upper_side", upper_wall, -uf_half_w, 1.00, (1.20, 1.05), 4.18),
    ):
        win = sliding_window(coll, win_name, (0.0, 0.0, height_z), size[0], size[1])
        rotate_parts(win, math.radians(-90), (0.0, 0.0, 0.0))
        for obj in win:
            obj.location += Vector((wall_x, depth_y, 0.0))
        register_cut(wall, (NICHE * 2, size[0], size[1]), (wall_x, depth_y, height_z))
        parts += win

    return coll, parts, ground_wall


def build_porch(coll, ground_wall):
    """Entrance porch: its own gable projecting into the yard, with door, step and lamp."""
    parts = []
    gf_front = GF_FRONT
    px_left, px_right = 0.85, 3.45
    px_mid = (px_left + px_right) / 2
    front_y = gf_front - 1.55
    eave_z = 2.42
    pitch = math.radians(22.0)
    eave_left = px_left - 0.35
    eave_right = px_right + 0.35
    ridge_z = eave_z + (eave_right - px_mid) * math.tan(pitch)
    verge_front = front_y - 0.30
    verge_back = gf_front + 0.20

    parts.append(box(coll, "porch_right_wall", (0.22, 1.75, eave_z),
                     (px_right, gf_front - 0.85, eave_z / 2), "stucco", bevel=0.025))
    parts.append(box(coll, "porch_head", (eave_right - eave_left, 1.95, 0.28),
                     (px_mid, gf_front - 0.85, eave_z - 0.14), "stucco", bevel=0.02))
    parts.append(box(coll, "porch_step", (2.30, 1.30, 0.16),
                     (px_mid, gf_front - 0.75, 0.08), "concrete", bevel=0.02))

    parts.append(tiled_patch(coll, "porch_roof_left",
                             ((eave_left, verge_front, eave_z), (eave_left, verge_back, eave_z),
                              (px_mid, verge_back, ridge_z), (px_mid, verge_front, ridge_z)),
                             u_per_tile=3))
    parts.append(tiled_patch(coll, "porch_roof_right",
                             ((eave_right, verge_back, eave_z), (eave_right, verge_front, eave_z),
                              (px_mid, verge_front, ridge_z), (px_mid, verge_back, ridge_z)),
                             u_per_tile=3))
    parts.append(ridge_cap(coll, "porch_ridge", (px_mid, verge_front + 0.02, ridge_z + 0.04),
                           (px_mid, verge_back, ridge_z + 0.04), width=0.19, height=0.13))
    parts.append(gable_wall(coll, "porch_gable_wall", (eave_right - eave_left) / 2 - 0.32,
                            verge_front + 0.18, eave_z - 0.05, ridge_z - 0.09, thickness=0.16,
                            centre_x=px_mid))
    for sx, x in ((-1, eave_left), (1, eave_right)):
        parts += eave_run(coll, f"porch_eave_{sx}", (x, verge_front, eave_z), (x, verge_back, eave_z),
                          (sx, 0, 0), fascia_h=0.13, soffit=0.32, rafters=False)

    parts += panel_door(coll, "front_door", (px_mid - 0.1, gf_front, 1.10), 0.95, 2.05,
                        wall=ground_wall)
    parts.append(box(coll, "porch_lamp", (0.16, 0.16, 0.22),
                     (px_right - 0.35, gf_front - 0.25, 2.05), "frame", bevel=0.02))
    parts.append(box(coll, "nameplate_house", (0.24, 0.03, 0.10),
                     (px_right - 0.14, gf_front - 0.02, 1.62), "frame", bevel=0.006))
    return parts


def build_all():
    coll, parts, ground_wall = build()
    parts += build_porch(coll, ground_wall)
    apply_openings(coll)
    tris = 0
    for obj in coll.objects:
        obj.data.calc_loop_triangles()
        tris += len(obj.data.loop_triangles)
    print(f"HOUSE: {len(coll.objects)} objects, {tris} triangles")
    return coll


build_all()
