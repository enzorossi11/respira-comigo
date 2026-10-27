import bpy, bmesh, re
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath="extr/Z-Anatomy/Startup.blend")
O = bpy.data.objects
dg = bpy.context.evaluated_depsgraph_get()
desc = lambda n: [O[n]] + list(O[n].children_recursive)
RUIDO = re.compile(r"\.[tjsig]$|\.[oe]\d?[lr]$|'")
def malhas(objs, excluir=set()):
    return [o for o in objs if o.type in ('MESH','CURVE') and o.name not in excluir and not RUIDO.search(o.name)]

hairs = {o.name for o in desc("Hairs.g")}
perineo = {o.name for o in desc("Regions of perineum.g")}
G = {}
G["PeleCabeca"] = malhas(desc("Regions of head.g"))
G["PeleTronco"] = malhas(desc("Regions of thorax.g")+desc("Regions of abdomen.g")+desc("Regions of back.g")+desc("Regions of neck.g"))
G["PeleMembros"] = malhas(desc("Regions of upper limb.g")+desc("Regions of lower limb.g"))
G["Cabelo"] = [O[n] for n in ["Hairs of head","Hairs of eyebrow.l","Hairs of eyebrow.r","Eyelashes.l","Eyelashes.r"]]
G["Esclera"] = [O["Sclera.l"], O["Sclera.r"]]
G["Iris"] = [O["Iris.l"], O["Iris.r"]]
G["PulmaoDireito"] = malhas(desc("Right lung.g"))
G["PulmaoEsquerdo"] = malhas(desc("Left lung.g"))
G["Traqueia"] = [O["Trachea"]]
G["Bronquios"] = malhas(desc("Bronchi.g"))
G["Laringe"] = [O[n] for n in ["Epiglottis","Thyroid cartilage","Cricoid cartilage","Arytenoid cartilage.l","Arytenoid cartilage.r"]]
G["Faringe"] = [O[n] for n in ["Nasopharynx","Oropharynx","Laryngopharynx"]]
G["CavidadeNasal"] = [O["Mucosa of nasal cavity"]] + malhas(desc("Nasal cartilages.g"))
G["Diafragma"] = [O["Diaphragm"]]
SUBDIV = {"PeleCabeca","PeleTronco","PeleMembros"}
DECIMAR = {"Bronquios":0.3, "Diafragma":0.3, "Laringe":0.6, "PulmaoDireito":0.6, "PulmaoEsquerdo":0.6, "Cabelo":0.7}

def juntar(objs, sem_solidify=True):
    bm = bmesh.new()
    for o in objs:
        mods = [m for m in getattr(o,'modifiers',[]) if m.type=='SOLIDIFY' and m.show_viewport] if sem_solidify else []
        for m in mods: m.show_viewport=False
        dg.update(); ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        if me and len(me.polygons):
            me.transform(o.matrix_world); bm.from_mesh(me)
        ev.to_mesh_clear()
        for m in mods: m.show_viewport=True
    return bm

def finalizar(bm, nome, dist=0.0015, decimar=None):
    if nome.startswith("Pele"):
        # as metades .l/.r da pele se encontram no meio: cola a costura (senão fica uma fresta)
        for v in bm.verts:
            if abs(v.co.x) < 0.0025: v.co.x = 0.0
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth=True
    ob = bpy.data.objects.new(nome, me); col.objects.link(ob)
    if decimar:
        m = ob.modifiers.new("d","DECIMATE"); m.ratio=decimar
    return ob

col = bpy.data.collections.new("EXPORT"); bpy.context.scene.collection.children.link(col)
for nome, objs in G.items():
    ob = finalizar(juntar(objs), nome, dist=0.002 if nome.startswith("Pele") else 0.0015, decimar=DECIMAR.get(nome))
    if nome in SUBDIV:
        m = ob.modifiers.new("s","SUBSURF"); m.levels=1; m.render_levels=1

