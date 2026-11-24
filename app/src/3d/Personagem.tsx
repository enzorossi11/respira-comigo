/**
 * O "amigo": personagem de desenho animado que respira junto com a criança.
 *
 * Proporções de gente (cabeça, pescoço, ombros, cintura, cotovelos, joelhos),
 * mas feito com formas simples, sombreado em poucos tons e com contorno, no
 * mesmo estilo dos ícones do app. Menino e menina se diferenciam no rosto
 * (sobrancelha, cílios, boca), no cabelo (franja e laço), no corpo (ombros e
 * quadril) e na roupa (bermuda e tênis, ou saia e sapatilha).
 *
 * O tronco é de "vidro" para mostrar os órgãos, que são simplificados:
 * pulmões como dois balões, traqueia como um tubo com anéis, brônquios como
 * galhos. No caminho do ar, só a parte da parada atual fica colorida, com
 * contorno escuro e um brilho que sobe e desce devagar; o resto fica cinza.
 */
import { Html, Line, Outlines } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  BackSide,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshToonMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three'
import { type Parte } from '../conteudo/etapas'
import { PARADAS } from '../conteudo/paradas'
import { useApp } from '../store'
import { NOITE, ROUPA } from './cores'
import { lerPulso } from './enchimento'
import {
  CHAO_Y,
  NARINAS,
  NARIZ,
  QUEIXO,
  RAIO_CABECA,
  centroDaParte,
  ladoPulmao,
  medidas,
  pontosDoAr,
  posicaoRotulo,
  superficieRosto,
  type Medidas,
} from './forma'
import { toon, vidro } from './materiais'
import { CORES_CABELO, TONS, type Perfil } from './perfil'
import { alturaPulo, balancoOps, usePerfilAtual } from './reacao'

const CINZA = new Color('#DCD8EA')
const BERMUDA = '#3D4A8F'
const TENIS = '#FF8A5B'
const SAIA = '#E86A92'
const SAPATILHA = '#E86A92'
const LACO = '#FF5C8A'
const IRIS = '#6B4A2E'

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
const EIXO_Z = new Vector3(0, 0, 1)
const escurecer = (cor: string, k: number) => new Color(cor).multiplyScalar(k)

/* A espessura dos contornos (Outlines) é em pixels de tela. */

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

/** Um olho: branco, íris, pupila e um pontinho de brilho. */
function Olho({ lado, menina, m }: { lado: 1 | -1; menina: boolean; m: Record<string, MeshToonMaterial> }) {
  const x = lado * 0.36 * R
  const y = 0.02 * R
  const z = superficieRosto(x, y) - 0.022
  const k = menina ? 1.1 : 1
  return (
    <group position={[x, y, z]} rotation={[0, lado * 0.32, 0]} scale={k}>
      <mesh material={m.branco} scale={[1.2, 1, 0.5]}>
        <sphereGeometry args={[0.058, 24, 16]} />
      </mesh>
      <mesh material={m.iris} position={[0, -0.002, 0.02]} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.04, 20, 14]} />
      </mesh>
      <mesh material={m.pupila} position={[0, -0.002, 0.03]} scale={[1, 1, 0.4]}>
        <sphereGeometry args={[0.021, 14, 10]} />
      </mesh>
      <mesh material={m.brilho} position={[0.013, 0.014, 0.036]}>
        <sphereGeometry args={[0.009, 10, 8]} />
      </mesh>
      {/* pálpebra de cima: um traço; na menina, mais grosso e com cílios */}
      <mesh material={menina ? m.pupila : m.palpebra} position={[0, 0.006, 0.012]} rotation={[0.2, 0, 0]} scale={[1.2, 1, 1]}>
        <torusGeometry args={[0.058, menina ? 0.008 : 0.005, 6, 24, Math.PI]} />
      </mesh>
      {menina &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            material={m.pupila}
            position={[lado * (0.052 + i * 0.012), 0.04 - i * 0.012, 0.01]}
            rotation={[0, 0, lado * (-0.5 - i * 0.35)]}
          >
            <capsuleGeometry args={[0.0055, 0.026, 3, 6]} />
          </mesh>
        ))}
    </group>
  )
}

