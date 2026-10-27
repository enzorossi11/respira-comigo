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
G["Cornea"] = [O["Cornea.l"], O["Cornea.r"]]
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
    dist = 0.002 if nome.startswith("Pele") else (0.00005 if nome in ("Iris","Esclera","Cornea") else 0.0015)
    ob = finalizar(juntar(objs), nome, dist=dist, decimar=DECIMAR.get(nome))
    if nome in SUBDIV:
        nivel = 2 if nome == "PeleCabeca" else 1   # mais detalhe só no rosto
        m = ob.modifiers.new("s","SUBSURF"); m.levels=nivel; m.render_levels=nivel

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

# --- Acabamento do rosto: sombra de oclusão (AO) e tons de pele gravados como cor de vértice
import random
random.seed(7)
def aplicar_mods(ob):
    dg2 = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg2))
    ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
    for p in me.polygons: p.use_smooth = True

for n in ["PeleCabeca","PeleTronco","PeleMembros","Cabelo","Esclera","Iris"]:
    aplicar_mods(col.objects[n])

# narinas: o modelo tem um buraco em cada uma; fecha com uma tampa funda (fica escura pela AO e pela cor)
NARINAS = [Vector((-0.0055, -0.1026, 1.5504)), Vector((0.0055, -0.1026, 1.5504))]
def fechar_narinas(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    borda = [e for e in bm.edges if e.is_boundary]
    rest=set(borda); lacos=[]
    while rest:
        e0=rest.pop(); l=[e0]; st=[e0]
        while st:
            e=st.pop()
            for v in e.verts:
                for e2 in v.link_edges:
                    if e2 in rest: rest.discard(e2); l.append(e2); st.append(e2)
        lacos.append(l)
    usar=[]
    for l in lacos:
        vs={v for e in l for v in e.verts}; c=sum((v.co for v in vs),Vector())/len(vs)
        if min((c-n).length for n in NARINAS) < 0.008: usar += l
    antes=set(bm.faces)
    bmesh.ops.holes_fill(bm, edges=usar, sides=0)
    novas=[f for f in bm.faces if f not in antes]
    r = bmesh.ops.poke(bm, faces=novas)
    for v in r["verts"]:
        v.co.z += 0.006   # empurra o fundo para dentro do nariz
        v.co.y += 0.003
    bm.to_mesh(ob.data); bm.free()
    print("narinas fechadas:", len(novas))
fechar_narinas(col.objects["PeleCabeca"])

# árvore com tudo que faz sombra no rosto e no corpo
bmo = bmesh.new()
for n in ["PeleCabeca","PeleTronco","PeleMembros","Cabelo","Esclera"]:
    bmo.from_mesh(col.objects[n].data)
arvo = BVHTree.FromBMesh(bmo)

def hemisferio(n, k):
    out=[]
    t = n.orthogonal().normalized(); b = n.cross(t)
    for i in range(k):
        u=random.random(); v=random.random()
        r=math.sqrt(u); th=2*math.pi*v
        out.append((t*(r*math.cos(th)) + b*(r*math.sin(th)) + n*math.sqrt(max(0,1-u))).normalized())
    return out
DIRS = [None]*0
def oclusao(p, n, raios=20, dist=0.035):
    def conta(nn, k):
        h=0
        for d in hemisferio(nn, k):
            if arvo.ray_cast(p + nn*0.0004, d, dist)[0] is not None: h+=1
        return h/k
    # a normal pode estar invertida em pedaços da pele: usa o lado mais "aberto"
    a = conta(n, 8); b = conta(-n, 8)
    nn = n if a <= b else -n
    return conta(nn, raios)

def suave(f, x0, x1):
    t = min(1, max(0, (f-x0)/(x1-x0))); return t*t*(3-2*t)

BASE = Vector((1,1,1))
LABIO = Vector((0.80, 0.50, 0.50))
CORADO = Vector((1.0, 0.84, 0.82))
OLHEIRA = Vector((0.86, 0.79, 0.80))
def tom(c):
    x, y, z = c.x, c.y, c.z; ax = abs(x)
    cor = BASE.copy()
    if y < -0.06 and z > 1.48:
        # lábios: faixa em volta da linha da boca (z ~ 1.530), mais alta no centro
        if y < -0.084:
            larg = 1 - suave(ax, 0.017, 0.026)
            cima = 1 - suave(z, 1.5305 + 0.0055*(1-ax/0.026), 1.5305 + 0.0075*(1-ax/0.026)+0.0012)
            baixo = suave(z, 1.5305 - 0.0095*(1-(ax/0.026)**2) - 0.0012, 1.5305 - 0.0085*(1-(ax/0.026)**2))
            w = larg * cima * baixo
            cor = cor.lerp(LABIO, w)
        # bochechas e ponta do nariz levemente coradas
        dbo = (Vector((ax, z)) - Vector((0.041, 1.548))).length
        cor = cor.lerp(Vector((cor.x*CORADO.x, cor.y*CORADO.y, cor.z*CORADO.z)), 0.75*(1-suave(dbo, 0.006, 0.02)))
        dna = (Vector((x, y, z)) - Vector((0, -0.114, 1.556))).length
        cor = cor.lerp(Vector((cor.x*CORADO.x, cor.y*CORADO.y, cor.z*CORADO.z)), 0.8*(1-suave(dna, 0.004, 0.014)))
        # pálpebras e olheira um pouco mais escuras
        dol = (Vector((ax, z)) - Vector((0.031, 1.591))).length
        anel = suave(dol, 0.006, 0.009) * (1 - suave(dol, 0.013, 0.019))
        cor = cor.lerp(Vector((cor.x*OLHEIRA.x, cor.y*OLHEIRA.y, cor.z*OLHEIRA.z)), 0.8*anel)
    for n in NARINAS:
        dn = (Vector((x, y, z)) - (n + Vector((0, 0.002, 0.004)))).length
        if dn < 0.007:
            k = 1 - suave(dn, 0.002, 0.007)
            cor = cor.lerp(Vector((0.22, 0.09, 0.08)), k)
    if ax > 0.068 and 1.55 < z < 1.615 and y > -0.02:
        cor = Vector((cor.x*1.0, cor.y*0.9, cor.z*0.88))   # orelhas
    return cor

def pintar(ob, tons=True, forca=0.85, raios=20):
    me = ob.data
    me.calc_loop_triangles() if hasattr(me,'calc_loop_triangles') else None
    attr = me.color_attributes.new("Col", 'FLOAT_COLOR', 'POINT')
    ao = []
    for v in me.vertices:
        p = v.co.copy(); n = v.normal.copy()
        ao.append(oclusao(p, n, raios))
    # suaviza a AO pelos vizinhos (tira o ruído dos raios)
    viz = [[] for _ in me.vertices]
    for e in me.edges:
        a,b = e.vertices; viz[a].append(b); viz[b].append(a)
    for _ in range(3):
        ao = [ (ao[i]*2 + sum(ao[j] for j in viz[i])) / (2+len(viz[i])) for i in range(len(ao)) ]
    for i, v in enumerate(me.vertices):
        luz = 1 - forca * (ao[i] ** 1.2)
        c = tom(v.co) if tons else BASE
        attr.data[i].color = (c.x*luz, c.y*luz, c.z*luz, 1.0)
    me.color_attributes.active_color = attr
    print(ob.name, "pintado", len(me.vertices))

import time
t0=time.time()
pintar(col.objects["PeleCabeca"], raios=24)
pintar(col.objects["PeleTronco"], tons=False, raios=12)
pintar(col.objects["PeleMembros"], tons=False, raios=12)
pintar(col.objects["Esclera"], tons=False, forca=0.6, raios=12)
print("AO em", round(time.time()-t0), "s")

# íris: pupila escura, raios claros/escuros, borda (limbo) escura e um anel claro perto da pupila
def lin(c):  # sRGB -> linear (o glTF guarda cor de vértice em linear)
    return Vector(tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c))
