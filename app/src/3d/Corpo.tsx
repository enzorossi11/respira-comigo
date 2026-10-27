import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Matrix3,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three'
import { useApp } from '../store'
import { criarMapa, medirAncoras, type Ancoras, type Mapa, type V3 } from './ajuste'
import { PERFIL_PADRAO, pesosDoPerfil, TONS, type Perfil } from './perfil'

/**
 * O personagem tem duas origens:
 *  - corpo.glb — corpo, pele, olhos, cabelo e roupa do MakeHuman (CC0), com
 *    "morph targets" para a personalização (sexo e idade; os de biotipo ficam em zero);
 *  - orgaos.glb — órgãos do sistema respiratório do Z-Anatomy (CC BY-SA 4.0),
 *    encaixados dentro do corpo atual por src/3d/ajuste.ts.
 */
const BASE = import.meta.env.BASE_URL
export const URL_CORPO = `${BASE}modelos/corpo.glb`
export const URL_ORGAOS = `${BASE}modelos/orgaos.glb`

export type ParteCorpo =
  | 'PeleCabeca'
  | 'PeleTronco'
  | 'PeleMembros'
  | 'Olhos'
  | 'Sobrancelhas'
  | 'Cilios'
  | 'Cabelo'
  | 'CabeloLongo'
  | 'Top'
  | 'Bermuda'

export type Orgao = 'PulmaoDireito' | 'PulmaoEsquerdo' | 'Traqueia' | 'Bronquios' | 'Laringe' | 'Faringe' | 'CavidadeNasal' | 'Diafragma'

/** Altura do corpo base (morphs em zero), em metros */
export const ALTURA_BASE = 1.7534

/** Âncoras do Z-Anatomy, medidas com a mesma regra (ver ajuste.ts) */
export const ANCORAS_ZA: Ancoras = {
  furcula: { y: 1.4454, z: 0.04126 },
  cintura: 1.0804,
  peito: { y: 1.2994, largura: 0.34969, profundidade: 0.25822, centroZ: -0.00537 },
  narina: { x: 0, y: 1.5504, z: 0.1026 },
}

/** Narinas do corpo base do MakeHuman (direita do personagem = -x) */
const NARINA_DIR_BASE = new Vector3(-0.0096, 1.6001, 0.1587)
const NARINA_ESQ_BASE = new Vector3(0.0096, 1.6001, 0.1587)

/* ------------------------------------------------------------------ corpo */

interface PecaComMorph {
  /** vértices já na posição do modelo (metros) */
  base: Float32Array
  /** deslocamento de cada morph, também em metros */
  morphs: Float32Array[]
}

function lerPeca(m: Mesh): PecaComMorph {
  m.updateMatrixWorld(true)
  const geo = m.geometry
  const p = geo.getAttribute('position')
  const M = m.matrixWorld
  const L = new Matrix3().setFromMatrix4(M)
  const v = new Vector3()
  const base = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(M)
    base.set([v.x, v.y, v.z], i * 3)
  }
  const morphs = (geo.morphAttributes.position ?? []).map((a) => {
    const d = new Float32Array(a.count * 3)
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix3(L)
      d.set([v.x, v.y, v.z], i * 3)
    }
    return d
  })
  return { base, morphs }
}

function aplicarPesos(p: PecaComMorph, pesos: number[]): Float32Array {
  const out = p.base.slice()
  p.morphs.forEach((d, k) => {
    const w = pesos[k]
    if (!w) return
    for (let i = 0; i < out.length; i++) out[i] += d[i] * w
  })
  return out
}

function maisProximo(pos: Float32Array, alvo: Vector3): number {
  let melhor = 0
  let dMin = Infinity
  for (let i = 0; i < pos.length / 3; i++) {
    const d = (pos[i * 3] - alvo.x) ** 2 + (pos[i * 3 + 1] - alvo.y) ** 2 + (pos[i * 3 + 2] - alvo.z) ** 2
    if (d < dMin) {
      dMin = d
      melhor = i
    }
  }
  return melhor
}

export interface CorpoAtual {
  /** as malhas originais do glTF (cada uma com o seu nó de quantização) */
  malhas: Record<ParteCorpo, Mesh>
  pesos: number[]
  ancoras: Ancoras
  /** leva pontos do Z-Anatomy para dentro deste corpo */
  mapa: Mapa
  /** altura do corpo atual (m) */
  altura: number
  /** narina direita do corpo atual (m), usada pelo jogo */
  narinaDir: Vector3
}

