import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Group, Mesh, MeshStandardMaterial } from 'three'
import { ETAPAS, ROTULO_PARTE, type Parte } from '../conteudo/etapas'
import { useApp } from '../store'
import { BASE_Y, ESCALA } from './anatomia'
import { COR } from './cores'
import { alturaPulo, balancoOps, materiaisOlhos, materialPeleReal, materialVidro, usePecasModelo, type ParteModelo } from './Corpo'
import { lerPulso } from './enchimento'

const PELE = '#e9b597'
const BERMUDA = '#1f2547'

/** Cor de cada órgão, e qual parte do conteúdo ele representa (para destacar). */
const ORGAOS: { peca: ParteModelo; parte: Parte; cor: string }[] = [
  { peca: 'CavidadeNasal', parte: 'nariz', cor: '#f4a3ad' },
  { peca: 'Faringe', parte: 'faringe', cor: '#f08f9c' },
  { peca: 'Laringe', parte: 'laringe', cor: '#d8ecf7' },
  { peca: 'Traqueia', parte: 'traqueia', cor: '#d8ecf7' },
  { peca: 'Bronquios', parte: 'bronquios', cor: '#c3e1f2' },
  { peca: 'PulmaoDireito', parte: 'pulmoes', cor: '#f2909b' },
  { peca: 'PulmaoEsquerdo', parte: 'pulmoes', cor: '#f2909b' },
  { peca: 'Diafragma', parte: 'diafragma', cor: '#c9606d' },
]

function useDestaques(): Set<Parte> | null {
  const tela = useApp((s) => s.tela)
  const etapa = useApp((s) => s.etapa)
  return useMemo(() => (tela === 'caminho' ? new Set(ETAPAS[etapa].partes) : null), [tela, etapa])
}

function Rotulo({ parte, posicao }: { parte: Parte; posicao: [number, number, number] }) {
  return (
    <Html position={posicao} center distanceFactor={2.6} zIndexRange={[10, 0]} pointerEvents="none">
      <span className="rotulo3d">{ROTULO_PARTE[parte]}</span>
    </Html>
  )
}

/** Posição dos rótulos, em unidades locais do personagem (ao lado de cada órgão). */
const POS_ROTULO: Record<Parte, [number, number, number]> = {
  nariz: [0.3, 1.98, 0.38],
  faringe: [-0.34, 1.84, 0.02],
  laringe: [0.3, 1.66, 0.12],
  traqueia: [0.3, 1.45, 0.1],
  bronquios: [-0.4, 1.3, 0.1],
  pulmoes: [0.56, 1.22, 0.1],
  alveolos: [0.78, 0.98, 0.36],
  diafragma: [0, 0.68, 0.42],
}

/** Saquinhos de ar ampliados (só na etapa dos alvéolos). */
function AlveolosAmpliados() {
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
    <group position={[0.62, 1.12, 0.32]}>
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
  const pecas = usePecasModelo()
  const raiz = useRef<Group>(null)
  const refs = useRef<Partial<Record<ParteModelo, Mesh | null>>>({})

  // no caminho do ar a cabeça também fica "de vidro", para ver o nariz e a faringe por dentro
  const cabecaVidro = !!destaques

  const mats = useMemo(() => {
    const pele = materialPeleReal(PELE)
    const olhos = materiaisOlhos()
    return {
      pele,
      ...olhos,
      vidroTronco: materialVidro('#e3a688', 0.3),
      vidroCabeca: materialVidro('#e3a688', 0.24),
      bermuda: new MeshStandardMaterial({ color: BERMUDA, roughness: 0.85 }),
      orgaos: Object.fromEntries(
        ORGAOS.map((o) => [
          o.peca,
          new MeshStandardMaterial({ color: o.cor, roughness: 0.5, transparent: true, side: DoubleSide }),
        ]),
      ) as Record<string, MeshStandardMaterial>,
    }
  }, [])

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
    // cabelo e olhos somem um pouco quando a cabeça fica transparente
    for (const m of [mats.cabelo, mats.esclera, mats.iris]) {
      m.opacity = cabecaVidro ? 0.18 : 1
      m.depthWrite = !cabecaVidro
    }
    mats.cornea.visible = !cabecaVidro
  }, [destaques, cabecaVidro, mats])

  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    const r = refs.current
    // pulmões enchem em volta do próprio centro
    for (const p of ['PulmaoDireito', 'PulmaoEsquerdo'] as const) {
      r[p]?.scale.set(1 + 0.07 * e, 1 + 0.06 * e, 1 + 0.09 * e)
    }
    // o diafragma desce quando o ar entra
    const diaf = r.Diafragma
    if (diaf) diaf.position.y = pecas.Diafragma.centro.y - 0.022 * e
    // o peito expande um pouco para frente e para os lados
    r.PeleTronco?.scale.set(1 + 0.02 * e, 1 + 0.004 * e, 1 + 0.05 * e)
    if (raiz.current) {
      raiz.current.position.y = -0.55 + alturaPulo()
      raiz.current.rotation.z = balancoOps()
    }
  })

  const material = (p: ParteModelo) => {
    switch (p) {
      case 'PeleTronco':
        return mats.vidroTronco
      case 'PeleCabeca':
        return cabecaVidro ? mats.vidroCabeca : mats.pele
      case 'PeleMembros':
        return mats.pele
      case 'Cabelo':
        return mats.cabelo
      case 'Esclera':
        return mats.esclera
      case 'Iris':
        return mats.iris
      case 'Cornea':
        return mats.cornea
      case 'Bermuda':
        return mats.bermuda
      default:
        return mats.orgaos[p]
    }
  }

  // ordem de desenho: órgãos, depois a pele opaca, por último a pele de vidro
  const ordem: Partial<Record<ParteModelo, number>> = { PeleTronco: 5, PeleCabeca: cabecaVidro ? 6 : 0, Cornea: 7 }

  return (
    <group ref={raiz} position={[0, -0.55, 0]}>
      <group position={[0, BASE_Y, 0]} scale={ESCALA}>
        {(Object.keys(pecas) as ParteModelo[]).map((p) => (
          <mesh
            key={p}
            ref={(el) => {
              refs.current[p] = el
            }}
            geometry={pecas[p].geometria}
            position={pecas[p].centro}
            material={material(p)}
            renderOrder={ordem[p] ?? 0}
          />
        ))}
      </group>

      {destaques?.has('alveolos') && <AlveolosAmpliados />}
      {destaques && [...destaques].map((p) => <Rotulo key={p} parte={p} posicao={POS_ROTULO[p]} />)}
    </group>
  )
}