def pintar_iris(ob):
    me = ob.data
    attr = me.color_attributes.new("Col", 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(me.vertices):
        c = v.co
        cx = 0.0312 if c.x > 0 else -0.0312
        d = Vector((c.x - cx, c.z - 1.5912)); r = d.length / 0.0066
        ang = math.atan2(d.y, d.x)
        if r < 0.40:
            col_ = Vector((0.03, 0.02, 0.02))
        else:
            fibras = 0.5 + 0.5*math.sin(ang*38 + math.sin(ang*7)*2.0) * math.sin(ang*13 + 1.3)
            base = Vector((0.30, 0.17, 0.08)).lerp(Vector((0.48, 0.31, 0.14)), fibras*0.75)
            anel_interno = 1 - suave(r, 0.42, 0.58)
            base = base.lerp(Vector((0.56, 0.38, 0.16)), 0.55*anel_interno)
            borda_pupila = 1 - suave(r, 0.40, 0.45)
            base = base.lerp(Vector((0.05, 0.03, 0.02)), borda_pupila)
            limbo = suave(r, 0.78, 0.97)
            col_ = base.lerp(Vector((0.07, 0.045, 0.03)), limbo)
        col_ = lin(col_)
        attr.data[i].color = (col_.x, col_.y, col_.z, 1.0)
    me.color_attributes.active_color = attr
pintar_iris(col.objects["Iris"])

for o in bpy.context.view_layer.objects: o.select_set(False)
for o in col.objects: o.select_set(True); print(o.name, len(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons))
bpy.ops.export_scene.gltf(filepath="corpo_v2.glb", use_selection=True, export_materials='NONE', export_apply=True, export_yup=True, export_normals=True, export_texcoords=False, export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True)
