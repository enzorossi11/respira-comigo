import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="corpo_v2.glb")
ORG = {"PulmaoDireito","PulmaoEsquerdo","Traqueia","Bronquios","Laringe","Faringe","CavidadeNasal","Diafragma"}
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.split('.')[0] not in ORG:
        bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.data.objects: print(o.name, o.type)
bpy.ops.export_scene.gltf(filepath="orgaos.glb", export_materials='NONE', export_yup=True, export_normals=True, export_texcoords=False, export_vertex_color='NONE')
