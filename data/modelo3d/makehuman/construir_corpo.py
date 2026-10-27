#!/usr/bin/env python3
"""
Constrói o corpo MakeHuman (CC0) para o app Respira Comigo e exporta um GLB com morph targets.

Fontes (ver LICENCAS.md):
  - malha base hm08 + targets:  makehumancommunity/mpfb2  (src/mpfb/data)
  - pele, olhos, cabelo, sobrancelha, cílios, roupa: makehuman_system_assets_cc0.zip
    (https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/)

Não precisa de Blender: a malha, os targets "macro" do MakeHuman e o ajuste das proxies (.mhclo)
são reimplementados aqui em numpy (mesmas fórmulas de makehuman/apps/human.py e shared/proxy.py).

Saída: build/corpo_mh_bruto.glb (sem compressão de malha; texturas já em WebP)
       -> depois: node comprimir.mjs  (meshopt)  => corpo_mh.glb

Convenções do GLB: metros, Y para cima, personagem olhando para +Z, pés em y=0.
Geometria base (todos os morphs = 0): masculino, 25 anos, peso/músculo médios, ~1,75 m.
Morph targets (mesma ordem em TODAS as malhas):
  0 Feminino        masculino -> feminino (aos 25 anos)
  1 Jovem           25 anos -> 12 anos (masculino)      idade = 25 - 13*Jovem
  2 FemininoJovem   corretivo: o app deve usar  Feminino*Jovem
  3 Magro           peso médio -> mais magro (moderado)
  4 Largo           peso médio -> mais largo (moderado)
"""
import gzip, json, math, os, struct, io, sys
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
MPFB = "/home/claude/makehumancommunity/mpfb2/src/mpfb/data"
SYS = os.path.join(AQUI, "assets_src/sys")
SAIDA = os.path.join(AQUI, "build")
os.makedirs(SAIDA, exist_ok=True)

# ---------------------------------------------------------------- parâmetros
RACAS = {"african": 0.35, "asian": 0.15, "caucasian": 0.50}   # mistura "brasileira" neutra
MUSC = 0.5
IDADE_BASE, IDADE_JOVEM = 25.0, 12.0
PESO_MAGRO, PESO_LARGO = 0.12, 0.88        # 0.5 = médio; moderado nas pontas
PESO_REF = (0.5, 18.5)                     # (gênero, idade) onde os deltas de peso são medidos
PESOS_PADRAO = [0.0, 0.0, 0.0, 0.0, 0.0]   # valor inicial dos morphs no GLB
MORPHS = ["Feminino", "Jovem", "FemininoJovem", "Magro", "Largo"]
BRACOS_GRAUS = 12.0   # ângulo final ombro->punho em relação à vertical (pose anatômica ~ Z-Anatomy)
INFLAR_ROUPA = 0.06
SUAVIZAR_REGIOES = 25
CORTE_CABECA = (1.5235 + 0.111 * 0.285, -0.285)   # y = a + b*z (m): plano do mento (frente) subindo até a nuca
CORTE_OMBRO = (0.012, 0.05, math.radians(19), 0.06)  # dx, dy a partir da articulação do ombro; inclinação; até quanto abaixo do ombro  # dm (4,5 mm) para a roupa não ser atravessada pela pele
TOM_PADRAO = "medio"

# ---------------------------------------------------------------- OBJ
def ler_obj(caminho):
    v, vt, faces, grupo = [], [], [], None
    for linha in open(caminho, encoding="utf-8", errors="ignore"):
        p = linha.split()
        if not p: continue
        if p[0] == "v": v.append([float(x) for x in p[1:4]])
        elif p[0] == "vt": vt.append([float(x) for x in p[1:3]])
        elif p[0] == "g": grupo = p[1] if len(p) > 1 else None
        elif p[0] == "f":
            fv, ft = [], []
            for c in p[1:]:
                s = c.split("/")
                fv.append(int(s[0]) - 1)
                ft.append(int(s[1]) - 1 if len(s) > 1 and s[1] else -1)
            faces.append((fv, ft, grupo))
    return np.array(v, float), np.array(vt, float) if vt else np.zeros((0, 2)), faces

BASE_V, BASE_VT, BASE_F = ler_obj(os.path.join(MPFB, "3dobjs/base.obj"))
NV = len(BASE_V)

# ---------------------------------------------------------------- targets
_cache = {}
def target(nome):
    if nome not in _cache:
        d = np.zeros((NV, 3))
        caminho = os.path.join(MPFB, "targets", nome + ".target.gz")
        if os.path.exists(caminho):
            for linha in gzip.open(caminho, "rt"):
                p = linha.split()
                if len(p) == 4 and not linha.startswith("#"):
                    d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
        else:
            print("  (target inexistente, ignorado)", nome)
        _cache[nome] = d
    return _cache[nome]

def idade_param(anos):          # human.py: setAgeYears (MIN 1, MID 25, MAX 90)
    return (anos - 1) / 48.0 if anos < 25 else 0.5 + (anos - 25) / 130.0

