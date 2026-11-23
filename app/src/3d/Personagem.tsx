/**
 * O "amigo": personagem de desenho animado que respira junto com a criança.
 *
 * Tudo é feito com formas simples (esferas, cápsulas, tubos), sombreado em
 * poucos tons e com contorno, no mesmo estilo dos ícones do app. O tronco é de
 * "vidro" para mostrar os órgãos, que também são simplificados: pulmões como
 * dois balões, traqueia como um tubo com anéis, brônquios como galhos.
 *
 * No caminho do ar, só a parte da parada atual fica colorida, com contorno
 * escuro e uma pulsação lenta; o resto fica cinza-claro e transparente.
 */
import { Html, Line, Outlines } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  CapsuleGeometry,
  CatmullRomCurve3,
  BackSide,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshToonMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { type Parte } from '../conteudo/etapas'
import { PARADAS } from '../conteudo/paradas'
import { useApp } from '../store'
import { NOITE, ROUPA } from './cores'
import { lerPulso } from './enchimento'
import { CHAO_Y, RAIO_CABECA, centroDaParte, medidas, pontosDoAr, posicaoRotulo, type Medidas } from './forma'
import { toon, vidro } from './materiais'
import { CORES_CABELO, TONS, type Perfil } from './perfil'
import { alturaPulo, balancoOps, usePerfilAtual } from './reacao'

const CINZA = new Color('#DCD8EA')
const BERMUDA = '#3D4A8F'
const SAPATO = '#FF8A5B'
const BOCHECHA = '#FF9EAA'

/** Cor de cada parte do caminho do ar (cores claras, de desenho). */
const COR_PARTE: Record<Parte, string> = {
  nariz: '#F7A6B2',
  faringe: '#F49AA8',
  laringe: '#8FD3F0',
  traqueia: '#8FD3F0',
  bronquios: '#6FC0E8',
  pulmoes: '#FF8FA3',
  alveolos: '#FF8FA3',
  diafragma: '#F2A65A',
}

const R = RAIO_CABECA
/** z da superfície da cabeça num ponto (x, y) do rosto */
const naFace = (x: number, y: number, alem = 0) => Math.sqrt(Math.max(0, R * R - x * x - y * y)) + alem

/* ------------------------------------------------------------------ cabeça */

interface PropsCabeca {
  perfil: Perfil
  /** cabeça transparente (para ver o nariz e a garganta por dentro) */
  transparente?: boolean
  /** ajusta os materiais da pele (o jogo usa para abrir o buraco da narina) */
  prepararPele?: (m: MeshToonMaterial) => void
  /** sem o contorno de desenho */
  semContorno?: boolean
}

