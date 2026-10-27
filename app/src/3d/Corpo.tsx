import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group, Mesh } from 'three'
import { useApp } from '../store'
import { COR } from './cores'
import { lerPulso } from './enchimento'

/** Há quanto tempo (s) aconteceu a última reação, e qual foi. */
function reacaoAtual(): { tipo: 'feliz' | 'uau' | 'ops'; idade: number } | null {
  const r = useApp.getState().reacao
  if (!r) return null
  const idade = (performance.now() - r.em) / 1000
  return idade < 1.6 ? { tipo: r.tipo, idade } : null
}

const suav = (atual: number, alvo: number, dt: number, vel = 10) => atual + (alvo - atual) * Math.min(1, dt * vel)

/**
 * Cabeça do personagem: pisca, olha para o mouse, muda a boca conforme a
 * fase da respiração e reage quando o jogador acerta (ou erra) o ritmo.
 */
export function Cabeca({ transparente }: { transparente: boolean }) {
  const grupo = useRef<Group>(null)
  const olhos = useRef<Group>(null)
  const pupilas = useRef<Group>(null)
  const felizes = useRef<Group>(null)
  const sorriso = useRef<Mesh>(null)
  const bocaO = useRef<Mesh>(null)
  const bochechas = useRef<Group>(null)
  const sobrancelhas = useRef<Group>(null)
  const proxPiscada = useRef(2)

  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime
    const pulso = lerPulso(t)
    const r = reacaoAtual()
    const feliz = r?.tipo === 'feliz' || r?.tipo === 'uau'

    // piscar de vez em quando (e olhos "^ ^" quando feliz)
    if (t > proxPiscada.current + 0.14) proxPiscada.current = t + 2.2 + Math.random() * 3
    const piscando = t > proxPiscada.current
    if (olhos.current) olhos.current.scale.y = suav(olhos.current.scale.y, piscando || feliz ? 0.08 : 1, dt, 30)
    if (felizes.current) felizes.current.visible = feliz

    // pupilas seguem o mouse
    if (pupilas.current) {
      pupilas.current.position.x = suav(pupilas.current.position.x, pointer.x * 0.025, dt, 6)
      pupilas.current.position.y = suav(pupilas.current.position.y, pointer.y * 0.02, dt, 6)
    }

    // boca: "o" ao soltar o ar guiado, bochechas cheias ao segurar
    const soltando = pulso.guiado && pulso.fase === 'expirar'
    const segurando = pulso.guiado && pulso.fase === 'segurar'
    if (sorriso.current) {
      const alvo = soltando || segurando ? 0.001 : feliz ? 1.45 : r?.tipo === 'ops' ? 0.6 : 1
      const s = suav(sorriso.current.scale.x, alvo, dt)
      sorriso.current.scale.set(s, r?.tipo === 'ops' ? -0.6 : s, s)
    }
    if (bocaO.current) {
      const s = suav(bocaO.current.scale.x, soltando ? 1 : 0.001, dt)
      bocaO.current.scale.set(s, s * (0.9 + 0.2 * Math.sin(t * 6)), s)
    }
    if (bochechas.current) {
      const s = suav(bochechas.current.scale.x, segurando ? 1.6 : feliz ? 1.25 : 1, dt)
      bochechas.current.scale.setScalar(s)
    }
    if (sobrancelhas.current) sobrancelhas.current.position.y = suav(sobrancelhas.current.position.y, feliz || r?.tipo === 'uau' ? 0.05 : r?.tipo === 'ops' ? -0.015 : 0, dt)

    if (grupo.current) {
      grupo.current.position.y = 0.025 * pulso.enchimento
      grupo.current.rotation.z = Math.sin(t * 0.6) * 0.04
      grupo.current.rotation.y = suav(grupo.current.rotation.y, pointer.x * 0.25, dt, 3)
      grupo.current.rotation.x = suav(grupo.current.rotation.x, -pointer.y * 0.12, dt, 3)
    }
  })

  const op = transparente ? 0.55 : 1
  return (
    <group ref={grupo}>
      <group position={[0, 2.05, 0]}>
        {/* cabeça */}
        <mesh>
          <sphereGeometry args={[0.6, 48, 48]} />
          <meshStandardMaterial color={COR.pele} roughness={0.65} transparent opacity={op} depthWrite={!transparente} />
        </mesh>
        {/* orelhas */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.58 * s, -0.02, 0]} scale={[0.5, 1, 0.8]}>
            <sphereGeometry args={[0.13, 20, 20]} />
            <meshStandardMaterial color={COR.pele} roughness={0.65} transparent opacity={op} depthWrite={!transparente} />
          </mesh>
        ))}
        {/* cabelo + topete */}
        <mesh position={[0, 0.04, -0.02]} rotation={[-0.35, 0, 0]}>
          <sphereGeometry args={[0.63, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
          <meshStandardMaterial color={COR.noite} roughness={0.75} transparent opacity={transparente ? 0.45 : 1} depthWrite={!transparente} />
        </mesh>
        {/* franjinha */}
        {[-0.16, 0.02, 0.2].map((x, i) => (
          <mesh key={x} position={[x, 0.42, 0.36]} rotation={[0.9, 0, (i - 1) * -0.35]} scale={[1, 1.4, 0.7]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={COR.noite} roughness={0.75} transparent opacity={transparente ? 0.45 : 1} depthWrite={!transparente} />
          </mesh>
        ))}

        {/* olhos */}
        <group ref={olhos} position={[0, 0.12, 0.5]}>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={[1, 1.15, 0.55]}>
              <sphereGeometry args={[0.1, 24, 24]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
          ))}
          <group ref={pupilas}>
            {[-0.2, 0.2].map((x) => (
              <group key={x} position={[x, -0.005, 0.05]}>
                <mesh scale={[1, 1.1, 0.6]}>
                  <sphereGeometry args={[0.062, 20, 20]} />
                  <meshStandardMaterial color={COR.noite} roughness={0.2} />
                </mesh>
                <mesh position={[0.022, 0.03, 0.035]}>
                  <sphereGeometry args={[0.017, 10, 10]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
        </group>
        {/* olhos felizes ^ ^ */}
        <group ref={felizes} position={[0, 0.12, 0.56]} visible={false}>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, -0.02, 0]}>
              <torusGeometry args={[0.065, 0.017, 8, 20, Math.PI]} />
              <meshStandardMaterial color={COR.noite} />
            </mesh>
          ))}
        </group>
        {/* sobrancelhas */}
        <group ref={sobrancelhas}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.2 * s, 0.29, 0.53]} rotation={[0, 0, Math.PI / 2 + 0.18 * s]}>
              <capsuleGeometry args={[0.018, 0.1, 4, 8]} />
              <meshStandardMaterial color={COR.noite} />
            </mesh>
          ))}
        </group>

        {/* nariz */}
        <mesh position={[0, -0.04, 0.6]}>
          <sphereGeometry args={[0.085, 24, 24]} />
          <meshStandardMaterial color={COR.folegoEscuro} roughness={0.6} />
        </mesh>
        {/* bochechas */}
        <group ref={bochechas} position={[0, -0.1, 0.44]}>
          {[-0.33, 0.33].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={[1, 0.62, 0.45]}>
              <sphereGeometry args={[0.085, 16, 16]} />
              <meshStandardMaterial color={COR.folegoEscuro} transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
        {/* boca: sorriso e "o" */}
        <mesh ref={sorriso} position={[0, -0.18, 0.555]} rotation={[0.25, 0, Math.PI]}>
          <torusGeometry args={[0.1, 0.022, 10, 24, Math.PI]} />
          <meshStandardMaterial color={COR.noite} />
        </mesh>
        <mesh ref={bocaO} position={[0, -0.21, 0.56]} scale={0.001}>
          <torusGeometry args={[0.045, 0.02, 10, 24]} />
          <meshStandardMaterial color={COR.noite} />
        </mesh>
      </group>
    </group>
  )
}