def vals_idade(a):              # human.py: _setAgeVals
    if a < 0.5:
        young = max(0.0, (a - 0.1875) * 3.2)
        return {"baby": max(0.0, 1 - a * 5.333), "child": max(0.0, min(1.0, 5.333 * a) - young),
                "young": young, "old": 0.0}
    old = max(0.0, a * 2 - 1)
    return {"baby": 0.0, "child": 0.0, "young": 1 - old, "old": old}

def vals_tres(x, pre):          # min/average/max (muscle, weight)
    mx = max(0.0, x * 2 - 1); mn = max(0.0, 1 - x * 2)
    return {"min" + pre: mn, "average" + pre: 1 - mx - mn, "max" + pre: mx}

def forma(genero, anos, peso=0.5, musc=MUSC):
    """coordenadas (unidades MH, decímetros, Y-up) de TODOS os vértices da malha base"""
    G = {"female": 1 - genero, "male": genero}
    A = vals_idade(idade_param(anos))
    M = vals_tres(musc, "muscle"); W = vals_tres(peso, "weight")
    co = BASE_V.copy()
    for g, wg in G.items():
        for a, wa in A.items():
            if wg * wa < 1e-6: continue
            for r, wr in RACAS.items():
                co += wr * wg * wa * target(f"macrodetails/{r}-{g}-{a}")
            for m, wm in M.items():
                for w, ww in W.items():
                    k = wg * wa * wm * ww
                    if k > 1e-6:
                        co += k * target(f"macrodetails/universal-{g}-{a}-{m}-{w}")
    return co

# ---------------------------------------------------------------- proxies (.mhclo)
class Proxy:
    def __init__(self, mhclo):
        self.dir = os.path.dirname(mhclo)
        refs, pesos, offs = [], [], []
        escala = [None] * 3
        obj = None; mat = None; em_verts = False
        for linha in open(mhclo, encoding="utf-8", errors="ignore"):
            p = linha.split()
            if not p or p[0].startswith("#"): continue
            if p[0] in ("x_scale", "y_scale", "z_scale"):
                escala["xyz".index(p[0][0])] = (int(p[1]), int(p[2]), float(p[3])); continue
            if p[0] == "obj_file": obj = p[1]; continue
            if p[0] == "material": mat = p[1]; continue
            if p[0] == "verts": em_verts = True; continue
            if p[0] in ("delete_verts", "weights"): em_verts = False; continue
            if not em_verts: continue
            if len(p) == 9:
                refs.append([int(x) for x in p[:3]]); pesos.append([float(x) for x in p[3:6]]); offs.append([float(x) for x in p[6:9]])
            elif len(p) == 1:
                refs.append([int(p[0])] * 3); pesos.append([1, 0, 0]); offs.append([0, 0, 0])
        self.refs = np.array(refs); self.pesos = np.array(pesos); self.offs = np.array(offs)
        self.escala = escala
        self.v, self.vt, self.f = ler_obj(os.path.join(self.dir, obj))
        assert len(self.v) == len(self.refs), (mhclo, len(self.v), len(self.refs))
        self.mat = mat

    def ajustar(self, hco):     # shared/proxy.py: getCoords
        m = np.ones(3)
        if all(self.escala):
            for n in range(3):
                a, b, den = self.escala[n]
                m[n] = abs(hco[a][n] - hco[b][n]) / den
        r, w = self.refs, self.pesos
        return (hco[r[:, 0]] * w[:, 0, None] + hco[r[:, 1]] * w[:, 1, None] + hco[r[:, 2]] * w[:, 2, None]
                + self.offs * m)

# ---------------------------------------------------------------- regiões do corpo (pelos ossos do rig padrão)
def regioes_corpo():
    W = json.load(open(os.path.join(MPFB, "rigs/standard/weights.default.json")))["weights"]
    def regiao(osso):
        o = osso.split(".")[0]
        if o.startswith(("neck", "spine", "breast", "clavicle", "pelvis", "root")): return 1
        if o.startswith(("shoulder", "upperarm", "lowerarm", "wrist", "metacarpal", "finger",
                         "upperleg", "lowerleg", "foot", "toe")): return 2
        return 0   # cabeça (head, jaw, eye, músculos faciais, língua...)
    acc = np.zeros((NV, 3))
    for osso, lst in W.items():
        r = regiao(osso)
        for i, w in lst: acc[i, r] += w
    return acc

# ---------------------------------------------------------------- utilidades de malha
def triangular(faces_idx):
    tris = []
    for f in faces_idx:
        for k in range(1, len(f) - 1): tris.append((f[0], f[k], f[k + 1]))
    return np.array(tris, np.int64)

def normais(co, tris):
    n = np.zeros_like(co)
    a, b, c = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3): np.add.at(n, tris[:, k], fn)
    l = np.linalg.norm(n, axis=1, keepdims=True); l[l == 0] = 1
    return n / l