/** Cabeça redonda com olhos grandes, bochechas e sorriso. Centro em (0, 0, 0). */
export function CabecaAmigo({ perfil, transparente = false, prepararPele, semContorno = false }: PropsCabeca) {
  const tom = (TONS[perfil.pele] ?? TONS[2]).amostra
  const corCabelo = (CORES_CABELO[perfil.corCabelo] ?? CORES_CABELO[1]).amostra
  const m = useMemo(() => {
    const pele = transparente ? vidro(tom, 0.2) : toon(tom)
    const nariz = transparente ? vidro(tom, 0.35) : toon(new Color(tom).multiplyScalar(0.93))
    prepararPele?.(pele)
    prepararPele?.(nariz)
    const cabelo = toon(corCabelo, { side: DoubleSide })
    if (transparente) Object.assign(cabelo, { transparent: true, opacity: 0.22, depthWrite: false })
    return {
      pele,
      nariz,
      cabelo,
      olho: toon(NOITE),
      brilho: toon('#ffffff'),
      bochecha: Object.assign(toon(BOCHECHA), { transparent: true, opacity: 0.75 }),
      boca: toon('#7A3B52'),
    }
  }, [tom, corCabelo, transparente, prepararPele])

  const longo = perfil.cabelo === 'longo'
  const menina = perfil.corpo === 'feminino'
  const contorno = !transparente && !semContorno

  return (
    <group>
      {/* cabeça e orelhas */}
      <mesh material={m.pele}>
        <sphereGeometry args={[R, 48, 36]} />
        {contorno && <Outlines thickness={4.5} color={NOITE} />}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.pele} position={[s * R * 0.96, -0.03, -0.02]} scale={[0.5, 1, 0.8]}>
          <sphereGeometry args={[0.13, 20, 16]} />
          {contorno && <Outlines thickness={4} color={NOITE} />}
        </mesh>
      ))}

      {/* olhos grandes com brilho */}
      {[-1, 1].map((s) => {
        const x = s * 0.2
        const y = 0.05
        const z = naFace(x, y, -0.03)
        return (
          <group key={s} position={[x, y, z]}>
            <mesh material={m.olho} scale={[1, 1.3, 0.55]}>
              <sphereGeometry args={[0.075, 20, 16]} />
            </mesh>
            <mesh material={m.brilho} position={[0.022, 0.04, 0.035]}>
              <sphereGeometry args={[0.024, 12, 10]} />
            </mesh>
            {menina &&
              [0, 1].map((k) => (
                <mesh key={k} material={m.olho} position={[s * (0.06 + k * 0.025), 0.085 - k * 0.025, 0]} rotation={[0, 0, s * (-0.7 - k * 0.5)]}>
                  <capsuleGeometry args={[0.009, 0.04, 4, 6]} />
                </mesh>
              ))}
            {/* sobrancelha */}
            <mesh material={m.cabelo} position={[0, 0.15, 0.0]} rotation={[0, 0, s * 0.12 + Math.PI / 2]}>
              <capsuleGeometry args={[0.016, 0.09, 4, 8]} />
            </mesh>
          </group>
        )
      })}

      {/* bochechas */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.bochecha} position={[s * 0.33, -0.12, naFace(s * 0.33, -0.12, -0.04)]} scale={[1, 0.62, 0.3]}>
          <sphereGeometry args={[0.075, 16, 12]} />
        </mesh>
      ))}

      {/* nariz e sorriso */}
      <mesh material={m.nariz} position={[0, -0.08, naFace(0, -0.08, -0.035)]}>
        <sphereGeometry args={[0.085, 20, 16]} />
      </mesh>
      <mesh material={m.boca} position={[0, -0.22, naFace(0, -0.22, -0.015)]} rotation={[0.25, 0, Math.PI]}>
        <torusGeometry args={[0.09, 0.022, 8, 24, Math.PI]} />
      </mesh>

      {/* cabelo: uma "touca" inclinada para trás, e mechas se for comprido */}
      <mesh material={m.cabelo} rotation={[-0.5, 0, 0]}>
        <sphereGeometry args={[R * 1.07, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
        {contorno && <Outlines thickness={4} color={NOITE} />}
      </mesh>
      {longo && (
        <>
          <mesh material={m.cabelo} position={[0, -0.42, -0.28]} scale={[1, 1, 0.55]}>
            <capsuleGeometry args={[R * 0.9, 0.55, 8, 24]} />
            {contorno && <Outlines thickness={4} color={NOITE} />}
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.cabelo} position={[s * 0.56, -0.42, 0.06]}>
              <capsuleGeometry args={[0.13, 0.5, 6, 12]} />
              {contorno && <Outlines thickness={4} color={NOITE} />}
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}

/* -------------------------------------------------------------- órgãos */

function tubo(pontos: Vector3[], raio: number | ((u: number) => number), segmentos = 48): TubeGeometry {
  const curva = new CatmullRomCurve3(pontos, false, 'centripetal')
  const g = new TubeGeometry(curva, segmentos, typeof raio === 'number' ? raio : 1, 16, false)
  if (typeof raio === 'function') {
    // afina o tubo ao longo do comprimento: reposiciona cada anel em volta da curva
    const pos = g.attributes.position
    const v = new Vector3()
    for (let i = 0; i <= segmentos; i++) {
      const u = i / segmentos
      const centro = curva.getPointAt(u)
      for (let j = 0; j <= 16; j++) {
        const k = i * 17 + j
        v.fromBufferAttribute(pos, k).sub(centro).multiplyScalar(raio(u)).add(centro)
        pos.setXYZ(k, v.x, v.y, v.z)
      }
    }
    g.computeVertexNormals()
  }
  return g
}

/** Pulmão em forma de balão (mais largo embaixo, arredondado em cima). */
function geometriaPulmao(altura: number, largura: number): LatheGeometry {
  const perfil = [
    [0, -1],
    [0.55, -0.97],
    [0.85, -0.82],
    [1, -0.5],
    [0.98, -0.1],
    [0.86, 0.35],
    [0.62, 0.75],
    [0.32, 0.96],
    [0, 1],
  ].map(([r, y]) => new Vector2(r * largura, y * altura))
  return new LatheGeometry(perfil, 40)
}

interface Peca {
  parte: Parte
  geometria: () => import('three').BufferGeometry
  posicao?: [number, number, number]
  rotacao?: [number, number, number]
  escala?: [number, number, number]
  /** sem contorno (peças pequenas, como os anéis da traqueia) */
  semContorno?: boolean
  /** referência para animar (pulmões e diafragma respiram) */
  nome?: 'pulmaoE' | 'pulmaoD' | 'diafragma'
}

function pecasDosOrgaos(md: Medidas): Peca[] {
  const ar = pontosDoAr(md, 1)
  const arE = pontosDoAr(md, -1)
  const lp = md.largura * 0.42
  const pecas: Peca[] = [
    // nariz por dentro e garganta (dentro da cabeça)
    { parte: 'nariz', geometria: () => tubo(ar.slice(0, 4), (u) => 0.05 - u * 0.012) },
    { parte: 'faringe', geometria: () => tubo(ar.slice(3, 6), 0.058) },
    // laringe: um tubo mais largo, com a "tampinha" (epiglote) em cima
    { parte: 'laringe', geometria: () => tubo(ar.slice(5, 7), 0.075, 12) },
    {
      parte: 'laringe',
      geometria: () => new SphereGeometry(0.06, 16, 12),
      posicao: [0, ar[5].y + 0.03, ar[5].z + 0.05],
      escala: [1, 0.35, 0.8],
      rotacao: [0.5, 0, 0],
    },
    // traqueia com anéis
    { parte: 'traqueia', geometria: () => tubo(ar.slice(6, 9), 0.056, 24) },
  ]
  const yIni = ar[6].y - 0.04
  const yFim = ar[8].y + 0.02
  for (let y = yIni; y > yFim; y -= 0.075) {
    pecas.push({
      parte: 'traqueia',
      geometria: () => new TorusGeometry(0.06, 0.013, 8, 24),
      posicao: [0, y, ar[6].z],
      rotacao: [Math.PI / 2, 0, 0],
      semContorno: true,
    })
  }
  // brônquios: um galho para cada pulmão, com ramos menores lá dentro
  for (const [pts, s] of [
    [ar, 1],
    [arE, -1],
  ] as const) {
    pecas.push({ parte: 'bronquios', geometria: () => tubo([pts[8], pts[9], pts[10], pts[11]], (u) => 0.045 - u * 0.015, 32) })
    const meio = pts[10]
    for (const [dx, dy] of [
      [0.16, 0.12],
      [0.2, -0.2],
      [0.06, -0.3],
    ]) {
      const fim = new Vector3(s * (Math.abs(meio.x) + dx), md.pulmaoY + dy * (md.pulmaoAltura / 0.38), meio.z)
      const mid = meio.clone().lerp(fim, 0.5).add(new Vector3(0, 0.03, 0))
      pecas.push({ parte: 'bronquios', geometria: () => tubo([meio, mid, fim], (u) => 0.026 - u * 0.012, 16), semContorno: true })
    }
  }
  // pulmões (balões) e diafragma (cúpula)
  for (const s of [-1, 1] as const) {
    pecas.push({
      parte: 'pulmoes',
      geometria: () => geometriaPulmao(md.pulmaoAltura, lp * 0.55),
      posicao: [s * lp * 1.08, md.pulmaoY, 0.05],
      rotacao: [0, 0, s * -0.06],
      escala: [1, 1, 0.85],
      nome: s === 1 ? 'pulmaoD' : 'pulmaoE',
    })
  }
  pecas.push({
    parte: 'diafragma',
    geometria: () => new SphereGeometry(md.largura * 0.85, 40, 14, 0, Math.PI * 2, 0, 1.05),
    posicao: [0, md.pulmaoY - md.pulmaoAltura - 0.3, 0.05],
    escala: [1, 0.8, 0.62],
    nome: 'diafragma',
  })
  return pecas
}

/* A espessura dos contornos (Outlines) é em pixels de tela. */

/** Material de uma parte, com o estado de destaque aplicado. */
function aplicarEstado(mat: MeshToonMaterial, cor: Color, estado: 'normal' | 'aceso' | 'apagado') {
  if (estado === 'apagado') {
    mat.color.copy(CINZA)
    mat.transparent = true
    mat.opacity = 0.3
    mat.depthWrite = false
    mat.emissive.set('#000000')
  } else {
    mat.color.copy(cor)
    mat.transparent = false
    mat.opacity = 1
    mat.depthWrite = true
    mat.emissive.copy(cor)
    mat.emissiveIntensity = estado === 'aceso' ? 0.25 : 0
  }
  mat.needsUpdate = true
}

function Orgaos({ md, destaque }: { md: Medidas; destaque: Parte | null }) {
  const pecas = useMemo(() => pecasDosOrgaos(md), [md])
  const geos = useMemo(() => pecas.map((p) => p.geometria()), [pecas])
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos])

  // um material por parte (todas as peças da mesma parte acendem juntas)
  const mats = useMemo(() => {
    const out = {} as Record<Parte, MeshToonMaterial>
    for (const p of Object.keys(COR_PARTE) as Parte[]) out[p] = toon(COR_PARTE[p], p === 'diafragma' ? { side: DoubleSide } : {})
    return out
  }, [])
  const cores = useMemo(() => {
    const out = {} as Record<Parte, Color>
    for (const p of Object.keys(COR_PARTE) as Parte[]) out[p] = new Color(COR_PARTE[p])
    return out
  }, [])

  // nos alvéolos, o pulmão é que acende (os alvéolos ficam dentro dele)
  const acesa: Parte | null = destaque === 'alveolos' ? 'pulmoes' : destaque
  useEffect(() => {
    for (const p of Object.keys(mats) as Parte[]) {
      aplicarEstado(mats[p], cores[p], !acesa ? 'normal' : p === acesa ? 'aceso' : 'apagado')
    }
  }, [acesa, mats, cores])

  const refs = useRef<Record<string, Mesh | null>>({})
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { enchimento: e } = lerPulso(t)
    for (const n of ['pulmaoE', 'pulmaoD'] as const) refs.current[n]?.scale.set(1 + 0.08 * e, 1 + 0.06 * e, 0.85 * (1 + 0.08 * e))
    const d = refs.current.diafragma
    if (d) d.position.y = md.pulmaoY - md.pulmaoAltura - 0.3 - 0.05 * e
    // a parte acesa "respira" devagar: brilho e tamanho sobem e descem (1 vez a cada 2,5 s, sem piscar)
    if (acesa) {
      const onda = 0.5 + 0.5 * Math.sin(t * 2.5)
      mats[acesa].emissiveIntensity = 0.15 + 0.3 * onda
    }
  })

  const contorno = (p: Peca) => !p.semContorno && (!acesa || p.parte === acesa)
  return (
    <group>
      {pecas.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (p.nome) refs.current[p.nome] = el
          }}
          geometry={geos[i]}
          material={mats[p.parte]}
          position={p.posicao}
          rotation={p.rotacao}
          scale={p.escala}
          renderOrder={acesa && p.parte !== acesa ? 1 : 3}
        >
          {contorno(p) && <Outlines thickness={p.parte === acesa ? 7 : 3} color={NOITE} />}
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------- corpo */

