import { ContactShadows, Environment, Lightformer, PresentationControls, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import { BackSide, CanvasTexture, Color, Mesh, MeshBasicMaterial, SRGBColorSpace, Vector3 } from 'three'
import { ETAPAS } from '../conteudo/etapas'
import { MODO_TESTE } from '../lib/teste'
import { useApp, type Tela } from '../store'
import { COR } from './cores'
import { lerPulso } from './enchimento'
import { ParticulasAr } from './ParticulasAr'
import { Personagem } from './Personagem'

/** O personagem fica deslocado 0,55 para baixo dentro da cena. */
const DESLOCAMENTO_Y = -0.55
const CHAO = -3.02

const CAMERA_TELA: Record<Exclude<Tela, 'caminho'>, { posicao: [number, number, number]; alvo: [number, number, number] }> = {
  inicio: { posicao: [1.9, 0.6, 8.2], alvo: [0, -0.2, 0] },
  jornada: { posicao: [0, 1.0, 5.4], alvo: [0, 0.78, 0] },
  respirar: { posicao: [0, 1.0, 5.4], alvo: [0, 0.78, 0] },
  dados: { posicao: [0, 1.0, 5.4], alvo: [0, 0.78, 0] },
}

function CameraGuiada() {
  const { camera } = useThree()
  const alvoAtual = useRef(new Vector3(0, 0.5, 0))
  const posDestino = useRef(new Vector3())
  const alvoDestino = useRef(new Vector3())

  useFrame(({ clock }, dt) => {
    const { tela, etapa } = useApp.getState()
    const cfg = tela === 'caminho' ? ETAPAS[etapa].camera : CAMERA_TELA[tela]
    const t = clock.elapsedTime
    // leve "respiração" da câmera para a cena não ficar parada
    const deriva = tela === 'caminho' ? 0.04 : 0.12
    posDestino.current.set(
      cfg.posicao[0] + Math.sin(t * 0.21) * deriva,
      cfg.posicao[1] + DESLOCAMENTO_Y + Math.sin(t * 0.17) * deriva * 0.5,
      cfg.posicao[2],
    )
    alvoDestino.current.set(cfg.alvo[0], cfg.alvo[1] + DESLOCAMENTO_Y, cfg.alvo[2])
    const k = 1 - Math.exp(-dt * 2.2) // aproximação suave, independente do FPS
    camera.position.lerp(posDestino.current, k)
    alvoAtual.current.lerp(alvoDestino.current, k)
    camera.lookAt(alvoAtual.current)
  })
  return null
}

/** Céu em degradê (lilás em cima, menta embaixo) */
function Ceu() {
  const mat = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#e9e4ff')
    grad.addColorStop(0.45, '#f5f8fc')
    grad.addColorStop(0.75, '#e6f6f3')
    grad.addColorStop(1, '#d3efe9')
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 256)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return new MeshBasicMaterial({ map: t, side: BackSide, depthWrite: false, fog: false, toneMapped: false })
  }, [])
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[40, 32, 32]} />
    </mesh>
  )
}

/** Chão com o anel do logo, que pulsa com a respiração */
function Chao() {
  const anel = useRef<Mesh>(null)
  const brilho = useRef<Mesh>(null)
  const cor = useMemo(() => new Color(), [])
  const cIn = useMemo(() => new Color(COR.inspira), [])
  const cOut = useMemo(() => new Color(COR.expira), [])
  useFrame(({ clock }) => {
    const p = lerPulso(clock.elapsedTime)
    const s = 1 + p.enchimento * 0.12
    anel.current?.scale.set(s, s, 1)
    if (brilho.current) {
      brilho.current.scale.set(s * 1.05, s * 1.05, 1)
      cor.copy(p.fase === 'expirar' ? cOut : cIn)
      ;(brilho.current.material as MeshBasicMaterial).color.lerp(cor, 0.06)
      ;(brilho.current.material as MeshBasicMaterial).opacity = 0.1 + p.enchimento * 0.12
    }
  })
  return (
    <group position={[0, CHAO + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.55} />
      </mesh>
      <mesh ref={brilho} position={[0, 0, 0.002]}>
        <circleGeometry args={[1.5, 64]} />
        <meshBasicMaterial color={COR.inspira} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh ref={anel} position={[0, 0, 0.004]}>
        <ringGeometry args={[1.45, 1.53, 96]} />
        <meshBasicMaterial color={COR.expira} transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Cena() {
  return (
    <Canvas
      camera={{ position: [2.6, 0.4, 9.6], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: !MODO_TESTE, preserveDrawingBuffer: true }}
      aria-label="Personagem 3D mostrando o sistema respiratório"
    >
      <Ceu />
      <fog attach="fog" args={['#eef0fb', 14, 36]} />

      {/* luz de estúdio suave, gerada na hora (sem baixar mapas de ambiente) */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 5, 5]} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#c9c2ff" position={[-6, 2, -2]} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#bff5ee" position={[6, 1, 2]} scale={[4, 6, 1]} />
      </Environment>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <directionalLight position={[-4, 2, -2]} intensity={0.45} color="#c9c2ff" />
      {/* luz de frente, suave, para o rosto não ficar com sombra no queixo */}
      <directionalLight position={[0, 0.5, 7]} intensity={0.55} color="#fff4ec" />

      <PresentationControls global={false} cursor snap speed={1.4} polar={[-0.1, 0.2]} azimuth={[-0.7, 0.7]}>
        <Suspense fallback={null}>
          <Personagem />
        </Suspense>
        <ParticulasAr />
      </PresentationControls>

      {/* partículas de ar flutuando no ambiente */}
      <Sparkles count={45} scale={[8, 7, 4]} position={[0, -0.6, -0.5]} size={2.6} speed={0.25} opacity={0.55} color={COR.inspira} />
      <Sparkles count={30} scale={[8, 7, 4]} position={[0, -0.6, -0.5]} size={2.2} speed={0.2} opacity={0.5} color={COR.expira} />

      <Chao />
      <ContactShadows position={[0, CHAO, 0]} opacity={0.32} scale={6} blur={2.6} far={2.5} />
      <CameraGuiada />
    </Canvas>
  )
}