class Peca:
    """uma malha de saída: faces (índices na lista de vértices 'origem') + uv"""
    def __init__(self, nome, faces, vt, material, normais_de=None):
        self.nome, self.material = nome, material
        # vértices de saída = pares únicos (v, vt)
        mapa = {}; vs = []; vts = []; tris = []
        for fv, ft, _ in faces:
            ids = []
            for v, t in zip(fv, ft):
                k = (v, t)
                if k not in mapa:
                    mapa[k] = len(vs); vs.append(v); vts.append(t)
                ids.append(mapa[k])
            for j in range(1, len(ids) - 1): tris.append((ids[0], ids[j], ids[j + 1]))
        self.src = np.array(vs); self.uv = vt[np.array(vts)].astype(np.float32)
        self.uv[:, 1] = 1.0 - self.uv[:, 1]
        self.tris = np.array(tris, np.uint32)
        # topologia em índices de origem (para normais sem costura de UV)
        self.tris_src = triangular([fv for fv, _, _ in faces])

# ---------------------------------------------------------------- texturas
def sangrar_alpha(img):
    """preenche o RGB dos pixels transparentes com a cor dos opacos vizinhos (push-pull),
    evitando a franja verde do fundo das texturas MakeHuman nas bordas com alpha"""
    img = img.convert("RGBA"); a = np.asarray(img, float)
    w = (a[..., 3] > 8).astype(float)[..., None]
    piram = [(a[..., :3] * w, w)]
    while piram[-1][0].shape[0] > 1:
        c, ww = piram[-1]; h2 = c.shape[0] // 2
        piram.append((c.reshape(h2, 2, h2, 2, 3).sum((1, 3)), ww.reshape(h2, 2, h2, 2, 1).sum((1, 3))))
    cor = piram[-1][0] / np.maximum(piram[-1][1], 1e-6)
    for c, ww in reversed(piram[:-1]):
        cor = np.repeat(np.repeat(cor, 2, 0), 2, 1)
        cor = np.where(ww > 0, c / np.maximum(ww, 1e-6), cor)
    out = np.concatenate([np.clip(cor, 0, 255), a[..., 3:]], -1).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def tex_webp(img, lado, q=82, alpha=False):
    if alpha: img = sangrar_alpha(img)
    img = img.convert("RGBA" if alpha else "RGB")
    if img.size[0] != lado: img = img.resize((lado, lado), Image.LANCZOS)
    b = io.BytesIO(); img.save(b, "WEBP", quality=q, method=6); return b.getvalue()

def srgb2lin(x): return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
def lin2srgb(x): return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.clip(x, 0, None) ** (1 / 2.4) - 0.055)

def tons_de_pele():
    clara = Image.open(f"{SYS}/skins/young_caucasian_male/young_lightskinned_male_diffuse.png").convert("RGB")
    escura = Image.open(f"{SYS}/skins/young_african_male/young_darkskinned_male_diffuse.png").convert("RGB")
    a = srgb2lin(np.asarray(clara, float) / 255); b = srgb2lin(np.asarray(escura, float) / 255)
    # média só na área do tronco (região sem cabelo pintado)
    ma = a[300:900, 300:900].reshape(-1, 3).mean(0); mb = b[300:900, 300:900].reshape(-1, 3).mean(0)
    alvo = np.sqrt(ma * mb) ** 0.55 * ma ** 0.45          # "moreno": entre as duas, puxado p/ a clara
    media = np.clip(lin2srgb(a * (alvo / ma)), 0, 1)
    return {"clara": clara, "medio": Image.fromarray((media * 255 + 0.5).astype(np.uint8)), "escura": escura}