/** Carrega o corpo e calcula as âncoras para o perfil escolhido. */
export function useCorpo(perfil: Perfil = PERFIL_PADRAO): CorpoAtual {
  const { scene } = useGLTF(URL_CORPO, false, true)

  const fixo = useMemo(() => {
    scene.updateMatrixWorld(true)
    const malhas = {} as Record<ParteCorpo, Mesh>
    scene.traverse((o: Object3D) => {
      if ((o as Mesh).isMesh) malhas[o.name as ParteCorpo] = o as Mesh
    })
    const tronco = lerPeca(malhas.PeleTronco)
    const cabeca = lerPeca(malhas.PeleCabeca)
    const iDir = maisProximo(cabeca.base, NARINA_DIR_BASE)
    const iEsq = maisProximo(cabeca.base, NARINA_ESQ_BASE)
    return { malhas, tronco, cabeca, iDir, iEsq }
  }, [scene])

  const pesos = useMemo(() => pesosDoPerfil(perfil), [perfil])

  return useMemo(() => {
    const tronco = aplicarPesos(fixo.tronco, pesos)
    const cabeca = aplicarPesos(fixo.cabeca, pesos)
    const ponto = (i: number) => new Vector3(cabeca[i * 3], cabeca[i * 3 + 1], cabeca[i * 3 + 2])
    const dir = ponto(fixo.iDir)
    const esq = ponto(fixo.iEsq)
    const centro: V3 = { x: 0, y: (dir.y + esq.y) / 2, z: (dir.z + esq.z) / 2 }
    const ancoras = medirAncoras(tronco, centro)
    let altura = 0
    for (let i = 1; i < cabeca.length; i += 3) altura = Math.max(altura, cabeca[i])
    return { malhas: fixo.malhas, pesos, ancoras, mapa: criarMapa(ANCORAS_ZA, ancoras), altura, narinaDir: dir }
  }, [fixo, pesos])
}

useGLTF.preload(URL_CORPO, false, true)
useGLTF.preload(URL_ORGAOS, false, true)

/* ----------------------------------------------------------------- órgãos */

export interface OrgaoPronto {
  geometria: BufferGeometry
  /** centro do órgão já encaixado (m) */
  centro: Vector3
}

interface OrgaoBruto {
  pos: Float32Array
  indice: BufferGeometry['index']
}

/** Geometria dos órgãos em float, no sistema do Z-Anatomy (sem quantização) */
function useOrgaosBrutos(): Record<Orgao, OrgaoBruto> {
  const { scene } = useGLTF(URL_ORGAOS, false, true)
  return useMemo(() => {
    scene.updateMatrixWorld(true)
    const out = {} as Record<Orgao, OrgaoBruto>
    const v = new Vector3()
    scene.traverse((o: Object3D) => {
      if (!(o as Mesh).isMesh) return
      const nome = (o.parent?.name || o.name).split('.')[0] as Orgao
      const geo = (o as Mesh).geometry
      const p = geo.getAttribute('position')
      const f = new Float32Array(p.count * 3)
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)
        f.set([v.x, v.y, v.z], i * 3)
      }
      out[nome] = { pos: f, indice: geo.index }
    })
    return out
  }, [scene])
}

/** Órgãos encaixados no corpo atual; cada geometria fica centrada no próprio centro (para animar). */
export function useOrgaos(mapa: Mapa): Record<Orgao, OrgaoPronto> {
  const brutos = useOrgaosBrutos()
  return useMemo(() => {
    const out = {} as Record<Orgao, OrgaoPronto>
    const s: V3 = { x: 0, y: 0, z: 0 }
    for (const nome of Object.keys(brutos) as Orgao[]) {
      const src = brutos[nome].pos
      const f = new Float32Array(src.length)
      for (let i = 0; i < src.length; i += 3) {
        mapa(src[i], src[i + 1], src[i + 2], s)
        f[i] = s.x
        f[i + 1] = s.y
        f[i + 2] = s.z
      }
      const geo = new BufferGeometry()
      geo.setAttribute('position', new Float32BufferAttribute(f, 3))
      const idx = brutos[nome].indice
      if (idx) geo.setIndex(idx.clone())
      geo.computeVertexNormals()
      geo.computeBoundingBox()
      const centro = geo.boundingBox!.getCenter(new Vector3())
      geo.translate(-centro.x, -centro.y, -centro.z)
      out[nome] = { geometria: geo, centro }
    }
    return out
  }, [brutos, mapa])
}

