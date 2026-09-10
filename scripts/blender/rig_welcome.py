"""Rig one prepared character and give it a "welcome" bow animation.

Works on the normalized GLBs in assets/raw/final/characters/ (feet at z=0, facing -Y,
canon height). Builds a four-bone torso chain, weights vertices by smooth height bands —
deterministic, unlike bone-heat weighting, and exactly what a bow needs — then keys a
single "welcome" action: bow forward, hold, rise.

Inputs, then exec:

    CHAR_ID = "nobita"
    exec(open("scripts/blender/rig_welcome.py").read())

Leaves objects "<id>" (mesh) and "<id>_rig" (armature) in the CHARS collection, with the
action named "welcome" on the armature, ready for glTF export with animations.
"""

import math

import bpy
from mathutils import Vector

char_id = globals()["CHAR_ID"]
ROOT_DIR = "/Users/khoale/Devs/khoale/nobita-house-3d"
SRC = f"{ROOT_DIR}/assets/raw/final/characters/{char_id}.glb"

# Joint heights as fractions of body height, and blend half-width between bands.
BANDS = (("root", 0.0, 0.45), ("spine", 0.45, 0.65), ("chest", 0.65, 0.82), ("head", 0.82, 1.0))
BLEND = 0.04
# Bow depth per joint in degrees; cumulative ~34 degrees at the head.
BOW = {"spine": 13.0, "chest": 14.0, "head": 7.0}
FPS_KEYS = ((1, 0.0), (13, 1.0), (27, 1.0), (41, 0.0), (48, 0.0))  # frame, bow amount


def get_chars_collection():
    coll = bpy.data.collections.get("CHARS")
    if coll is None:
        coll = bpy.data.collections.new("CHARS")
        bpy.context.scene.collection.children.link(coll)
    return coll


coll = get_chars_collection()
for name in (char_id, f"{char_id}_rig"):
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

before = {o.name for o in bpy.context.scene.objects}
bpy.ops.import_scene.gltf(filepath=SRC)
new_names = [o.name for o in bpy.context.scene.objects if o.name not in before]
# The source may already be a rigged export: the importer then brings an armature and an
# icosphere bone-shape along. Keep only the biggest mesh and re-rig it from scratch.
imported = [bpy.data.objects[n] for n in new_names if n in bpy.data.objects]
meshes = sorted((o for o in imported if o.type == "MESH"),
                key=lambda o: len(o.data.vertices), reverse=True)
if not meshes:
    raise RuntimeError(f"{char_id}: no mesh imported")
mesh_obj = meshes[0]
for extra in imported:
    if extra.name != mesh_obj.name:
        bpy.data.objects.remove(extra, do_unlink=True)
new_names = [mesh_obj.name]
mesh_obj.parent = None
for modifier in list(mesh_obj.modifiers):
    mesh_obj.modifiers.remove(modifier)
mesh_obj.vertex_groups.clear()
mesh_obj.name = char_id
mesh_obj.data.name = char_id
for other_name in new_names:
    if other_name != mesh_obj.name and other_name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[other_name], do_unlink=True)
for c in list(mesh_obj.users_collection):
    c.objects.unlink(mesh_obj)
coll.objects.link(mesh_obj)
bpy.ops.object.select_all(action="DESELECT")
mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = mesh_obj
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

height = mesh_obj.dimensions.z
# The chain sits on the torso's own vertical axis, not the bounding-box centre: props held
# in front (Doraemon's dorayaki) would otherwise drag the pivot forward.
xs = [v.co.x for v in mesh_obj.data.vertices]
ys = [v.co.y for v in mesh_obj.data.vertices]
axis_x = sum(xs) / len(xs)
axis_y = sum(ys) / len(ys)

arm_data = bpy.data.armatures.new(f"{char_id}_rig")
rig = bpy.data.objects.new(f"{char_id}_rig", arm_data)
coll.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
parent = None
for bone_name, lo, hi in BANDS:
    bone = arm_data.edit_bones.new(bone_name)
    bone.head = Vector((axis_x, axis_y, lo * height))
    bone.tail = Vector((axis_x, axis_y, hi * height))
    if parent is not None:
        bone.parent = parent
        bone.use_connect = True
    parent = bone
bpy.ops.object.mode_set(mode="OBJECT")

# Height-band weights with linear cross-fades, normalised per vertex.
groups = {name: mesh_obj.vertex_groups.new(name=name) for name, _, _ in BANDS}


def band_weight(h, lo, hi):
    rise = min(1.0, max(0.0, (h - (lo - BLEND)) / (2 * BLEND))) if lo > 0 else 1.0
    fall = min(1.0, max(0.0, ((hi + BLEND) - h) / (2 * BLEND))) if hi < 1.0 else 1.0
    return min(rise, fall)


for v in mesh_obj.data.vertices:
    h = v.co.z / height
    weights = [(name, band_weight(h, lo, hi)) for name, lo, hi in BANDS]
    total = sum(w for _, w in weights) or 1.0
    for name, w in weights:
        if w > 0.001:
            groups[name].add([v.index], w / total, "REPLACE")

mod = mesh_obj.modifiers.new("rig", "ARMATURE")
mod.object = rig
mesh_obj.parent = rig

# --- the welcome bow ---------------------------------------------------------------
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="POSE")
# Purge every stale welcome AFTER the import: a previously rigged source GLB carries its
# old clips as actions, and the exporter would ship all of them.
for stale in list(bpy.data.actions):
    if stale.name.startswith("welcome"):
        bpy.data.actions.remove(stale)
action = bpy.data.actions.new("welcome")
rig.animation_data_create()
rig.animation_data.action = action
scene = bpy.context.scene
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = FPS_KEYS[-1][0]

for frame, amount in FPS_KEYS:
    scene.frame_set(frame)
    for bone_name, degrees in BOW.items():
        pose_bone = rig.pose.bones[bone_name]
        pose_bone.rotation_mode = "XYZ"
        # Bones point up (+Z); a positive local-X rotation tips the chain toward -Y,
        # the street side every character faces. Verified in-app: the negative sign
        # bowed everyone away from the viewer.
        pose_bone.rotation_euler = (math.radians(degrees) * amount, 0.0, 0.0)
        pose_bone.keyframe_insert("rotation_euler", frame=frame)
# New keyframes default to bezier interpolation; Blender 5 removed action.fcurves
# (layered actions), so no post-pass is needed or possible here.
bpy.ops.object.mode_set(mode="OBJECT")
scene.frame_set(1)
print(f"{char_id}: rigged, height {height:.2f}, axis ({axis_x:.2f}, {axis_y:.2f})")