function Corpo({ perfil, md, caminho, children }: { perfil: Perfil; md: Medidas; caminho: boolean; children?: ReactNode }) {
  const tom = (TONS[perfil.pele] ?? TONS[2]).amostra
  const roupa = ROUPA[perfil.corpo]
  const m = useMemo(
    () => ({
      pele: toon(tom),
      roupa: toon(roupa),
      // a camiseta é de "vidro" clarinho, para os órgãos aparecerem com a cor deles
      vidroTronco: vidro(new Color(roupa).lerp(new Color('#ffffff'), 0.45), 0.3),
      vidroPescoco: vidro(tom, 0.4),
      bermuda: toon(BERMUDA),
      sapato: toon(SAPATO),
    }),
    [tom, roupa],
  )
  useEffect(() => {
    // no caminho do ar o tronco fica bem mais transparente, para os órgãos aparecerem
    m.vidroTronco.opacity = caminho ? 0.14 : 0.3
    m.vidroPescoco.opacity = caminho ? 0.14 : 0.4
  }, [caminho, m])

  const tronco = useMemo(() => {
    const raio = md.largura
    return new CapsuleGeometry(raio, Math.max(0.05, md.tronco - raio * 2), 12, 32)
  }, [md])
  useEffect(() => () => tronco.dispose(), [tronco])
  const troncoRef = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    troncoRef.current?.scale.set(1 + 0.03 * e, 1, 0.72 * (1 + 0.05 * e))
  })

  const yTronco = (md.troncoBase + md.troncoTopo) / 2
  const ombroY = md.troncoTopo - 0.32
  const comprBraco = ombroY - (md.quadril + 0.05)
  const comprPerna = md.quadril - (CHAO_Y + 0.2)

  return (
    <group>
      {/* pernas, bermuda e sapatos */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * md.largura * 0.42, 0, 0]}>
          <mesh material={m.pele} position={[0, CHAO_Y + 0.2 + comprPerna / 2, 0]}>
            <capsuleGeometry args={[md.membro, comprPerna, 8, 16]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
          <mesh material={m.bermuda} position={[0, md.quadril - 0.28, 0]}>
            <capsuleGeometry args={[md.membro * 1.35, 0.2, 8, 16]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
          <mesh material={m.sapato} position={[0, CHAO_Y + 0.12, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[md.membro * 0.95, 0.2, 8, 16]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
        </group>
      ))}

      {/* braços (com manguinha) e mãos */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * md.largura * 0.98, ombroY, 0]} rotation={[0, 0, s * 0.12]}>
          <mesh material={m.pele} position={[0, -comprBraco / 2, 0]}>
            <capsuleGeometry args={[md.membro * 0.82, comprBraco - 0.2, 8, 16]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
          <mesh material={m.roupa} position={[0, -0.12, 0]}>
            <capsuleGeometry args={[md.membro * 1.08, 0.18, 8, 16]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
          <mesh material={m.pele} position={[0, -comprBraco + 0.02, 0]}>
            <sphereGeometry args={[md.membro * 1.05, 20, 16]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
        </group>
      ))}

      {/* órgãos ficam entre o corpo e o vidro do tronco */}
      {children}

      {/* tronco (camiseta de "vidro") e pescoço */}
      <mesh ref={troncoRef} geometry={tronco} material={m.vidroTronco} position={[0, yTronco, 0]} renderOrder={5} />
      <mesh material={m.vidroPescoco} position={[0, md.troncoTopo + 0.12, 0.02]} renderOrder={5}>
        <cylinderGeometry args={[0.17, 0.19, 0.42, 24, 1, true]} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------- alvéolos */

