"""Export one Blender collection to GLB with the settings this project expects.

Set COLLECTION and OUT_PATH before exec()-ing, e.g.

    COLLECTION = "ENV"; OUT_PATH = "/abs/path/public/models/environment.glb"
    exec(open("scripts/blender/export_glb.py").read())
"""

import bpy

collection_name = globals().get("COLLECTION", "ENV")
out_path = globals().get("OUT_PATH")
if not out_path:
    raise ValueError("Set OUT_PATH before running export_glb.py")

# Select only the target collection so the export ignores everything else in the file.
bpy.ops.object.select_all(action="DESELECT")
coll = bpy.data.collections[collection_name]
for obj in coll.all_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = next(iter(coll.all_objects), None)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_apply=True,            # bake modifiers
    export_animations=True,
    export_skins=True,
    export_morph=False,
    export_texture_dir="",
    export_image_format="AUTO",
    export_draco_mesh_compression_enable=False,
)
print(f"exported {collection_name} -> {out_path}")