/** Cabeça com rosto, orelhas e cabelo. Centro em (0, 0, 0). */
export function CabecaAmigo({ perfil, transparente = false, prepararPele, semContorno = false }: PropsCabeca) {
  const tom = (TONS[perfil.pele] ?? TONS[2]).amostra
  const corCabelo = (CORES_CABELO[perfil.corCabelo] ?? CORES_CABELO[1]).amostra
  const menina = perfil.corpo === 'feminino'
  const m = useMemo(() => {
    const pele = transparente ? vidro(tom, 0.2) : toon(tom)
    // o nariz fica sólido até na cabeça de vidro, como os olhos e a boca: continua sendo um nariz
    // no jogo (sem contorno) um tom mais escuro destaca o nariz no rosto gigante
    const nariz = toon(escurecer(tom, prepararPele ? 0.8 : 0.93))
    const narina = toon(escurecer(tom, 0.38))
    prepararPele?.(pele)
    prepararPele?.(nariz)
    prepararPele?.(narina)
    const cabelo = toon(corCabelo, { side: DoubleSide })
    if (transparente) Object.assign(cabelo, { transparent: true, opacity: 0.22, depthWrite: false })
    return {
      pele,
      nariz,
      narina,
      orelha: toon(escurecer(tom, 0.88)),
      cabelo,
      branco: toon('#ffffff'),
      iris: toon(IRIS),
      pupila: toon(NOITE),
      brilho: toon('#ffffff'),
      palpebra: toon(escurecer(tom, 0.6)),
      bochecha: Object.assign(toon('#FF8FA0'), { transparent: true, opacity: menina ? 0.6 : 0.28 }),
      boca: toon(menina ? '#D9506F' : '#8A4A3A'),
      laco: toon(LACO),
    }
  }, [tom, corCabelo, transparente, prepararPele, menina])

  const longo = perfil.cabelo === 'longo'
  const contorno = !transparente && !semContorno
  const ct = (px = 3.5) => contorno && <Outlines thickness={px} color={NOITE} />
  // o nariz mantém o contorno até na cabeça de vidro
  const ctNariz = (px: number) => !semContorno && <Outlines thickness={px} color={NOITE} />

  // posições do rosto (sobre a superfície)
  const yBoca = -0.5 * R
  const yBochecha = -0.24 * R

  return (
    <group>
      {/* cabeça + queixo (deixam o rosto mais fino embaixo) e orelhas */}
      <mesh material={m.pele}>
        <sphereGeometry args={[R, 48, 36]} />
        {ct(4)}
      </mesh>
      {/* de vidro, o queixo apareceria como um segundo círculo por dentro da cabeça */}
      {!transparente && (
        <mesh material={m.pele} position={QUEIXO.centro}>
          <sphereGeometry args={[QUEIXO.raio, 40, 30]} />
          {ct(4)}
        </mesh>
      )}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * R * 0.97, -0.07, -0.03]}>
          <mesh material={m.pele} scale={[0.42, 1, 0.75]}>
            <sphereGeometry args={[0.1, 20, 16]} />
            {ct(3)}
          </mesh>
          <mesh material={m.orelha} position={[s * 0.012, 0, 0.02]} scale={[0.3, 0.7, 0.5]}>
            <sphereGeometry args={[0.08, 14, 10]} />
          </mesh>
        </group>
      ))}

      {/* olhos */}
      <Olho lado={-1} menina={menina} m={m} />
      <Olho lado={1} menina={menina} m={m} />

      {/* sobrancelhas: retas e grossas no menino, finas e arqueadas na menina */}
      {([-1, 1] as const).map((s) => {
        const x = s * 0.36 * R
        const y = 0.27 * R
        const z = superficieRosto(x, y) - 0.006
        return menina ? (
          <mesh key={s} material={m.cabelo} position={[x, y - 0.04, z - 0.01]} rotation={[0.25, s * 0.3, 0]}>
            <torusGeometry args={[0.07, 0.0085, 6, 24, Math.PI * 0.62]} />
          </mesh>
        ) : (
          <mesh key={s} material={m.cabelo} position={[x, y, z]} rotation={[0.2, s * 0.32, Math.PI / 2 + s * 0.08]}>
            <capsuleGeometry args={[0.017, 0.1, 4, 8]} />
          </mesh>
        )
      })}

      {/* nariz de desenho: ponte, duas asas, a ponta redonda e as duas narinas embaixo.
          Na cabeça de vidro ficam só a ponta e as narinas: a ponte e as asas, quase todas
          dentro do rosto, apareceriam como pedaços soltos. */}
      {!transparente && (
        <>
          <mesh material={m.nariz} position={[0, NARIZ.centro.y + 0.07, NARIZ.centro.z - 0.024]} rotation={[-0.42, 0, 0]}>
            <capsuleGeometry args={[0.032, 0.085, 4, 12]} />
          </mesh>
          {([-1, 1] as const).map((s) => (
            <mesh key={s} material={m.nariz} position={[s * 0.058, NARIZ.centro.y - 0.022, NARIZ.centro.z - 0.045]}>
              <sphereGeometry args={[0.04, 20, 14]} />
            </mesh>
          ))}
        </>
      )}
      <mesh material={m.nariz} position={NARIZ.centro} scale={NARIZ.escala}>
        <sphereGeometry args={[NARIZ.raio, 28, 20]} />
        {ctNariz(3)}
      </mesh>
      {NARINAS.map((n) => (
        <mesh
          key={n.lado}
          material={m.narina}
          position={n.centro}
          quaternion={new Quaternion().setFromUnitVectors(EIXO_Z, n.direcao)}
          scale={[1.2, 0.72, 0.4]}
        >
          <sphereGeometry args={[0.019, 16, 10]} />
        </mesh>
      ))}

      {/* boca: sorriso fino no menino; lábios rosados na menina */}
      <mesh material={m.boca} position={[0, yBoca, superficieRosto(0, yBoca) - 0.006]} rotation={[0.3, 0, Math.PI]}>
        <torusGeometry args={[menina ? 0.06 : 0.068, menina ? 0.017 : 0.012, 8, 24, Math.PI * 0.85]} />
      </mesh>
      {menina && (
        <mesh material={m.boca} position={[0, yBoca - 0.055, superficieRosto(0, yBoca - 0.055) - 0.008]} scale={[1.6, 0.6, 0.5]}>
          <sphereGeometry args={[0.024, 14, 10]} />
        </mesh>
      )}

      {/* bochechas */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          material={m.bochecha}
          position={[s * 0.56 * R, yBochecha, superficieRosto(s * 0.56 * R, yBochecha) - 0.022]}
          rotation={[0, s * 0.55, 0]}
          scale={[1, 0.62, 0.3]}
        >
          <sphereGeometry args={[0.055, 16, 12]} />
        </mesh>
      ))}

      <Cabelo menina={menina} longo={longo} material={m.cabelo} contorno={contorno} laco={m.laco} soTouca={transparente} />
    </group>
  )
}