/** Saquinhos de ar ampliados (só na parada dos alvéolos), como um "zoom" ao lado do pulmão. */
function AlveolosAmpliados({ posicao, origem }: { posicao: Vector3; origem: Vector3 }) {
  const ref = useRef<Group>(null)
  const bolhas = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const r = 0.07 + (i % 3) * 0.03
      out.push([Math.cos(a) * r, Math.sin(a * 1.3) * r * 0.9, Math.sin(a) * r * 0.5])
    }
    return out
  }, [])
  const mats = useMemo(() => [toon(COR_PARTE.alveolos), toon('#FFB3C1')], [])
  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    ref.current?.scale.setScalar(0.85 + 0.25 * e)
  })
  return (
    <>
      <Line points={[origem, posicao]} color={NOITE} lineWidth={3} dashed dashSize={0.05} gapSize={0.04} />
      <group position={posicao}>
        <mesh>
          <sphereGeometry args={[0.24, 32, 24]} />
          {/* fundo da lupa: só a parte de trás da esfera, para não cobrir os saquinhos */}
          <meshBasicMaterial color="#ffffff" side={BackSide} />
          <Outlines thickness={3.5} color={NOITE} />
        </mesh>
        <group ref={ref}>
          {bolhas.map((p, i) => (
            <mesh key={i} position={p} material={mats[i % 2]}>
              <sphereGeometry args={[0.05, 18, 14]} />
              <Outlines thickness={2} color={NOITE} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  )
}

/* ----------------------------------------------------------- rótulo */

function Rotulo({ parte, posicao, alvo }: { parte: Parte; posicao: Vector3; alvo: Vector3 }) {
  return (
    <>
      <Line points={[alvo, posicao]} color={NOITE} lineWidth={3} />
      <mesh position={alvo}>
        <sphereGeometry args={[0.03, 12, 10]} />
        <meshBasicMaterial color={NOITE} />
      </mesh>
      <Html position={posicao} center distanceFactor={2.6} zIndexRange={[10, 0]} pointerEvents="none">
        <span className="rotulo3d">{PARADAS.find((p) => p.parte === parte)?.nome}</span>
      </Html>
    </>
  )
}

/* ---------------------------------------------------------- personagem */

function useDestaque(): Parte | null {
  const tela = useApp((s) => s.tela)
  const parada = useApp((s) => s.parada)
  return tela === 'caminho' ? PARADAS[parada].parte : null
}

export function Personagem() {
  const perfil = usePerfilAtual()
  const destaque = useDestaque()
  const md = useMemo(() => medidas(perfil), [perfil])
  const raiz = useRef<Group>(null)
  const caminho = destaque !== null

  useFrame(() => {
    if (!raiz.current) return
    raiz.current.position.y = -0.55 + alturaPulo()
    raiz.current.rotation.z = balancoOps()
  })

  const alvo = destaque ? centroDaParte(md, destaque) : null
  const rotulo = destaque ? posicaoRotulo(md, destaque) : null

  return (
    <group ref={raiz} position={[0, -0.55, 0]}>
      <Corpo perfil={perfil} md={md} caminho={caminho}>
        <Orgaos md={md} destaque={destaque} />
      </Corpo>
      <group position={md.cabeca}>
        <CabecaAmigo perfil={perfil} transparente={caminho} />
      </group>

      {destaque === 'alveolos' && alvo && rotulo && <AlveolosAmpliados posicao={rotulo.clone().add(new Vector3(0, -0.45, 0))} origem={alvo} />}
      {destaque && alvo && rotulo && <Rotulo parte={destaque} posicao={rotulo} alvo={alvo} />}
    </group>
  )
}
