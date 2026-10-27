import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3, type Texture } from 'three'
import { ETAPAS, ROTULO_PARTE, type Parte } from '../conteudo/etapas'
import { useApp } from '../store'
import { BASE_Y, ESCALA, PONTOS_ZA, paraCena } from './anatomia'
import { COR } from './cores'
import {
  ALTURA_BASE,
  alturaPulo,
  aplicarTom,
  balancoOps,
  materialPele,
  materialVidro,
  useCorpo,
  useOrgaos,
  usePerfilAtual,
  type Orgao,
  type ParteCorpo,
} from './Corpo'
import { lerPulso } from './enchimento'
import { CORES_CABELO, TONS } from './perfil'

/** Cor de cada órgão, e qual parte do conteúdo ele representa (para destacar). */
const ORGAOS: { peca: Orgao; parte: Parte; cor: string }[] = [
  { peca: 'CavidadeNasal', parte: 'nariz', cor: '#f4a3ad' },
  { peca: 'Faringe', parte: 'faringe', cor: '#f08f9c' },
  { peca: 'Laringe', parte: 'laringe', cor: '#d8ecf7' },
  { peca: 'Traqueia', parte: 'traqueia', cor: '#d8ecf7' },
  { peca: 'Bronquios', parte: 'bronquios', cor: '#c3e1f2' },
  { peca: 'PulmaoDireito', parte: 'pulmoes', cor: '#f2909b' },
  { peca: 'PulmaoEsquerdo', parte: 'pulmoes', cor: '#f2909b' },
  { peca: 'Diafragma', parte: 'diafragma', cor: '#c9606d' },
]

const PECAS_CORPO: ParteCorpo[] = [
  'PeleCabeca',
  'PeleTronco',
  'PeleMembros',
  'Olhos',
  'Sobrancelhas',
  'Cilios',
  'Cabelo',
  'CabeloLongo',
  'Top',
  'Bermuda',
]

function useDestaques(): Set<Parte> | null {
  const tela = useApp((s) => s.tela)
  const etapa = useApp((s) => s.etapa)
  return useMemo(() => (tela === 'caminho' ? new Set(ETAPAS[etapa].partes) : null), [tela, etapa])
}

function Rotulo({ parte, posicao }: { parte: Parte; posicao: Vector3 }) {
  return (
    <Html position={posicao} center distanceFactor={2.6} zIndexRange={[10, 0]} pointerEvents="none">
      <span className="rotulo3d">{ROTULO_PARTE[parte]}</span>
    </Html>
  )
}

/** Saquinhos de ar ampliados (só na etapa dos alvéolos). */
function AlveolosAmpliados({ posicao }: { posicao: Vector3 }) {
  const ref = useRef<Group>(null)
  const bolhas = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = 0.05 + (i % 3) * 0.025
      out.push([Math.cos(a) * r, Math.sin(a * 1.3) * r * 0.9, Math.sin(a) * r * 0.6])
    }
    return out
  }, [])
  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    ref.current?.scale.setScalar(0.85 + 0.25 * e)
  })
  return (
    <group position={posicao}>
      <mesh position={[-0.2, 0.08, -0.08]} rotation={[0, 0, 1.2]}>
        <cylinderGeometry args={[0.009, 0.009, 0.3, 8]} />
        <meshStandardMaterial color={COR.noite} transparent opacity={0.5} />
      </mesh>
      <group ref={ref}>
        {bolhas.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.04, 18, 18]} />
            <meshStandardMaterial
              color={i % 2 ? COR.inspira : COR.expira}
              emissive={COR.destaque}
              emissiveIntensity={0.15}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
      <mesh>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

