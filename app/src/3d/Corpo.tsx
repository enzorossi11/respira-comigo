import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three'
import { useApp } from '../store'
import { lerPulso } from './enchimento'

/**
 * Personagem com fisionomia humana (estilizado, proporção de adolescente).
 * O tronco é "de vidro" para mostrar as vias aéreas e os pulmões por dentro;
 * cabeça, braços e pernas são de pele.
 *
 * Referências de posição (unidades locais do personagem):
 *  - cabeça: centro (0, 2.05), queixo em ~1.56, topo em ~2.57
 *  - ombros em y ≈ 1.18; quadril em y ≈ -0.62; pés em y ≈ -2.5
 */

export const PELE = '#f1c3a3'
const PELE_SOMBRA = '#e2a98a'
const CABELO = '#3a2a22'
const LABIO = '#c9776b'
const IRIS = '#6b4a2f'
const BERMUDA = '#1f2547'
const TENIS = '#ffffff'
const SOLA = '#2bb5a8'

/** Há quanto tempo (s) aconteceu a última reação, e qual foi. */
function reacaoAtual(): { tipo: 'feliz' | 'uau' | 'ops'; idade: number } | null {
  const r = useApp.getState().reacao
  if (!r) return null
  const idade = (performance.now() - r.em) / 1000
  return idade < 1.6 ? { tipo: r.tipo, idade } : null
}

const suav = (atual: number, alvo: number, dt: number, vel = 10) => atual + (alvo - atual) * Math.min(1, dt * vel)

/** Pulinho de comemoração (aplicado ao personagem inteiro) */
export function alturaPulo(): number {
  const r = reacaoAtual()
  if (!r || r.tipo === 'ops') return 0
  return Math.max(0, Math.sin(Math.min(1, r.idade / 0.55) * Math.PI)) * 0.22
}

/** Perfil do tronco (raio, altura), girado em volta do eixo y e achatado na frente/trás. */
export function geometriaTronco(): LatheGeometry {
  const perfil = [
    [0.001, -0.74],
    [0.36, -0.72],
    [0.56, -0.6],
    [0.58, -0.4],
    [0.57, -0.15],
    [0.66, 0.1],
    [0.76, 0.45],
    [0.8, 0.8],
    [0.82, 1.02],
    [0.74, 1.18],
    [0.52, 1.3],
    [0.24, 1.38],
    [0.15, 1.42],
  ].map(([r, y]) => new Vector2(r, y))
  const g = new LatheGeometry(perfil, 64)
  g.scale(1, 1, 0.6)
  return g
}

function usePele(transparente: boolean) {
  return useMemo(
    () => ({
      pele: new MeshStandardMaterial({ color: PELE, roughness: 0.62, transparent: transparente, opacity: transparente ? 0.5 : 1, depthWrite: !transparente }),
      sombra: new MeshStandardMaterial({ color: PELE_SOMBRA, roughness: 0.65, transparent: transparente, opacity: transparente ? 0.5 : 1, depthWrite: !transparente }),
      cabelo: new MeshStandardMaterial({ color: CABELO, roughness: 0.8, transparent: transparente, opacity: transparente ? 0.4 : 1, depthWrite: !transparente }),
      labio: new MeshStandardMaterial({ color: LABIO, roughness: 0.5 }),
      branco: new MeshStandardMaterial({ color: '#fbfbfb', roughness: 0.25 }),
      iris: new MeshStandardMaterial({ color: IRIS, roughness: 0.3 }),
      escuro: new MeshStandardMaterial({ color: '#1b1412', roughness: 0.3 }),
      boca: new MeshStandardMaterial({ color: '#5a2228', roughness: 0.5 }),
    }),
    [transparente],
  )
}

/**
 * Cabeça: pisca, olha para o mouse, faz "o" com a boca ao soltar o ar guiado,
 * enche as bochechas ao segurar e sorri quando o jogador acerta o ritmo.
 */