# --- Bermuda: tubos "moldados" no corpo por raios (cintura+quadril e as duas pernas)
import math
from mathutils.bvhtree import BVHTree
fonte = malhas(desc("Regions of abdomen.g")+desc("Regions of back.g")+desc("Regions of lower limb.g"))
bmf = juntar(fonte); bmesh.ops.remove_doubles(bmf, verts=bmf.verts, dist=0.002)
arv = BVHTree.FromBMesh(bmf)
pts_fonte = [v.co.copy() for v in bmf.verts]
def centro(z, lado=0):
    sel = [p for p in pts_fonte if abs(p.z - z) < 0.01 and (lado == 0 or (p.x * lado > 0.0))]
    xs=[p.x for p in sel]; ys=[p.y for p in sel]
    return Vector(((min(xs)+max(xs))/2, (min(ys)+max(ys))/2, z))
N = 72
def anel(z, lado=0):
    c = centro(z, lado)
    rs = []
    for i in range(N):
        a = 2*math.pi*i/N
        d = Vector((math.sin(a), -math.cos(a), 0))   # i=0 aponta para a frente (-y)
        orig = c + d*0.6
        hit = arv.ray_cast(orig, -d, 0.6)
        rs.append((0.6 - hit[3]) if hit[0] is not None else None)
    return c, rs
def limpar(rs):
    val=[r for r in rs if r]; med=sorted(val)[len(val)//2]
    rs=[r if (r and r > 0.55*med) else None for r in rs]
    # preenche buracos interpolando em volta do círculo
    for i in range(N):
        if rs[i] is None:
            j=i
            while rs[j % N] is None: j-=1
            k=i
            while rs[k % N] is None: k+=1
            t=(i-j)/(k-j); rs[i]=rs[j%N]*(1-t)+rs[k%N]*t
    return rs
def suavizar_aneis(aneis, passes_t=4, passes_z=8):
    for _ in range(passes_t):
        for c, rs in aneis:
            rs[:] = [(rs[i-1]+2*rs[i]+rs[(i+1)%N])/4 for i in range(N)]
    for _ in range(passes_z):
        novos=[]
        for k,(c,rs) in enumerate(aneis):
            if 0<k<len(aneis)-1:
                novos.append([(aneis[k-1][1][i]+2*rs[i]+aneis[k+1][1][i])/4 for i in range(N)])
            else: novos.append(rs[:])
        for (c,rs),n in zip(aneis,novos): rs[:]=n
bm = bmesh.new()
def tubo(zs, lado=0, folga=0.008):
    aneis=[]
    for z in zs:
        c, rs = anel(z, lado); aneis.append((c, limpar(rs)))
    suavizar_aneis(aneis)
    cs=[c for c,_ in aneis]
    for _ in range(12):
        cs=[cs[0]]+[(cs[k-1]+2*cs[k]+cs[k+1])/4 for k in range(1,len(cs)-1)]+[cs[-1]]
    aneis=[(cs[k], aneis[k][1]) for k in range(len(aneis))]
    vs=[]
    for c, rs in aneis:
        linha=[]
        for i in range(N):
            a=2*math.pi*i/N; d=Vector((math.sin(a), -math.cos(a), 0))
            linha.append(bm.verts.new(c + d*(rs[i]+folga)))
        vs.append(linha)
    for k in range(len(vs)-1):
        for i in range(N):
            bm.faces.new((vs[k][i], vs[k][(i+1)%N], vs[k+1][(i+1)%N], vs[k+1][i]))
passo=0.007
tubo([0.995 - passo*k for k in range(int((0.995-0.80)/passo)+1)], 0, 0.009)
for lado in (1,-1):
    tubo([0.808 - passo*k for k in range(int((0.808-0.70)/passo)+1)], lado, 0.008)
bmf.free()
finalizar(bm, "Bermuda", dist=0.00001)

for o in bpy.context.view_layer.objects: o.select_set(False)
for o in col.objects: o.select_set(True); print(o.name, len(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons))
bpy.ops.export_scene.gltf(filepath="corpo_v2.glb", use_selection=True, export_materials='NONE', export_apply=True, export_yup=True, export_normals=True, export_texcoords=False)