# ---------------------------------------------------------------- GLB
class GLB:
    def __init__(self):
        self.bin = bytearray(); self.j = {"asset": {"version": "2.0", "generator": "construir_corpo.py (MakeHuman CC0)"},
            "scene": 0, "scenes": [{"name": "CorpoMH", "nodes": []}], "nodes": [], "meshes": [], "accessors": [],
            "bufferViews": [], "materials": [], "textures": [], "images": [], "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
            "extensionsUsed": ["EXT_texture_webp"], "extensionsRequired": ["EXT_texture_webp"]}
        self.texs = {}
    def _view(self, dados, alvo=None):
        while len(self.bin) % 4: self.bin.append(0)
        bv = {"buffer": 0, "byteOffset": len(self.bin), "byteLength": len(dados)}
        if alvo: bv["target"] = alvo
        self.bin += dados; self.j["bufferViews"].append(bv); return len(self.j["bufferViews"]) - 1
    def acessor(self, arr, tipo, alvo=34962, minmax=False):
        arr = np.ascontiguousarray(arr)
        comp = {np.dtype(np.float32): 5126, np.dtype(np.uint32): 5125, np.dtype(np.uint16): 5123}[arr.dtype]
        a = {"bufferView": self._view(arr.tobytes(), alvo), "componentType": comp, "count": int(arr.shape[0]), "type": tipo}
        if minmax:
            a["min"] = [float(x) for x in arr.min(0)]; a["max"] = [float(x) for x in arr.max(0)]
        self.j["accessors"].append(a); return len(self.j["accessors"]) - 1
    def textura(self, chave, dados):
        if chave in self.texs: return self.texs[chave]
        iv = self._view(dados)
        self.j["images"].append({"name": chave, "bufferView": iv, "mimeType": "image/webp"})
        self.j["textures"].append({"sampler": 0, "name": chave, "extensions": {"EXT_texture_webp": {"source": len(self.j["images"]) - 1}}})
        self.texs[chave] = len(self.j["textures"]) - 1; return self.texs[chave]
    def material(self, nome, tex=None, cor=(1, 1, 1, 1), rough=0.6, alpha="OPAQUE", cutoff=None, duplo=False, normal=None):
        m = {"name": nome, "pbrMetallicRoughness": {"baseColorFactor": list(cor), "metallicFactor": 0.0, "roughnessFactor": rough}}
        if tex is not None: m["pbrMetallicRoughness"]["baseColorTexture"] = {"index": tex}
        if normal is not None: m["normalTexture"] = {"index": normal}
        if alpha != "OPAQUE": m["alphaMode"] = alpha
        if cutoff is not None: m["alphaCutoff"] = cutoff
        if duplo: m["doubleSided"] = True
        self.j["materials"].append(m); return len(self.j["materials"]) - 1
    def malha(self, nome, pos, nor, uv, tris, mat, dpos, dnor, pesos):
        prim = {"attributes": {"POSITION": self.acessor(pos.astype(np.float32), "VEC3", minmax=True),
                               "NORMAL": self.acessor(nor.astype(np.float32), "VEC3"),
                               "TEXCOORD_0": self.acessor(uv.astype(np.float32), "VEC2")},
                "indices": self.acessor((tris.astype(np.uint16) if pos.shape[0] < 65536 else tris.astype(np.uint32)).reshape(-1), "SCALAR", 34963),
                "material": mat, "targets": []}
        for dp, dn in zip(dpos, dnor):
            prim["targets"].append({"POSITION": self.acessor(dp.astype(np.float32), "VEC3", minmax=True),
                                    "NORMAL": self.acessor(dn.astype(np.float32), "VEC3")})
        self.j["meshes"].append({"name": nome, "primitives": [prim], "weights": list(pesos), "extras": {"targetNames": MORPHS}})
        self.j["nodes"].append({"name": nome, "mesh": len(self.j["meshes"]) - 1})
        self.j["scenes"][0]["nodes"].append(len(self.j["nodes"]) - 1)
    def salvar(self, caminho):
        for k in ("textures", "images"):
            if not self.j[k]: del self.j[k]
        while len(self.bin) % 4: self.bin.append(0)
        self.j["buffers"] = [{"byteLength": len(self.bin)}]
        js = json.dumps(self.j, separators=(",", ":")).encode()
        js += b" " * ((4 - len(js) % 4) % 4)
        with open(caminho, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(self.bin)))
            f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack("<II", len(self.bin), 0x004E4942)); f.write(self.bin)