/**
 * Cabelo. Menino: curto com topete (ou na altura do pescoço). Menina: franja,
 * chanel ou comprido até as costas, e sempre um laço.
 */
function Cabelo({
  menina,
  longo,
  material,
  contorno,
  laco,
  soTouca,
}: {
  menina: boolean
  longo: boolean
  material: MeshToonMaterial
  contorno: boolean
  laco: MeshToonMaterial
  /** só a touca (com a cabeça de vidro, as outras peças virariam manchas sobrepostas) */
  soTouca: boolean
}) {
  const ct = () => contorno && <Outlines thickness={3.5} color={NOITE} />
  const touca = (
    <mesh material={material} rotation={[menina ? -0.42 : -0.55, 0, 0]}>
      <sphereGeometry args={[R * 1.06, 40, 20, 0, Math.PI * 2, 0, Math.PI * (menina ? 0.58 : 0.52)]} />
      {ct()}
    </mesh>
  )
  if (soTouca) return touca
  return (
    <group>
      {/* "touca": cobre o alto e a parte de trás da cabeça */}
      {touca}

      {menina ? (
        // franja reta na testa
        <mesh material={material} position={[0, R * 0.56, R * 0.62]} rotation={[0.75, 0, Math.PI / 2]} scale={[1, 1, 0.55]}>
          <capsuleGeometry args={[0.1, R * 0.95, 6, 16]} />
          {ct()}
        </mesh>
      ) : (
        // topete: três tufos para o lado
        [-0.16, 0.02, 0.18].map((x, i) => (
          <mesh key={i} material={material} position={[x, R * 0.72 - i * 0.02, R * 0.52]} rotation={[0.6, 0, -0.4]} scale={[1.25, 0.75, 0.9]}>
            <sphereGeometry args={[0.1, 16, 12]} />
            {ct()}
          </mesh>
        ))
      )}

      {/* costeletas (menino) ou laterais do cabelo (menina); compridas, caem na frente dos ombros */}
      {([-1, 1] as const).map((s) =>
        menina ? (
          longo ? (
            <mesh key={s} material={material} position={[s * R * 0.86, -0.42, 0.1]} rotation={[0.12, 0, s * 0.06]} scale={[0.8, 1, 0.7]}>
              <capsuleGeometry args={[0.12, 0.75, 6, 16]} />
              {ct()}
            </mesh>
          ) : (
            <mesh key={s} material={material} position={[s * R * 0.9, -0.12, -0.02]} scale={[0.75, 1, 1]}>
              <capsuleGeometry args={[0.12, 0.2, 6, 16]} />
              {ct()}
            </mesh>
          )
        ) : (
          <mesh key={s} material={material} position={[s * R * 0.93, 0.02, 0.06]}>
            <capsuleGeometry args={[0.035, longo ? 0.28 : 0.1, 4, 8]} />
          </mesh>
        ),
      )}

      {/* parte de trás: vai só até os ombros (mais abaixo, apareceria pela blusa de vidro) */}
      {longo && (
        <mesh material={material} position={[0, -0.2, -0.22]} scale={[1, 1, 0.5]}>
          <capsuleGeometry args={[R * 0.86, 0.22, 8, 24]} />
          {ct()}
        </mesh>
      )}

      {/* laço da menina, do lado do cabelo */}
      {menina && (
        <group position={[R * 0.55, R * 0.74, R * 0.46]} rotation={[0.35, 0.55, -0.45]}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={laco} position={[s * 0.09, 0, 0]} rotation={[0, 0, s * Math.PI / 2]} scale={[1, 1, 0.5]}>
              <coneGeometry args={[0.085, 0.17, 16]} />
              {ct()}
            </mesh>
          ))}
          <mesh material={laco}>
            <sphereGeometry args={[0.045, 12, 10]} />
            {ct()}
          </mesh>
        </group>
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
  geometria: () => BufferGeometry
  posicao?: [number, number, number]
  rotacao?: [number, number, number]
  escala?: [number, number, number]
  /** sem contorno (peças pequenas, como os anéis da traqueia) */
  semContorno?: boolean
  /** referência para animar (pulmões e diafragma respiram) */
  nome?: 'pulmaoE' | 'pulmaoD' | 'diafragma'
}

