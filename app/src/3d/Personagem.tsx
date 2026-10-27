import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { DoubleSide, Group, Mesh, TubeGeometry, type CatmullRomCurve3 } from 'three'
import { ETAPAS, ROTULO_PARTE, type Parte } from '../conteudo/etapas'
import { useApp } from '../store'
import { CENTRO_PULMAO, curvaBronquio, curvaSuperior, curvaTraqueia, ramos } from './anatomia'
import { COR } from './cores'
import { alturaPulo, Cabeca, geometriaTronco, Membros, PELE } from './Corpo'
import { lerPulso } from './enchimento'

function useDestaques(): Set<Parte> | null {
  const tela = useApp((s) => s.tela)
  const etapa = useApp((s) => s.etapa)
  return useMemo(() => (tela === 'caminho' ? new Set(ETAPAS[etapa].partes) : null), [tela, etapa])
}

function Tubo({
  curva,
  raio,
  destacado,
  esmaecido,
}: {
  curva: CatmullRomCurve3
  raio: number
  destacado: boolean
  esmaecido: boolean
}) {
  const geo = useMemo(() => new TubeGeometry(curva, 48, raio, 14, false), [curva, raio])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={destacado ? COR.destaque : COR.noite}
        emissive={destacado ? COR.destaque : '#000000'}
        emissiveIntensity={destacado ? 0.45 : 0}
        roughness={0.45}
        transparent
        opacity={esmaecido ? 0.35 : 1}
      />
    </mesh>
  )
}

function Rotulo({ parte, posicao }: { parte: Parte; posicao: [number, number, number] }) {
  return (
    <Html position={posicao} center distanceFactor={2.6} zIndexRange={[10, 0]} pointerEvents="none">
      <span className="rotulo3d">{ROTULO_PARTE[parte]}</span>
    </Html>
  )
}

const POS_ROTULO: Record<Parte, [number, number, number]> = {
  nariz: [0.38, 2.02, 0.66],
  faringe: [-0.5, 1.86, 0.05],
  laringe: [0.42, 1.5, 0.1],
  traqueia: [0.42, 1.12, 0.1],
  bronquios: [-0.62, 0.8, 0.15],
  pulmoes: [0.95, 0.55, 0.1],
  alveolos: [1.25, 0.12, 0.35],
  diafragma: [0, -0.42, 0.75],
}