/** Pulinho de comemoração (aplicado ao personagem inteiro) */
export function alturaPulo(): number {
  const r = reacaoAtual()
  if (!r || r.tipo === 'ops') return 0
  return Math.max(0, Math.sin(Math.min(1, r.idade / 0.55) * Math.PI)) * 0.22
}

/** Braços com mãos (acena na tela inicial e comemora acertos), pernas e tênis. */
export function Membros() {
  const bracoD = useRef<Group>(null)
  const bracoE = useRef<Group>(null)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const { tela } = useApp.getState()
    const pulso = lerPulso(t)
    const r = reacaoAtual()
    const comemora = r && r.tipo !== 'ops'
    // aceno de oi a cada ~6 s na tela inicial
    const ciclo = t % 6
    const acenando = tela === 'inicio' && ciclo < 1.6
    const sobe = 0.025 * pulso.enchimento

    if (bracoE.current) {
      const alvo = comemora ? 2.6 : acenando ? 2.5 + Math.sin(t * 10) * 0.35 : 0.16 + Math.sin(t * 1.3) * 0.04
      bracoE.current.rotation.z = suav(bracoE.current.rotation.z, alvo, dt, 8)
      bracoE.current.position.y = 0.95 + sobe
    }
    if (bracoD.current) {
      const alvo = comemora ? -2.6 : -0.16 - Math.sin(t * 1.3 + 1) * 0.04
      bracoD.current.rotation.z = suav(bracoD.current.rotation.z, alvo, dt, 8)
      bracoD.current.position.y = 0.95 + sobe
    }
  })

  return (
    <group>
      {/* braços: pivô no ombro */}
      {([
        [-1, bracoD],
        [1, bracoE],
      ] as const).map(([s, ref]) => (
        <group key={s} ref={ref} position={[0.66 * s, 0.95, 0]} rotation={[0, 0, 0.16 * s]}>
          <mesh position={[0, -0.42, 0]}>
            <capsuleGeometry args={[0.14, 0.6, 8, 24]} />
            <meshStandardMaterial color={COR.pele} roughness={0.65} />
          </mesh>
          {/* manga da camiseta */}
          <mesh position={[0, -0.08, 0]}>
            <capsuleGeometry args={[0.17, 0.18, 8, 24]} />
            <meshStandardMaterial color={COR.expira} roughness={0.8} />
          </mesh>
          {/* mão */}
          <mesh position={[0, -0.86, 0.02]}>
            <sphereGeometry args={[0.16, 20, 20]} />
            <meshStandardMaterial color={COR.pele} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* gola e barra da camiseta (o peito fica "de vidro" para ver os pulmões) */}
      <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.04, 12, 40]} />
        <meshStandardMaterial color={COR.expira} roughness={0.8} />
      </mesh>
      {/* bermuda: cobre a parte de baixo do tronco */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.715, 48, 16, 0, Math.PI * 2, 2.22, Math.PI - 2.22]} />
        <meshStandardMaterial color={COR.noite} roughness={0.85} />
      </mesh>
      {/* pernas e tênis */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.26 * s, -0.78, 0]}>
          <mesh>
            <capsuleGeometry args={[0.13, 0.32, 8, 20]} />
            <meshStandardMaterial color={COR.pele} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.3, 0.08]} scale={[1, 0.6, 1.5]}>
            <sphereGeometry args={[0.17, 24, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.36, 0.08]} scale={[1.02, 0.25, 1.52]}>
            <sphereGeometry args={[0.17, 24, 12]} />
            <meshStandardMaterial color={COR.inspira} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