const alturaDiafragma = (md: Medidas) => md.pulmaoY - md.pulmaoAltura - 0.22

function pecasDosOrgaos(md: Medidas): Peca[] {
  const ar = pontosDoAr(md, 1)
  const arE = pontosDoAr(md, -1)
  const xp = ladoPulmao(md)
  const pecas: Peca[] = [
    // nariz por dentro e garganta (dentro da cabeça)
    { parte: 'nariz', geometria: () => tubo(ar.slice(0, 4), (u) => 0.03 - u * 0.004) },
    { parte: 'faringe', geometria: () => tubo(ar.slice(3, 6), 0.042) },
    // laringe: um tubo mais largo, com a "tampinha" (epiglote) em cima
    { parte: 'laringe', geometria: () => tubo(ar.slice(5, 7), 0.058, 12) },
    {
      parte: 'laringe',
      geometria: () => new SphereGeometry(0.045, 16, 12),
      posicao: [0, ar[5].y + 0.025, ar[5].z + 0.04],
      escala: [1, 0.35, 0.8],
      rotacao: [0.5, 0, 0],
    },
    // traqueia com anéis
    { parte: 'traqueia', geometria: () => tubo(ar.slice(6, 9), 0.042, 24) },
  ]
  for (let y = ar[6].y - 0.035; y > ar[8].y + 0.015; y -= 0.06) {
    pecas.push({
      parte: 'traqueia',
      geometria: () => new TorusGeometry(0.046, 0.01, 8, 24),
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
    pecas.push({ parte: 'bronquios', geometria: () => tubo([pts[8], pts[9], pts[10], pts[11]], (u) => 0.034 - u * 0.012, 32) })
    const meio = pts[10]
    const k = md.pulmaoAltura / 0.34
    for (const [dx, dy] of [
      [0.12, 0.1],
      [0.15, -0.17],
      [0.05, -0.26],
    ]) {
      const fim = new Vector3(s * (Math.abs(meio.x) + dx), md.pulmaoY + dy * k, meio.z)
      const mid = meio.clone().lerp(fim, 0.5).add(new Vector3(0, 0.025, 0))
      pecas.push({ parte: 'bronquios', geometria: () => tubo([meio, mid, fim], (u) => 0.02 - u * 0.009, 16), semContorno: true })
    }
  }
  // pulmões (balões) e diafragma (cúpula)
  for (const s of [-1, 1] as const) {
    pecas.push({
      parte: 'pulmoes',
      geometria: () => geometriaPulmao(md.pulmaoAltura, md.largura * 0.26),
      posicao: [s * xp, md.pulmaoY, 0.03],
      rotacao: [0, 0, s * -0.06],
      escala: [1, 1, 0.85],
      nome: s === 1 ? 'pulmaoD' : 'pulmaoE',
    })
  }
  pecas.push({
    parte: 'diafragma',
    geometria: () => new SphereGeometry(md.largura * 0.66, 40, 14, 0, Math.PI * 2, 0, 1.05),
    posicao: [0, alturaDiafragma(md), 0.03],
    escala: [1, 0.8, 0.6],
    nome: 'diafragma',
  })
  return pecas
}

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
    for (const n of ['pulmaoE', 'pulmaoD'] as const) refs.current[n]?.scale.set(1 + 0.14 * e, 1 + 0.08 * e, 0.85 * (1 + 0.14 * e))
    const d = refs.current.diafragma
    if (d) d.position.y = alturaDiafragma(md) - 0.08 * e
    // a parte acesa "respira" devagar: o brilho sobe e desce (1 vez a cada 2,5 s, sem piscar)
    if (acesa) mats[acesa].emissiveIntensity = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.5))
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