export function Personagem() {
  const destaques = useDestaques()
  const perfil = usePerfilAtual()
  const corpo = useCorpo(perfil)
  const orgaos = useOrgaos(corpo.mapa)
  const raiz = useRef<Group>(null)
  const refs = useRef<Partial<Record<Orgao, Mesh | null>>>({})

  /** corpos de qualquer altura aparecem do mesmo tamanho na tela */
  const escala = (ESCALA * ALTURA_BASE) / corpo.altura

  // no caminho do ar a cabeça também fica "de vidro", para ver o nariz e a faringe por dentro
  const cabecaVidro = !!destaques
  const tom = TONS[perfil.pele] ?? TONS[2]

  const mats = useMemo(() => {
    const orig = (p: ParteCorpo) => corpo.malhas[p].material as MeshStandardMaterial
    const cabelo = (p: ParteCorpo) => {
      const m = orig(p).clone()
      // cabelo é feito de "cartões" com transparência: com antialias, o alphaToCoverage suaviza a borda
      m.alphaToCoverage = true
      m.alphaTest = 0.2
      return m
    }
    const top = orig('Top').clone()
    top.transparent = true
    top.opacity = 0.45
    top.depthWrite = false
    return {
      texturaMedia: orig('PeleCabeca').map as Texture | null,
      pele: materialPele(orig('PeleCabeca')),
      vidroTronco: materialVidro(TONS[2].amostra, 0.24),
      vidroCabeca: materialVidro(TONS[2].amostra, 0.24),
      olhos: orig('Olhos').clone(),
      sobrancelhas: orig('Sobrancelhas').clone(),
      cilios: orig('Cilios').clone(),
      cabelo: cabelo('Cabelo'),
      cabeloLongo: cabelo('CabeloLongo'),
      top,
      bermuda: orig('Bermuda'),
      orgaos: Object.fromEntries(
        ORGAOS.map((o) => [o.peca, new MeshStandardMaterial({ color: o.cor, roughness: 0.5, transparent: true, side: DoubleSide })]),
      ) as Record<Orgao, MeshStandardMaterial>,
    }
  }, [corpo.malhas])

  // cópias das malhas do MakeHuman (dividem a geometria; cada uma com o seu material)
  const clones = useMemo(() => {
    const out = {} as Record<ParteCorpo, Mesh>
    for (const p of PECAS_CORPO) {
      const c = corpo.malhas[p].clone()
      c.frustumCulled = false // os morphs mudam o tamanho, a caixa original não vale mais
      out[p] = c
    }
    return out
  }, [corpo.malhas])

  // personalização: forma do corpo, roupa, cabelo, tom de pele
  useEffect(() => {
    for (const p of PECAS_CORPO) clones[p].morphTargetInfluences = corpo.pesos.slice()
    clones.Top.visible = perfil.corpo === 'feminino'
    clones.Cabelo.visible = perfil.cabelo === 'curto'
    clones.CabeloLongo.visible = perfil.cabelo === 'longo'
    const [r, g, b] = (CORES_CABELO[perfil.corCabelo] ?? CORES_CABELO[1]).fator
    mats.cabelo.color.setRGB(r, g, b)
    mats.cabeloLongo.color.setRGB(r, g, b)
    mats.sobrancelhas.color.setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b))
    aplicarTom([mats.pele], mats.texturaMedia, perfil.pele)
    mats.vidroTronco.color.set(tom.amostra)
    mats.vidroCabeca.color.set(tom.amostra)
  }, [clones, corpo.pesos, perfil, mats, tom])

  // materiais de cada peça (a cabeça vira vidro no caminho do ar)
  useEffect(() => {
    const m: Record<ParteCorpo, MeshStandardMaterial> = {
      PeleCabeca: cabecaVidro ? mats.vidroCabeca : mats.pele,
      PeleTronco: mats.vidroTronco,
      PeleMembros: mats.pele,
      Olhos: mats.olhos,
      Sobrancelhas: mats.sobrancelhas,
      Cilios: mats.cilios,
      Cabelo: mats.cabelo,
      CabeloLongo: mats.cabeloLongo,
      Top: mats.top,
      Bermuda: mats.bermuda,
    }
    for (const p of PECAS_CORPO) clones[p].material = m[p]
    clones.PeleTronco.renderOrder = 5
    clones.Top.renderOrder = 6
    clones.PeleCabeca.renderOrder = cabecaVidro ? 6 : 0
    mats.top.opacity = cabecaVidro ? 0.25 : 0.45
    // cabelo e olhos somem um pouco quando a cabeça fica transparente
    for (const k of [mats.cabelo, mats.cabeloLongo, mats.olhos, mats.sobrancelhas, mats.cilios]) {
      k.opacity = cabecaVidro ? 0.15 : 1
      k.transparent = cabecaVidro || k === mats.sobrancelhas || k === mats.cilios
      k.depthWrite = !cabecaVidro
      k.needsUpdate = true
    }
  }, [clones, mats, cabecaVidro])

  // destaque de cada órgão conforme a etapa do caminho do ar
  useEffect(() => {
    for (const o of ORGAOS) {
      const mat = mats.orgaos[o.peca]
      const destacado = !!destaques?.has(o.parte)
      const esmaecido = !!destaques && !destacado
      mat.emissive.set(destacado ? COR.destaque : '#000000')
      mat.emissiveIntensity = destacado ? 0.4 : 0
      // o diafragma fica meio transparente para não tampar a base dos pulmões
      const base = o.peca === 'Diafragma' && !destacado ? 0.6 : 1
      mat.opacity = esmaecido ? 0.25 : base
      mat.depthWrite = !esmaecido && base === 1
      mat.needsUpdate = true
    }
  }, [destaques, mats])

  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    const r = refs.current
    // pulmões enchem em volta do próprio centro
    for (const p of ['PulmaoDireito', 'PulmaoEsquerdo'] as const) {
      r[p]?.scale.set(1 + 0.07 * e, 1 + 0.06 * e, 1 + 0.09 * e)
    }
    // o diafragma desce quando o ar entra
    const diaf = r.Diafragma
    if (diaf) diaf.position.y = orgaos.Diafragma.centro.y - 0.022 * e
    if (raiz.current) {
      raiz.current.position.y = -0.55 + alturaPulo()
      raiz.current.rotation.z = balancoOps()
    }
  })

  // posições (em unidades do personagem) para rótulos e alvéolos
  const local = (p: Vector3) => new Vector3(p.x * escala, BASE_Y + p.y * escala, p.z * escala)
  const naCena = (p: Vector3, dx: number, dy: number, dz: number) => paraCena(p, corpo.mapa, escala).add(new Vector3(dx, dy, dz))
  const pulmaoE = local(orgaos.PulmaoEsquerdo.centro)
  const posRotulo: Record<Parte, Vector3> = {
    nariz: naCena(PONTOS_ZA.cavidadeNasal, 0.3, 0.12, 0.15),
    faringe: naCena(PONTOS_ZA.faringe, -0.34, 0, 0),
    laringe: naCena(PONTOS_ZA.laringe, 0.3, -0.04, 0.1),
    traqueia: naCena(PONTOS_ZA.meioTraqueia, 0.3, 0, 0.1),
    bronquios: naCena(PONTOS_ZA.carina, -0.4, -0.06, 0.1),
    pulmoes: pulmaoE.clone().add(new Vector3(0.38, 0.12, 0.1)),
    alveolos: pulmaoE.clone().add(new Vector3(0.55, -0.2, 0.3)),
    diafragma: local(orgaos.Diafragma.centro).add(new Vector3(0, -0.14, 0.38)),
  }

  return (
    <group ref={raiz} position={[0, -0.55, 0]}>
      <group position={[0, BASE_Y, 0]} scale={escala}>
        {PECAS_CORPO.map((p) => (
          <primitive key={p} object={clones[p]} />
        ))}
        {ORGAOS.map(({ peca }) => (
          <mesh
            key={peca}
            ref={(el) => {
              refs.current[peca] = el
            }}
            geometry={orgaos[peca].geometria}
            position={orgaos[peca].centro}
            material={mats.orgaos[peca]}
            // nariz e faringe ficam dentro da cabeça: só aparecem quando ela está "de vidro"
            visible={cabecaVidro || (peca !== 'CavidadeNasal' && peca !== 'Faringe')}
          />
        ))}
      </group>

      {destaques?.has('alveolos') && <AlveolosAmpliados posicao={posRotulo.alveolos.clone().add(new Vector3(-0.15, 0.15, 0))} />}
      {destaques && [...destaques].map((p) => <Rotulo key={p} parte={p} posicao={posRotulo[p]} />)}
    </group>
  )
}