export function Cabeca({ transparente }: { transparente: boolean }) {
  const m = usePele(transparente)
  const grupo = useRef<Group>(null)
  const palpebras = useRef<Group>(null)
  const olhar = useRef<Group>(null)
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

    // piscar: a pálpebra de cima desce (e fica meio fechada quando sorri)
    if (t > proxPiscada.current + 0.14) proxPiscada.current = t + 2.4 + Math.random() * 3
    const piscando = t > proxPiscada.current
    if (palpebras.current) {
      const alvo = piscando ? 1.3 : feliz ? 0.8 : -0.35
      palpebras.current.children.forEach((p) => (p.rotation.x = suav(p.rotation.x, alvo, dt, 28)))
    }
    // íris e pupila seguem o mouse
    if (olhar.current) {
      olhar.current.position.x = suav(olhar.current.position.x, pointer.x * 0.018, dt, 6)
      olhar.current.position.y = suav(olhar.current.position.y, pointer.y * 0.012, dt, 6)
    }
    const soltando = pulso.guiado && pulso.fase === 'expirar'
    const segurando = pulso.guiado && pulso.fase === 'segurar'
    if (sorriso.current) {
      const alvo = soltando || segurando ? 0.001 : feliz ? 1.35 : r?.tipo === 'ops' ? 0.7 : 1
      const s = suav(sorriso.current.scale.x, alvo, dt)
      sorriso.current.scale.set(s, r?.tipo === 'ops' ? -0.5 * s : s * (feliz ? 1.3 : 0.7), 1)
    }
    if (bocaO.current) {
      const s = suav(bocaO.current.scale.x, soltando ? 1 : 0.001, dt)
      bocaO.current.scale.set(s, s * (1 + 0.15 * Math.sin(t * 6)), s)
    }
    if (bochechas.current) {
      const s = suav(bochechas.current.scale.x, segurando ? 1.5 : feliz ? 1.15 : 1, dt)
      bochechas.current.scale.setScalar(s)
    }
    if (sobrancelhas.current)
      sobrancelhas.current.position.y = suav(sobrancelhas.current.position.y, feliz || r?.tipo === 'uau' ? 0.025 : r?.tipo === 'ops' ? -0.012 : 0, dt)

    if (grupo.current) {
      grupo.current.position.y = 0.02 * pulso.enchimento
      grupo.current.rotation.z = Math.sin(t * 0.6) * 0.025
      grupo.current.rotation.y = suav(grupo.current.rotation.y, pointer.x * 0.22, dt, 3)
      grupo.current.rotation.x = suav(grupo.current.rotation.x, -pointer.y * 0.1, dt, 3)
    }
  })

  return (
    <group ref={grupo} position={[0, 0, 0]}>
      {/* o pivô da cabeça fica no pescoço */}
      <group position={[0, 2.05, -0.02]}>
        {/* crânio e mandíbula/queixo */}
        <mesh scale={[0.4, 0.5, 0.47]} material={m.pele}>
          <sphereGeometry args={[1, 48, 48]} />
        </mesh>
        <mesh position={[0, -0.2, 0.07]} scale={[0.29, 0.23, 0.33]} material={m.pele}>
          <sphereGeometry args={[1, 40, 40]} />
        </mesh>
        <mesh position={[0, -0.43, 0.22]} scale={[0.11, 0.085, 0.1]} material={m.pele}>
          <sphereGeometry args={[1, 24, 24]} />
        </mesh>

        {/* orelhas */}
        {[-1, 1].map((s) => (
          <group key={s} position={[0.39 * s, -0.02, -0.02]} rotation={[0, 0.35 * s, 0]}>
            <mesh scale={[0.04, 0.11, 0.075]} material={m.pele}>
              <sphereGeometry args={[1, 20, 20]} />
            </mesh>
            <mesh position={[0.02 * s, 0, 0]} scale={[0.02, 0.075, 0.045]} material={m.sombra}>
              <sphereGeometry args={[1, 16, 16]} />
            </mesh>
          </group>
        ))}

        {/* cabelo: calota + franja penteada para o lado */}
        <mesh position={[0, 0.06, -0.03]} rotation={[-0.25, 0, 0]} scale={[0.43, 0.52, 0.5]} material={m.cabelo}>
          <sphereGeometry args={[1, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2.15]} />
        </mesh>
        {[
          [-0.16, 0.36, 0.3, 0.5],
          [-0.02, 0.4, 0.3, 0.3],
          [0.13, 0.38, 0.29, 0.05],
          [0.26, 0.3, 0.24, -0.2],
        ].map(([x, y, z, rz], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[1.05, 0, rz]} scale={[0.13, 0.17, 0.07]} material={m.cabelo}>
            <sphereGeometry args={[1, 20, 20]} />
          </mesh>
        ))}
        {/* costeletas */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.37 * s, 0.05, 0.08]} scale={[0.04, 0.12, 0.08]} material={m.cabelo}>
            <sphereGeometry args={[1, 12, 12]} />
          </mesh>
        ))}

        {/* olhos: branco, íris, pupila, brilho e pálpebra de cima */}
        <group position={[0, 0.07, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.145 * s, 0, 0.405]} scale={[0.078, 0.052, 0.042]} material={m.branco}>
              <sphereGeometry args={[1, 24, 24]} />
            </mesh>
          ))}
          <group ref={olhar}>
            {[-1, 1].map((s) => (
              <group key={s} position={[0.145 * s, 0, 0.44]}>
                <mesh scale={[0.037, 0.037, 0.012]} material={m.iris}>
                  <sphereGeometry args={[1, 20, 20]} />
                </mesh>
                <mesh position={[0, 0, 0.006]} scale={[0.018, 0.018, 0.008]} material={m.escuro}>
                  <sphereGeometry args={[1, 14, 14]} />
                </mesh>
                <mesh position={[0.01, 0.012, 0.012]}>
                  <sphereGeometry args={[0.006, 8, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          <group ref={palpebras}>
            {[-1, 1].map((s) => (
              <group key={s} position={[0.145 * s, 0.006, 0.4]} rotation={[-0.35, 0, 0]}>
                {/* meia esfera que gira para baixo (cobre o olho ao piscar) */}
                <mesh scale={[0.082, 0.056, 0.048]} rotation={[-Math.PI / 2, 0, 0]} material={m.pele}>
                  <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
                {/* cílios */}
                <mesh position={[0, 0, 0.045]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.4]} material={m.escuro}>
                  <capsuleGeometry args={[0.006, 0.12, 4, 8]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
        {/* sobrancelhas */}
        <group ref={sobrancelhas}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.15 * s, 0.17, 0.41]} rotation={[0.2, 0.25 * s, Math.PI / 2 - 0.12 * s]} scale={[1, 1, 0.5]} material={m.cabelo}>
              <capsuleGeometry args={[0.014, 0.12, 4, 8]} />
            </mesh>
          ))}
        </group>

        {/* nariz: dorso, ponta, asas e narinas */}
        <mesh position={[0, -0.02, 0.48]} rotation={[0.38, 0, 0]} scale={[0.045, 0.12, 0.05]} material={m.pele}>
          <sphereGeometry args={[1, 20, 20]} />
        </mesh>
        <mesh position={[0, -0.09, 0.56]} scale={[0.052, 0.045, 0.05]} material={m.pele}>
          <sphereGeometry args={[1, 20, 20]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.045 * s, -0.1, 0.52]} scale={[0.03, 0.03, 0.035]} material={m.sombra}>
            <sphereGeometry args={[1, 16, 16]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.022 * s, -0.125, 0.545]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.6]} material={m.escuro}>
            <circleGeometry args={[0.012, 12]} />
          </mesh>
        ))}

        {/* bochechas (enchem quando segura o ar) */}
        <group ref={bochechas} position={[0, -0.12, 0.33]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.2 * s, 0, 0]} scale={[0.09, 0.06, 0.05]}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshStandardMaterial color="#ef9a86" transparent opacity={0.35} roughness={0.8} />
            </mesh>
          ))}
        </group>

        {/* boca: lábios, linha do sorriso e "o" */}
        <mesh position={[0, -0.2, 0.47]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.5]} material={m.labio}>
          <capsuleGeometry args={[0.018, 0.09, 4, 12]} />
        </mesh>
        <mesh position={[0, -0.24, 0.455]} rotation={[0, 0, Math.PI / 2]} scale={[1.2, 1, 0.5]} material={m.labio}>
          <capsuleGeometry args={[0.022, 0.07, 4, 12]} />
        </mesh>
        <mesh ref={sorriso} position={[0, -0.205, 0.485]} rotation={[0.3, 0, Math.PI]} material={m.boca}>
          <torusGeometry args={[0.06, 0.007, 8, 24, Math.PI]} />
        </mesh>
        <mesh ref={bocaO} position={[0, -0.22, 0.48]} scale={0.001} material={m.boca}>
          <torusGeometry args={[0.026, 0.012, 10, 24]} />
        </mesh>
      </group>
    </group>
  )
}