/**
 * Tronco: ombros, peito, cintura e quadril (perfil girado em volta do eixo y,
 * achatado na frente/atrás). Os números são frações da largura dos ombros.
 */
const PERFIL_TRONCO = {
  masculino: [
    [0, 0],
    [0.62, 0],
    [0.7, 0.06],
    [0.68, 0.24],
    [0.66, 0.42],
    [0.76, 0.62],
    [0.9, 0.8],
    [0.95, 0.88],
    [0.8, 0.95],
    [0.3, 1],
    [0, 1],
  ],
  feminino: [
    [0, 0],
    [0.7, 0],
    [0.8, 0.07],
    [0.72, 0.24],
    [0.6, 0.42],
    [0.72, 0.6],
    [0.82, 0.78],
    [0.86, 0.87],
    [0.72, 0.95],
    [0.28, 1],
    [0, 1],
  ],
} as const

/** Cintura: a parte de baixo do tronco, opaca, na cor da bermuda ou da saia. */
function geometriaCintura(md: Medidas, corpo: Perfil['corpo']): LatheGeometry {
  const base = md.troncoBase - 0.1
  const altura = md.troncoTopo - base
  const ate = 0.2 // fração do tronco coberta pela cintura
  const pts = [0, 0.001, 0.06, 0.12, ate].map((y) => new Vector2(raioTronco(corpo, y) * md.largura * 1.03, base + y * altura))
  pts.unshift(new Vector2(0, base))
  pts.push(new Vector2(0, base + ate * altura))
  const g = new LatheGeometry(pts, 48)
  g.scale(1, 1, 0.6)
  return g
}

/**
 * Respiração no tronco: ao puxar o ar a barriga cresce para a frente e para
 * os lados (respiração pela barriga, a que acalma) e o peito sobe um pouco.
 * Desloca os vértices a partir das posições originais, guardadas em `base`.
 */
function respirarTronco(g: LatheGeometry, base: Float32Array, md: Medidas, e: number) {
  const pos = g.attributes.position
  const y0 = md.troncoBase - 0.1
  const h = md.troncoTopo - y0
  const zMax = md.largura * 0.6
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3]
    const y = base[i * 3 + 1]
    const z = base[i * 3 + 2]
    const v = (y - y0) / h
    const barriga = Math.exp(-((v - 0.36) ** 2) / (2 * 0.13 ** 2))
    const peito = Math.exp(-((v - 0.68) ** 2) / (2 * 0.12 ** 2))
    const frente = Math.max(0, z / zMax) ** 1.2
    const lados = Math.abs(x) / md.largura
    pos.setXYZ(
      i,
      x * (1 + e * (0.24 * barriga + 0.05 * peito) * lados),
      y + e * 0.03 * peito,
      z + e * zMax * (0.95 * barriga + 0.15 * peito) * frente,
    )
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
}