# ================================================================= montagem
def main():
    print("carregando proxies...")
    P = {
        "Olhos": Proxy(f"{SYS}/eyes/high-poly/high-poly.mhclo"),
        "Sobrancelhas": Proxy(f"{SYS}/eyebrows/eyebrow001/eyebrow001.mhclo"),
        "Cilios": Proxy(f"{SYS}/eyelashes/eyelashes01/eyelashes01.mhclo"),
        "Cabelo": Proxy(f"{SYS}/hair/short02/short02.mhclo"),
        "CabeloLongo": Proxy(f"{SYS}/hair/ponytail01/ponytail01.mhclo"),
        "Roupa": Proxy(f"{SYS}/clothes/female_sportsuit01/female_sportsuit01.mhclo"),
    }

    # estados (combinações de macros) -> coordenadas de tudo
    ESTADOS = {
        "B": (1.0, IDADE_BASE, 0.5), "F": (0.0, IDADE_BASE, 0.5),
        "A": (1.0, IDADE_JOVEM, 0.5), "FA": (0.0, IDADE_JOVEM, 0.5),
        "Wm": (PESO_REF[0], PESO_REF[1], 0.5), "Wmin": (PESO_REF[0], PESO_REF[1], PESO_MAGRO),
        "Wmax": (PESO_REF[0], PESO_REF[1], PESO_LARGO),
    }
    corpo_faces = [f for f in BASE_F if f[2] == "body"]
    corpo_ids = np.unique(np.concatenate([np.array(f[0]) for f in corpo_faces]))
    co = {}
    for k, (g, a, w) in ESTADOS.items():
        print("forma", k, g, a, w)
        h = posar(forma(g, a, w))
        d = {"corpo": h}
        for n, p in P.items():
            d[n] = p.ajustar(h)
            if n == "Roupa":
                d[n] = d[n] + INFLAR_ROUPA * normais(d[n], triangular([f[0] for f in p.f]))
        # pés no chão em cada estado (o chão = menor y do corpo)
        chao = h[corpo_ids, 1].min()
        for n in d: d[n] = (d[n] - np.array([0, chao, 0])) * 0.1      # dm -> m
        co[k] = d

    def delta(n, combo):
        return sum(s * co[k][n] for k, s in combo)
    COMBOS = [
        [("F", 1), ("B", -1)],
        [("A", 1), ("B", -1)],
        [("FA", 1), ("F", -1), ("A", -1), ("B", 1)],
        [("Wmin", 1), ("Wm", -1)],
        [("Wmax", 1), ("Wm", -1)],
    ]

    # -------- peças
    print("separando a pele em regiões...")
    acc = regioes_corpo()
    # suaviza os pesos pela malha para a fronteira entre regiões não ficar serrilhada
    ar = np.array([(f[0][k], f[0][(k + 1) % len(f[0])]) for f in corpo_faces for k in range(len(f[0]))])
    grau = np.bincount(ar[:, 0], minlength=NV)[:, None] + 1e-9
    for _ in range(SUAVIZAR_REGIOES):
        viz = np.zeros_like(acc); np.add.at(viz, ar[:, 0], acc[ar[:, 1]])
        acc = 0.5 * acc + 0.5 * viz / grau
    reg_v = acc.argmax(1)
    reg_v[acc.sum(1) == 0] = 0
    # -------- corte exato das fronteiras: triângulos que cruzam o plano de corte são divididos
    hb = co["B"]["corpo"]
    J = {s_: hb[grupo_vg(f"joint-{l}-shoulder")].mean(0) for s_, l in ((1, "l"), (-1, "r"))}
    def campo_cabeca(p): return p[..., 1] - (CORTE_CABECA[0] + CORTE_CABECA[1] * p[..., 2])
    def campo_ombro(p, s_):
        p0 = J[s_] + np.array([s_ * CORTE_OMBRO[0], CORTE_OMBRO[1], 0])
        n = np.array([s_ * math.cos(CORTE_OMBRO[2]), -math.sin(CORTE_OMBRO[2]), 0])
        return (p - p0) @ n
    tris = []   # (v0,v1,v2), (t0,t1,t2)
    for fv, ft, _ in corpo_faces:
        for k in range(1, len(fv) - 1):
            tris.append(([fv[0], fv[k], fv[k + 1]], [ft[0], ft[k], ft[k + 1]]))
    vt_all = [tuple(x) for x in BASE_VT]
    novos_v = {}; novos_vt = {}; lerp_v = []   # lerp_v: (a, b, t)
    def vert_corte(a, b, t):
        k = (a, b, round(t, 6)) if a < b else (b, a, round(1 - t, 6))
        if k not in novos_v:
            novos_v[k] = NV + len(lerp_v) + 0 * 0; lerp_v.append(k)
        return novos_v[k]
    def vt_corte(a, b, t):
        k = (a, b, round(t, 6)) if a < b else (b, a, round(1 - t, 6))
        if k not in novos_vt:
            pa, pb = np.array(vt_all[k[0]]), np.array(vt_all[k[1]])
            novos_vt[k] = len(vt_all); vt_all.append(tuple(pa * (1 - k[2]) + pb * k[2]))
        return novos_vt[k]
    def pos(v):
        if v < NV: return hb[v]
        a, b, t = lerp_v[v - NV]; return pos(a) * (1 - t) + pos(b) * t
    def cortar(tri, campo):
        """divide um triângulo pelo zero do campo; devolve [(tri, lado)] com lado True se campo>0"""
        (vs, ts) = tri
        f = [float(campo(pos(v))) for v in vs]
        pos_ = [x > 0 for x in f]
        if all(pos_) or not any(pos_): return [(tri, pos_[0])]
        # vértice isolado: o que está sozinho do seu lado
        i = [k for k in range(3) if pos_.count(pos_[k]) == 1][0]
        a, b, c = i, (i + 1) % 3, (i + 2) % 3
        tab = f[a] / (f[a] - f[b]); tac = f[a] / (f[a] - f[c])
        vab = vert_corte(vs[a], vs[b], tab); vac = vert_corte(vs[a], vs[c], tac)
        tvab = vt_corte(ts[a], ts[b], tab); tvac = vt_corte(ts[a], ts[c], tac)
        so = ([vs[a], vab, vac], [ts[a], tvab, tvac])
        q1 = ([vab, vs[b], vs[c]], [tvab, ts[b], ts[c]]); q2 = ([vab, vs[c], vac], [tvab, ts[c], tvac])
        return [(so, pos_[a]), (q1, pos_[b]), (q2, pos_[b])]
    faces_reg = {0: [], 1: [], 2: []}
    for tri in tris:
        vs = tri[0]
        r = int(np.bincount(reg_v[vs], minlength=3).argmax())
        c = hb[vs].mean(0)
        partes = [(tri, r)]
        if r in (0, 1) and abs(c[0]) < 0.12 and c[1] > 1.42:
            partes = [(t, 0 if lado else 1) for t, lado in cortar(tri, campo_cabeca)]
        elif r in (1, 2) and abs(c[0]) > 0.08 and c[1] > J[1][1] - CORTE_OMBRO[3]:
            s_ = 1 if c[0] > 0 else -1
            partes = [(t, 2 if lado else 1) for t, lado in cortar(tri, lambda p: campo_ombro(p, s_))]
        for t, rr in partes: faces_reg[rr].append((t[0], t[1], "body"))
    # posições dos vértices novos em TODOS os estados (mesmo t => morphs consistentes)
    if lerp_v:
        for k in co:
            h = co[k]["corpo"]; extra = []
            for a, b, t in lerp_v:
                pa = h[a] if a < NV else extra[a - NV]; pb = h[b] if b < NV else extra[b - NV]
                extra.append(pa * (1 - t) + pb * t)
            co[k]["corpo"] = np.vstack([h, np.array(extra)])
    VT_CORPO = np.array(vt_all)
    print(f"  corte: {len(lerp_v)} vértices novos")
    todas = [f for r in faces_reg for f in faces_reg[r]]
    tris_corpo = np.array([f[0] for f in todas], np.int64)
    def nrm(n, k):
        if n == "corpo": return normais(co[k]["corpo"], tris_corpo)
        return normais(co[k][n], pecas_tris_src[n])

    pecas = []
    nomes_pele = {0: "PeleCabeca", 1: "PeleTronco", 2: "PeleMembros"}
    for r, nome in nomes_pele.items():
        pecas.append(("corpo", Peca(nome, faces_reg[r], VT_CORPO, "Pele")))
    pecas_tris_src = {}
    for n, p in P.items():
        if n == "Roupa":
            # top (parte de cima) e bermuda (legging cortada no joelho)
            # ilhas de UV (faces ligadas por vt); ilha com centro abaixo da cintura = legging
            yb = co["B"][n][:, 1]
            pai = list(range(len(p.vt)))
            def raiz(x):
                while pai[x] != x: pai[x] = pai[pai[x]]; x = pai[x]
                return x
            for f in p.f:
                for t in f[1][1:]: pai[raiz(t)] = raiz(f[1][0])
            ilhas = {}
            for f in p.f: ilhas.setdefault(raiz(f[1][0]), []).append(f)
            cintura = co["B"]["corpo"][grupo_vg("joint-pelvis"), 1].mean() + 0.06
            cima, baixo = [], []
            for fs in ilhas.values():
                ym = np.mean([yb[f[0]].mean() for f in fs])
                (cima if ym > cintura else baixo).extend(fs)
            pecas_tris_src[n] = triangular([f[0] for f in p.f])
            pecas.append((n, Peca("Top", cima, p.vt, "Roupa")))
            pecas.append((n, ("bermuda", baixo, p)))
            continue
        pecas_tris_src[n] = triangular([f[0] for f in p.f])
        pecas.append((n, Peca(n, p.f, p.vt, n)))

    # bermuda: corta a legging um pouco acima do joelho (mesmo nível nas pernas)
    final = []
    for n, pc in pecas:
        if isinstance(pc, tuple):
            _, faces, p = pc
            joelho = altura_joelho(co["B"]["corpo"])
            y = co["B"][n][:, 1]
            manter = [f for f in faces if y[f[0]].min() > joelho + 0.035]
            pc = Peca("Bermuda", manter, p.vt, "Roupa")
        final.append((n, pc))
    pecas = final

    # -------- texturas e materiais
    g = GLB()
    tons = tons_de_pele()
    for nome, img in tons.items():
        tex_bytes = tex_webp(img, 2048, q=88)
        if nome == TOM_PADRAO: t_pele = g.textura("pele_" + nome, tex_bytes)
        open(os.path.join(SAIDA, f"pele_{nome}.webp"), "wb").write(tex_bytes)
    open(os.path.join(SAIDA, f"pele_{TOM_PADRAO}_2048.webp"), "wb").write(tex_webp(tons[TOM_PADRAO], 2048, q=88))
    # versão neutra (cinza-claro) para tingir no app: luminância / média
    arr = np.asarray(tons["clara"], float) / 255.0
    lin = srgb2lin(arr); lum = lin @ np.array([0.2126, 0.7152, 0.0722])
    ref = lum[300:900, 300:900].mean()
    neutro = np.clip(lin2srgb(np.clip(lum / ref * 0.8, 0, 1)), 0, 1)
    Image.fromarray((neutro * 255).astype(np.uint8)).convert("RGB").save(
        os.path.join(SAIDA, "pele_neutra_tingir.webp"), "WEBP", quality=88)

    mats = {}
    mats["Pele"] = g.material("Pele", t_pele, rough=0.55)
    mats["Olhos"] = g.material("Olhos", g.textura("olhos", tex_webp(Image.blend(Image.open(f"{SYS}/eyes/materials/brown_eye.png").convert("RGBA"), Image.open(f"{SYS}/eyes/materials/brownlight_eye.png").convert("RGBA"), 0.55), 512, 85, alpha=True)), rough=0.55, cor=(0.92, 0.9, 0.9, 1), alpha="MASK", cutoff=0.5)
    mats["Sobrancelhas"] = g.material("Sobrancelhas", g.textura("sobrancelhas", tex_webp(Image.open(f"{SYS}/eyebrows/eyebrow001/eyebrow001.png"), 256, 85, alpha=True)), rough=0.8, alpha="BLEND", duplo=True)
    mats["Cilios"] = g.material("Cilios", g.textura("cilios", tex_webp(Image.open(f"{SYS}/eyelashes/eyelashes01/eyelashes01.png"), 256, 85, alpha=True)), rough=0.8, alpha="BLEND", duplo=True)
    mats["Cabelo"] = g.material("Cabelo", g.textura("cabelo_curto", tex_webp(Image.open(f"{SYS}/hair/short02/short02_diffuse.png"), 1024, 82, alpha=True)), cor=(0.42, 0.33, 0.27, 1), rough=0.7, alpha="MASK", cutoff=0.35, duplo=True)
    mats["CabeloLongo"] = g.material("CabeloLongo", g.textura("cabelo_longo", tex_webp(Image.open(f"{SYS}/hair/ponytail01/ponytail01_diffuse.png"), 1024, 82, alpha=True)), cor=(0.55, 0.45, 0.4, 1), rough=0.7, alpha="MASK", cutoff=0.35, duplo=True)
    mats["Roupa"] = g.material("Roupa", g.textura("roupa", tex_webp(Image.open(f"{SYS}/clothes/female_sportsuit01/female_sportsuit01_diffuse.png"), 1024, 80)), rough=0.8,
                               normal=g.textura("roupa_normal", tex_webp(Image.open(f"{SYS}/clothes/female_sportsuit01/female_sportsuit01_normal.png"), 512, 85)))

    # -------- malhas
    marcos = {}
    for n, pc in pecas:
        pos = co["B"][n][pc.src]
        nb = nrm(n, "B")
        nor = nb[pc.src]
        dpos, dnor = [], []
        cache_n = {k: nrm(n, k) for k in ESTADOS}
        for combo in COMBOS:
            dpos.append(delta(n, combo)[pc.src])
            dnor.append(sum(s * cache_n[k] for k, s in combo)[pc.src])
        g.malha(pc.nome, pos, nor, pc.uv, pc.tris, mats[pc.material], dpos, dnor, PESOS_PADRAO)
        print(f"  {pc.nome:14s} vért={len(pos):6d} tri={len(pc.tris):6d}")
    caminho = os.path.join(SAIDA, "corpo_mh_bruto.glb")
    g.salvar(caminho)
    print("salvo", caminho, os.path.getsize(caminho) // 1024, "KB")

    # -------- marcos anatômicos (estado base = todos os morphs em 0)
    m = marcos_anatomicos(co["B"]["corpo"][:NV], co["B"]["Olhos"], corpo_faces, tons[TOM_PADRAO], reg_v)
    m["morphs"] = MORPHS
    m["alturas_m"] = {k: round(float(co[k]["corpo"][corpo_ids, 1].max()), 3) for k in ESTADOS}
    json.dump(m, open(os.path.join(SAIDA, "marcos.json"), "w"), indent=1, ensure_ascii=False)
    print(json.dumps(m, ensure_ascii=False))

# ---------------------------------------------------------------- pose: braços para baixo (skinning linear com os pesos do rig padrão)
_VG = None
def grupo_vg(nm):
    global _VG
    if _VG is None: _VG = json.load(open(os.path.join(MPFB, "mesh_metadata/basemesh_vertex_groups.json")))
    ids = []
    for a, b in _VG[nm]: ids += list(range(a, b + 1))
    return np.array(ids)

_PESO_BRACO = None
def peso_braco():
    global _PESO_BRACO
    if _PESO_BRACO is None:
        W = json.load(open(os.path.join(MPFB, "rigs/standard/weights.default.json")))["weights"]
        out = {}
        for lado in ("L", "R"):
            p = np.zeros(NV)
            for osso, lst in W.items():
                o, _, l = osso.partition(".")
                if l != lado: continue
                f = 1.0 if o.startswith(("upperarm", "lowerarm", "wrist", "metacarpal", "finger")) else (0.5 if o.startswith("shoulder") else 0.0)
                if f:
                    for i, w in lst: p[i] += f * w
            out[lado] = np.clip(p, 0, 1)
            q = np.zeros(NV)
            for osso, lst in W.items():
                o, _, l = osso.partition(".")
                if l == lado and o.startswith(("lowerarm", "wrist", "metacarpal", "finger")):
                    for i, w in lst: q[i] += w
            out[lado + "_ante"] = np.clip(q, 0, 1)
        _PESO_BRACO = out
    return _PESO_BRACO

def _rot_entre(a, b):
    """matriz que gira a direção a até a direção b (Rodrigues)"""
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = float(a @ b); s = np.linalg.norm(v)
    if s < 1e-9: return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K * ((1 - c) / s ** 2)

_ROT = {}
def posar(h):
    """Pose A do MakeHuman (braços abertos ~43°, cotovelos dobrados p/ frente) -> pose anatômica:
    braço e antebraço estendidos, ~12° da vertical. Skinning linear com os pesos do rig padrão.
    As rotações são medidas uma vez (na 1a forma, a base) e reaplicadas em todas as formas."""
    h = h.copy()
    W = peso_braco()
    for lado, sinal in (("L", 1), ("R", -1)):
        lj = "l" if lado == "L" else "r"
        J = h[grupo_vg(f"joint-{lj}-shoulder")].mean(0)
        E = h[grupo_vg(f"joint-{lj}-elbow")].mean(0)
        P = h[grupo_vg(f"joint-{lj}-hand")].mean(0)
        if lado not in _ROT:
            a = math.radians(BRACOS_GRAUS)
            alvo_braco = np.array([sinal * math.sin(a), -math.cos(a), -0.06])
            R1 = _rot_entre(E - J, alvo_braco)
            E1 = (E - J) @ R1.T + J; P1 = (P - J) @ R1.T + J
            alvo_ante = np.array([sinal * math.sin(a * 1.1), -math.cos(a * 1.1), 0.10])
            R2 = _rot_entre(P1 - E1, alvo_ante)
            _ROT[lado] = (R1, R2)
            print(f"  braço {lado}: ombro->cotovelo {np.round((E-J)/np.linalg.norm(E-J),2)}  cotovelo->mão {np.round((P-E)/np.linalg.norm(P-E),2)}")
        R1, R2 = _ROT[lado]
        w1 = W[lado][:, None]; w2 = W[lado + "_ante"][:, None]
        h = h * (1 - w1) + ((h - J) @ R1.T + J) * w1
        E1 = (E - J) @ R1.T + J
        h = h * (1 - w2) + ((h - E1) @ R2.T + E1) * w2
    return h

def altura_joelho(h):
    # vértices dos joelhos: grupos joint-l-knee/joint-r-knee da malha base
    VG = json.load(open(os.path.join(MPFB, "mesh_metadata/basemesh_vertex_groups.json")))
    ids = []
    for gname in ("joint-l-knee", "joint-r-knee"):
        for a, b in VG[gname]: ids += list(range(a, b + 1))
    return h[ids, 1].mean()

def marcos_anatomicos(h, olhos, corpo_faces, tex_img, reg_v):
    r4 = lambda v: [round(float(x), 4) for x in v]
    ids = np.unique(np.concatenate([np.array(f[0]) for f in corpo_faces]))
    na = np.zeros(len(h), bool); na[ids] = True
    out = {"_nota": "coordenadas glTF (metros, Y para cima, +Z = frente), geometria base (morphs = 0)"}
    out["altura_m"] = round(float(h[ids, 1].max()), 4)
    out["topo_cabeca"] = r4(h[ids][h[ids, 1].argmax()])
    L = olhos[olhos[:, 0] > 0]; R = olhos[olhos[:, 0] < 0]
    out["olho_esq_centro"] = r4((L.min(0) + L.max(0)) / 2)     # +x = lado esquerdo do personagem
    out["olho_dir_centro"] = r4((R.min(0) + R.max(0)) / 2)
    eye = (L.min(0) + L.max(0)) / 2
    # ponta do nariz
    m = na & (np.abs(h[:, 0]) < 0.01) & (h[:, 1] > eye[1] - 0.08) & (h[:, 1] < eye[1] - 0.01)
    tip = h[m][h[m][:, 2].argmax()]; out["ponta_nariz"] = r4(tip)
    # narinas: pixels mais escuros da textura de pele em volta da base do nariz (simetrizado)
    tex = np.asarray(tex_img.convert("L"), float); S = tex.shape[0] - 1
    uvof = {}
    for fv, ft, _ in corpo_faces:
        for v, t in zip(fv, ft): uvof[v] = BASE_VT[t]
    cs = []
    for s_ in (1, -1):
        rr = np.where(na & (h[:, 0] * s_ > 0.002) & (h[:, 0] * s_ < 0.022) & (h[:, 1] > tip[1] - 0.03)
                      & (h[:, 1] < tip[1] + 0.015) & (h[:, 2] > tip[2] - 0.04))[0]
        lum = np.array([tex[int((1 - uvof[v][1]) * S), int(uvof[v][0] * S)] for v in rr])
        cs.append(h[rr[np.argsort(lum)[:8]]].mean(0))
    c = (np.abs(cs[0]) + np.abs(cs[1])) / 2
    out["narina_esq"] = r4([c[0], c[1], c[2]]); out["narina_dir"] = r4([-c[0], c[1], c[2]])
    # queixo (mento): ponto mais baixo da linha média do rosto, na frente
    m = na & (reg_v == 0) & (np.abs(h[:, 0]) < 0.004) & (h[:, 2] > eye[2] - 0.03) & (h[:, 1] < tip[1])
    out["queixo"] = r4(h[m][h[m][:, 1].argmin()])
    # ombros
    sl, sr = h[grupo_vg("joint-l-shoulder")].mean(0), h[grupo_vg("joint-r-shoulder")].mean(0)
    out["articulacao_ombro_esq"] = r4(sl); out["articulacao_ombro_dir"] = r4(sr)
    out["largura_entre_articulacoes_ombro_m"] = round(float(sl[0] - sr[0]), 4)
    faixa = h[ids][np.abs(h[ids, 1] - (sl[1] + sr[1]) / 2) < 0.015]
    out["largura_ombros_pele_m"] = round(float(faixa[:, 0].max() - faixa[:, 0].min()), 4)
    return out

if __name__ == "__main__":
    main()