function Mao({ s }: { s: 1 | -1 }) {
  const m = useMemo(() => new MeshStandardMaterial({ color: PELE, roughness: 0.62 }), [])
  return (
    <group>
      <mesh scale={[0.07, 0.085, 0.035]} material={m}>
        <sphereGeometry args={[1, 20, 20]} />
      </mesh>
      {[-0.045, -0.015, 0.015, 0.045].map((x, i) => (
        <mesh key={x} position={[x, -0.1 - (i === 1 || i === 2 ? 0.01 : 0), 0]} material={m}>
          <capsuleGeometry args={[0.014, 0.06 + (i === 1 || i === 2 ? 0.015 : 0), 4, 8]} />
        </mesh>
      ))}
      {/* polegar */}
      <mesh position={[-0.065 * s, -0.03, 0.025]} rotation={[0.3, 0, 0.7 * s]} material={m}>
        <capsuleGeometry args={[0.015, 0.05, 4, 8]} />
      </mesh>
    </group>
  )
}

/** Braços (com cotovelo e mãos), pernas e tênis. Acena na tela inicial e comemora acertos. */
export function Membros() {
  const ombroD = useRef<Group>(null)
  const ombroE = useRef<Group>(null)
  const cotoveloD = useRef<Group>(null)
  const cotoveloE = useRef<Group>(null)
  const pele = useMemo(() => new MeshStandardMaterial({ color: PELE, roughness: 0.62 }), [])
  const bermuda = useMemo(() => new MeshStandardMaterial({ color: BERMUDA, roughness: 0.85 }), [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const { tela } = useApp.getState()
    const pulso = lerPulso(t)
    const r = reacaoAtual()
    const comemora = !!r && r.tipo !== 'ops'
    const acenando = tela === 'inicio' && t % 6 < 1.8
    const sobe = 0.025 * pulso.enchimento

    if (ombroE.current && cotoveloE.current) {
      const ombro = comemora ? 2.7 : acenando ? 2.1 : 0.12 + Math.sin(t * 1.3) * 0.03
      const cotovelo = comemora ? 0.2 : acenando ? 0.5 + Math.sin(t * 9) * 0.45 : 0.12
      ombroE.current.rotation.z = suav(ombroE.current.rotation.z, ombro, dt, 7)
      cotoveloE.current.rotation.z = suav(cotoveloE.current.rotation.z, cotovelo, dt, 9)
      ombroE.current.position.y = 1.16 + sobe
    }
    if (ombroD.current && cotoveloD.current) {
      const ombro = comemora ? -2.7 : -0.12 - Math.sin(t * 1.3 + 1) * 0.03
      const cotovelo = comemora ? -0.2 : -0.12
      ombroD.current.rotation.z = suav(ombroD.current.rotation.z, ombro, dt, 7)
      cotoveloD.current.rotation.z = suav(cotoveloD.current.rotation.z, cotovelo, dt, 9)
      ombroD.current.position.y = 1.16 + sobe
    }
  })

  return (
    <group>
      {/* braços: pivô no ombro, antebraço com pivô no cotovelo */}
      {([
        [-1, ombroD, cotoveloD],
        [1, ombroE, cotoveloE],
      ] as const).map(([s, ombro, cotovelo]) => (
        <group key={s} ref={ombro} position={[0.78 * s, 1.16, 0]} rotation={[0, 0, 0.12 * s]}>
          {/* deltoide */}
          <mesh position={[0, -0.04, 0]} scale={[0.115, 0.12, 0.11]} material={pele}>
            <sphereGeometry args={[1, 24, 24]} />
          </mesh>
          <mesh position={[0, -0.3, 0]} material={pele}>
            <capsuleGeometry args={[0.1, 0.42, 8, 20]} />
          </mesh>
          <group ref={cotovelo} position={[0, -0.6, 0]}>
            <mesh position={[0, -0.25, 0.01]} material={pele}>
              <capsuleGeometry args={[0.083, 0.4, 8, 20]} />
            </mesh>
            <group position={[0, -0.56, 0.02]}>
              <Mao s={s} />
            </group>
          </group>
        </group>
      ))}

      {/* bermuda */}
      <mesh position={[0, -0.6, 0]} scale={[1, 1, 0.62]} material={bermuda}>
        <cylinderGeometry args={[0.585, 0.6, 0.3, 48]} />
      </mesh>
      {/* pernas, joelhos e tênis */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.27 * s, -0.7, 0]}>
          <mesh position={[0, -0.18, 0]} material={bermuda}>
            <capsuleGeometry args={[0.2, 0.32, 8, 24]} />
          </mesh>
          <mesh position={[0, -0.5, 0]} material={pele}>
            <capsuleGeometry args={[0.15, 0.4, 8, 20]} />
          </mesh>
          <mesh position={[0, -0.83, 0.01]} scale={[0.12, 0.1, 0.11]} material={pele}>
            <sphereGeometry args={[1, 20, 20]} />
          </mesh>
          <mesh position={[0, -1.22, 0]} material={pele}>
            <capsuleGeometry args={[0.115, 0.62, 8, 20]} />
          </mesh>
          <mesh position={[0, -1.66, 0.07]} scale={[0.13, 0.09, 0.22]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={TENIS} roughness={0.5} />
          </mesh>
          <mesh position={[0, -1.72, 0.07]} scale={[0.135, 0.035, 0.225]}>
            <sphereGeometry args={[1, 24, 12]} />
            <meshStandardMaterial color={SOLA} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