/** raio do perfil do tronco numa altura v (0 a 1), por interpolação */
function raioTronco(corpo: Perfil['corpo'], v: number): number {
  const p = PERFIL_TRONCO[corpo]
  for (let i = 1; i < p.length; i++) {
    const [r0, y0] = p[i - 1]
    const [r1, y1] = p[i]
    if (v <= y1 && y1 > y0) return r0 + ((r1 - r0) * (v - y0)) / (y1 - y0)
  }
  return p[p.length - 1][0]
}

/** Barriga: faixa do tronco entre a cintura e o peito, de "tecido" (opaca). */
const BARRIGA: [number, number] = [0.17, 0.47]

function geometriaBarriga(md: Medidas, corpo: Perfil['corpo']): LatheGeometry {
  const base = md.troncoBase - 0.1
  const altura = md.troncoTopo - base
  const [de, ate] = BARRIGA
  const pts: Vector2[] = []
  for (let k = 0; k <= 12; k++) {
    const v = de + ((ate - de) * k) / 12
    pts.push(new Vector2(raioTronco(corpo, v) * md.largura * 1.012, base + v * altura))
  }
  const g = new LatheGeometry(pts, 48)
  g.scale(1, 1, 0.6)
  return g
}

/** Tronco de vidro; com `de` > 0, só do peito para cima (a barriga fica de tecido). */
function geometriaTronco(md: Medidas, corpo: Perfil['corpo'], de = 0): LatheGeometry {
  const base = md.troncoBase - 0.1
  const altura = md.troncoTopo - base
  const perfil = de > 0 ? [[raioTronco(corpo, de), de], ...PERFIL_TRONCO[corpo].filter(([, y]) => y > de)] : PERFIL_TRONCO[corpo]
  const pts = perfil.map(([r, y]) => new Vector2(r * md.largura, base + y * altura))
  const g = new LatheGeometry(pts, 48)
  g.scale(1, 1, 0.6) // achata: o corpo é mais largo do que fundo
  return g
}