/* -------------------------------------------------------------- materiais */

const carregador = new TextureLoader()
const texturas = new Map<string, Promise<Texture>>()
/** Texturas extras de pele (clara e escura); a média já vem dentro do corpo.glb */
export function texturaPele(nome: 'clara' | 'escura'): Promise<Texture> {
  if (!texturas.has(nome)) {
    texturas.set(
      nome,
      carregador.loadAsync(`${BASE}modelos/pele_${nome}.webp`).then((t) => {
        t.flipY = false
        t.colorSpace = SRGBColorSpace
        return t
      }),
    )
  }
  return texturas.get(nome)!
}

/** Pele com a textura do MakeHuman e um brilho suave ("sheen"), como pele de verdade. */
export function materialPele(original: MeshStandardMaterial): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    map: original.map,
    roughness: 0.58,
    sheen: 0.3,
    sheenRoughness: 0.6,
    sheenColor: new Color('#ffb4a0'),
    side: DoubleSide,
  })
}

/** Aplica um tom de pele (troca a textura, se precisar, e ajusta a cor). */
export function aplicarTom(mats: MeshStandardMaterial[], texturaMedia: Texture | null, tom: number) {
  const t = TONS[tom] ?? TONS[2]
  const pintar = (map: Texture | null) => {
    for (const m of mats) {
      if (map) m.map = map
      m.color.set(t.tinta)
      m.needsUpdate = true
    }
  }
  if (t.textura === 'media') pintar(texturaMedia)
  else texturaPele(t.textura).then(pintar)
}

/**
 * Pele "de vidro": mais transparente de frente e mais visível nas bordas
 * (efeito fresnel), para dar volume sem esconder os órgãos.
 */
export function materialVidro(cor: string, opacidade = 0.32): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    color: cor,
    roughness: 0.7,
    envMapIntensity: 0.35,
    transparent: true,
    opacity: opacidade,
    depthWrite: false,
  })
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
      gl_FragColor.a = clamp(gl_FragColor.a * mix(0.4, 1.7, fr), 0.0, 0.75);`,
    )
  }
  mat.customProgramCacheKey = () => 'vidro'
  return mat
}

/** Brilho dos olhos: uma camada aditiva por cima (só soma o reflexo). */
export function materialBrilhoOlho(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: '#000000',
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transparent: true,
    blending: AdditiveBlending,
    envMapIntensity: 1.4,
    depthWrite: false,
  })
}

/* --------------------------------------------------------------- reações */

/** Há quanto tempo (s) aconteceu a última reação, e qual foi. */
export function reacaoAtual(): { tipo: 'feliz' | 'uau' | 'ops'; idade: number } | null {
  const r = useApp.getState().reacao
  if (!r) return null
  const idade = (performance.now() - r.em) / 1000
  return idade < 1.6 ? { tipo: r.tipo, idade } : null
}

/** Pulinho de comemoração (aplicado ao personagem inteiro) */
export function alturaPulo(): number {
  const r = reacaoAtual()
  if (!r || r.tipo === 'ops') return 0
  return Math.max(0, Math.sin(Math.min(1, r.idade / 0.55) * Math.PI)) * 0.22
}

/** Balanço de "ops" (rotação em z, em radianos) */
export function balancoOps(): number {
  const r = reacaoAtual()
  if (!r || r.tipo !== 'ops' || r.idade > 0.9) return 0
  return Math.sin(r.idade * 22) * 0.05 * (1 - r.idade / 0.9)
}

/** Perfil mostrado agora: o rascunho na tela de personalização, senão o perfil salvo. */
export function usePerfilAtual(): Perfil {
  const tela = useApp((s) => s.tela)
  const rascunho = useApp((s) => s.rascunho)
  const perfil = useApp((s) => s.perfil)
  return tela === 'perfil' ? rascunho : (perfil ?? PERFIL_PADRAO)
}