export function Personagem() {
  const destaques = useDestaques()
  const d = (p: Parte) => !!destaques?.has(p)
  const esm = (p: Parte) => !!destaques && !destaques.has(p)

  const pulmaoD = useRef<Mesh>(null)
  const pulmaoE = useRef<Mesh>(null)
  const tronco = useRef<Mesh>(null)
  const diafragma = useRef<Mesh>(null)
  const raiz = useRef<Group>(null)
  const alveolos = useRef<Group>(null)

  const geoTronco = useMemo(() => geometriaTronco(), [])
  const brD = useMemo(() => curvaBronquio(-1), [])
  const brE = useMemo(() => curvaBronquio(1), [])
  const ramosD = useMemo(() => ramos(-1), [])
  const ramosE = useMemo(() => ramos(1), [])

  // partes do tubo superior: nariz+cavidade | faringe | laringe — desenhadas como 3 trechos
  const trechosSuperiores = useMemo(() => {
    const pts = curvaSuperior.getSpacedPoints(60)
    const fatia = (a: number, b: number) =>
      new (curvaSuperior.constructor as typeof CatmullRomCurve3)(pts.slice(a, b + 1))
    return { nariz: fatia(0, 26), faringe: fatia(26, 50), laringe: fatia(50, 60) }
  }, [])

  const bolhasAlveolos = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      const r = 0.07 + (i % 3) * 0.035
      out.push([Math.cos(a) * r, Math.sin(a * 1.3) * r * 0.9, Math.sin(a) * r * 0.6])
    }
    return out
  }, [])

  useFrame(({ clock }) => {
    const { enchimento: e } = lerPulso(clock.elapsedTime)
    const sp = 1 + 0.13 * e
    pulmaoD.current?.scale.set(0.3 * sp, 0.58 * (1 + 0.08 * e), 0.28 * sp)
    pulmaoE.current?.scale.set(0.3 * sp, 0.58 * (1 + 0.08 * e), 0.28 * sp)
    tronco.current?.scale.set(1 + 0.04 * e, 1 + 0.01 * e, 1 + 0.07 * e)
    if (diafragma.current) diafragma.current.position.y = -0.2 - 0.13 * e
    if (raiz.current) raiz.current.position.y = -0.55 + alturaPulo()
    if (alveolos.current) alveolos.current.scale.setScalar(0.85 + 0.25 * e)
  })

  const matPulmao = (cor: string, destacado: boolean, esmaecido: boolean) => (
    <meshPhysicalMaterial
      color={cor}
      emissive={destacado ? cor : '#000000'}
      emissiveIntensity={destacado ? 0.35 : 0}
      roughness={0.55}
      clearcoat={0.3}
      transparent
      opacity={esmaecido ? 0.3 : 0.82}
      depthWrite={false}
    />
  )

  return (
    <group ref={raiz} position={[0, -0.55, 0]}>
      <Cabeca transparente={!!destaques} />

      {/* Pescoço (meio transparente: a laringe e a traqueia passam por dentro) */}
      <mesh position={[0, 1.52, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.42, 32]} />
        <meshStandardMaterial color={PELE} transparent opacity={0.45} depthWrite={false} roughness={0.6} />
      </mesh>

      {/* Tronco com forma humana, "de vidro" cor de pele, para ver por dentro */}
      <mesh ref={tronco} geometry={geoTronco}>
        <meshPhysicalMaterial
          color="#ffd9c4"
          roughness={0.2}
          transmission={0.5}
          thickness={0.3}
          transparent
          opacity={0.3}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      <Membros />

      {/* Vias aéreas superiores */}
      {/* o trecho do nariz só aparece no caminho do ar (com a cabeça transparente) */}
      {destaques && <Tubo curva={trechosSuperiores.nariz} raio={0.038} destacado={d('nariz')} esmaecido={esm('nariz')} />}
      <Tubo curva={trechosSuperiores.faringe} raio={0.055} destacado={d('faringe')} esmaecido={esm('faringe')} />
      <Tubo curva={trechosSuperiores.laringe} raio={0.065} destacado={d('laringe')} esmaecido={esm('laringe')} />

      {/* Traqueia (com anéis) */}
      <Tubo curva={curvaTraqueia} raio={0.06} destacado={d('traqueia')} esmaecido={esm('traqueia')} />
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, 1.36 - i * 0.07, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.068, 0.012, 8, 24]} />
          <meshStandardMaterial
            color={d('traqueia') ? '#FFE2CC' : '#3A4170'}
            transparent
            opacity={esm('traqueia') ? 0.3 : 1}
          />
        </mesh>
      ))}

      {/* Brônquios e bronquíolos */}
      <Tubo curva={brD} raio={0.042} destacado={d('bronquios')} esmaecido={esm('bronquios')} />
      <Tubo curva={brE} raio={0.042} destacado={d('bronquios')} esmaecido={esm('bronquios')} />
      {[...ramosD, ...ramosE].map((c, i) => (
        <Tubo key={i} curva={c} raio={0.018} destacado={d('bronquios')} esmaecido={esm('bronquios')} />
      ))}

      {/* Pulmões (o direito do personagem tem 3 lobos, o esquerdo 2 — aqui estilizados) */}
      <mesh ref={pulmaoD} position={CENTRO_PULMAO.direito} scale={[0.3, 0.58, 0.28]}>
        <sphereGeometry args={[1, 48, 48]} />
        {matPulmao(COR.inspira, d('pulmoes'), esm('pulmoes'))}
      </mesh>
      <mesh ref={pulmaoE} position={CENTRO_PULMAO.esquerdo} scale={[0.3, 0.58, 0.28]}>
        <sphereGeometry args={[1, 48, 48]} />
        {matPulmao(COR.expira, d('pulmoes'), esm('pulmoes'))}
      </mesh>

      {/* Diafragma */}
      <mesh ref={diafragma} position={[0, -0.2, 0]} scale={[0.6, 0.12, 0.4]}>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={d('diafragma') ? COR.destaque : COR.folegoEscuro}
          emissive={d('diafragma') ? COR.destaque : '#000000'}
          emissiveIntensity={d('diafragma') ? 0.35 : 0}
          transparent
          opacity={esm('diafragma') ? 0.18 : d('diafragma') ? 0.8 : 0.4}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Alvéolos ampliados (só na etapa 3) */}
      {d('alveolos') && (
        <group position={[1.15, 0.3, 0.3]}>
          <mesh position={[-0.3, 0.12, -0.12]} rotation={[0, 0, 1.2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
            <meshStandardMaterial color={COR.noite} transparent opacity={0.5} />
          </mesh>
          <group ref={alveolos}>
            {bolhasAlveolos.map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.055, 18, 18]} />
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
            <sphereGeometry args={[0.24, 24, 24]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
          </mesh>
        </group>
      )}

      {destaques && [...destaques].map((p) => <Rotulo key={p} parte={p} posicao={POS_ROTULO[p]} />)}
    </group>
  )
}