/** Braço com cotovelo levemente dobrado, manga curta e mão com polegar. */
function Braco({ lado, md, m, ombroX }: { lado: 1 | -1; md: Medidas; m: Record<string, MeshToonMaterial>; ombroX: number }) {
  const ombroY = md.troncoTopo - 0.12
  const total = ombroY - (md.quadril - 0.22)
  const ua = total * 0.47
  const fa = total * 0.4
  const r = md.membro
  return (
    <group position={[lado * ombroX, ombroY, 0]} rotation={[0, 0, lado * 0.09]}>
      <mesh material={m.roupa} position={[0, -0.05, 0]}>
        <sphereGeometry args={[r * 1.45, 20, 16]} />
        <Outlines thickness={3.5} color={NOITE} />
      </mesh>
      <mesh material={m.roupa} position={[0, -0.14, 0]}>
        <capsuleGeometry args={[r * 1.32, 0.12, 6, 16]} />
        <Outlines thickness={3.5} color={NOITE} />
      </mesh>
      <mesh material={m.pele} position={[0, -ua / 2, 0]}>
        <capsuleGeometry args={[r, ua - r, 6, 16]} />
        <Outlines thickness={3.5} color={NOITE} />
      </mesh>
      {/* antebraço, um pouco para a frente */}
      <group position={[0, -ua, 0]} rotation={[-0.18, 0, -lado * 0.04]}>
        <mesh material={m.pele} position={[0, -fa / 2, 0]}>
          <capsuleGeometry args={[r * 0.88, fa - r, 6, 16]} />
          <Outlines thickness={3.5} color={NOITE} />
        </mesh>
        <group position={[0, -fa - r * 0.6, 0.01]}>
          <mesh material={m.pele} scale={[0.78, 1.15, 0.5]}>
            <sphereGeometry args={[r * 1.3, 18, 14]} />
            <Outlines thickness={3} color={NOITE} />
          </mesh>
          <mesh material={m.pele} position={[-lado * r * 0.75, r * 0.25, r * 0.4]} rotation={[0.4, 0, lado * 0.6]}>
            <capsuleGeometry args={[r * 0.32, r * 0.7, 4, 8]} />
            <Outlines thickness={2.5} color={NOITE} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/** Perna com coxa, canela e calçado. */
function Perna({ lado, md, m, quadrilX, menina }: { lado: 1 | -1; md: Medidas; m: Record<string, MeshToonMaterial>; quadrilX: number; menina: boolean }) {
  const r = md.membro
  const alto = md.quadril + 0.04
  const tornozelo = CHAO_Y + 0.14
  const coxa = (alto - tornozelo) * 0.5
  const canela = alto - tornozelo - coxa
  return (
    <group position={[lado * quadrilX, 0, 0]}>
      <mesh material={m.pele} position={[0, alto - coxa / 2, 0]}>
        <capsuleGeometry args={[r * 1.3, coxa - r, 6, 16]} />
        <Outlines thickness={3.5} color={NOITE} />
      </mesh>
      <mesh material={m.pele} position={[0, tornozelo + canela / 2, 0]}>
        <capsuleGeometry args={[r * 1.02, canela - r, 6, 16]} />
        <Outlines thickness={3.5} color={NOITE} />
      </mesh>
      {/* bermuda (menino) */}
      {!menina && (
        <mesh material={m.bermuda} position={[0, alto - 0.14, 0]}>
          <capsuleGeometry args={[r * 1.62, 0.2, 6, 16]} />
          <Outlines thickness={3.5} color={NOITE} />
        </mesh>
      )}
      {/* tênis (menino) ou sapatilha (menina) */}
      <group position={[0, CHAO_Y + 0.08, 0.07]}>
        <mesh material={m.calcado} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, menina ? 0.7 : 0.85]}>
          <capsuleGeometry args={[r * 1.12, 0.17, 6, 16]} />
          <Outlines thickness={3.5} color={NOITE} />
        </mesh>
        {!menina && (
          <mesh material={m.sola} position={[0, -0.055, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.35]}>
            <capsuleGeometry args={[r * 1.12, 0.19, 6, 16]} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function Corpo({ perfil, md, caminho, children }: { perfil: Perfil; md: Medidas; caminho: boolean; children?: ReactNode }) {
  const tom = (TONS[perfil.pele] ?? TONS[2]).amostra
  const menina = perfil.corpo === 'feminino'
  const roupa = ROUPA[perfil.corpo]
  const m = useMemo(
    () => ({
      pele: toon(tom),
      roupa: toon(roupa),
      // a blusa/camiseta é de "vidro" clarinho, para os órgãos aparecerem com a cor deles
      vidroTronco: vidro(new Color(roupa).lerp(new Color('#ffffff'), 0.45), 0.3),
      vidroPescoco: vidro(tom, 0.4),
      bermuda: toon(BERMUDA),
      saia: toon(SAIA, { side: DoubleSide }),
      calcado: toon(menina ? SAPATILHA : TENIS),
      sola: toon('#ffffff'),
    }),
    [tom, roupa, menina],
  )
  useEffect(() => {
    // no caminho do ar o tronco fica bem mais transparente, para os órgãos aparecerem
    m.vidroTronco.opacity = caminho ? 0.14 : 0.3
    m.vidroPescoco.opacity = caminho ? 0.14 : 0.4
  }, [caminho, m])

  // no caminho do ar o vidro vai até embaixo (para ver o diafragma); nas outras telas, só no peito
  const tronco = useMemo(() => geometriaTronco(md, perfil.corpo, caminho ? 0 : BARRIGA[1] - 0.015), [md, perfil.corpo, caminho])
  const baseTronco = useMemo(() => Float32Array.from(tronco.attributes.position.array), [tronco])
  const barriga = useMemo(() => geometriaBarriga(md, perfil.corpo), [md, perfil.corpo])
  // a "pança": uma bola achatada dentro da barriga que, ao puxar o ar, sai pela frente
  const panca = useMemo(() => {
    const y0 = md.troncoBase - 0.1
    const v = 0.33
    const r = raioTronco(perfil.corpo, v) * md.largura
    return { y: y0 + v * (md.troncoTopo - y0), r }
  }, [md, perfil.corpo])
  const pancaRef = useRef<Mesh>(null)
  const cintura = useMemo(() => geometriaCintura(md, perfil.corpo), [md, perfil.corpo])
  const saia = useMemo(() => {
    const topo = md.largura * 0.72
    const g = new CylinderGeometry(topo, topo * 1.5, 0.5, 40, 1, true)
    g.scale(1, 1, 0.72)
    return g
  }, [md])
  useEffect(
    () => () => {
      tronco.dispose()
      barriga.dispose()
      cintura.dispose()
      saia.dispose()
    },
    [tronco, barriga, cintura, saia],
  )
  const bracos = useRef<Group>(null)
  const ultimo = useRef(-1)
  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    // só recalcula quando o enchimento muda de verdade (economiza no celular)
    if (Math.abs(e - ultimo.current) > 0.002 || tronco.userData.e === undefined) {
      tronco.userData.e = e
      respirarTronco(tronco, baseTronco, md, e)
      ultimo.current = e
    }
    // a pança cresce para a frente e um pouco para os lados (o contorno acompanha)
    if (pancaRef.current) {
      pancaRef.current.scale.set(0.94 + 0.3 * e, 0.6 + 0.12 * e, 0.5 + 0.75 * e)
    }
    // os ombros sobem um pouquinho junto com o peito
    if (bracos.current) bracos.current.position.y = 0.03 * e
  })

  const ombroX = md.largura * (menina ? 0.82 : 0.9)
  const quadrilX = md.largura * (menina ? 0.36 : 0.33)

  return (
    <group>
      <Perna lado={-1} md={md} m={m} quadrilX={quadrilX} menina={menina} />
      <Perna lado={1} md={md} m={m} quadrilX={quadrilX} menina={menina} />
      <group ref={bracos}>
        <Braco lado={-1} md={md} m={m} ombroX={ombroX} />
        <Braco lado={1} md={md} m={m} ombroX={ombroX} />
      </group>

      {/* cintura opaca: bermuda (menino) ou saia (menina) */}
      <mesh geometry={cintura} material={menina ? m.saia : m.bermuda}>
        <Outlines thickness={3.5} color={NOITE} />
      </mesh>

      {/* saia (menina) */}
      {menina && (
        <mesh geometry={saia} material={m.saia} position={[0, md.quadril - 0.12, 0]}>
          <Outlines thickness={3.5} color={NOITE} />
        </mesh>
      )}

      {/* órgãos ficam entre o corpo e o vidro do tronco */}
      {children}

      {/* barriga de "tecido": é ela que enche e esvazia, bem visível. No caminho
          do ar some, para dar para ver o diafragma pelo vidro. */}
      {!caminho && (
        <>
          <mesh geometry={barriga} material={m.roupa}>
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
          <mesh ref={pancaRef} material={m.roupa} position={[0, panca.y, 0.0]} scale={[0.94, 0.6, 0.5]}>
            <sphereGeometry args={[panca.r, 40, 28]} />
            <Outlines thickness={3.5} color={NOITE} />
          </mesh>
        </>
      )}

      {/* tronco (blusa/camiseta de "vidro") e pescoço */}
      <mesh geometry={tronco} material={m.vidroTronco} renderOrder={5} />
      <mesh material={m.vidroPescoco} position={[0, md.troncoTopo + 0.13, 0.0]} renderOrder={5}>
        <cylinderGeometry args={[0.1, 0.12, 0.36, 24, 1, true]} />
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
      const r = 0.06 + (i % 3) * 0.025
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
          <sphereGeometry args={[0.2, 32, 24]} />
          {/* fundo da lupa: só a parte de trás da esfera, para não cobrir os saquinhos */}
          <meshBasicMaterial color="#ffffff" side={BackSide} />
          <Outlines thickness={3.5} color={NOITE} />
        </mesh>
        <group ref={ref}>
          {bolhas.map((p, i) => (
            <mesh key={i} position={p} material={mats[i % 2]}>
              <sphereGeometry args={[0.042, 18, 14]} />
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
        <sphereGeometry args={[0.025, 12, 10]} />
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

      {destaque === 'alveolos' && alvo && rotulo && <AlveolosAmpliados posicao={rotulo.clone().add(new Vector3(0, -0.4, 0))} origem={alvo} />}
      {destaque && alvo && rotulo && <Rotulo parte={destaque} posicao={rotulo} alvo={alvo} />}
    </group>
  )
}
