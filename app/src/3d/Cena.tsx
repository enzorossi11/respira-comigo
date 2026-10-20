import { ContactShadows, PresentationControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { ETAPAS } from '../conteudo/etapas'
import { useApp, type Tela } from '../store'
import { ParticulasAr } from './ParticulasAr'
import { Personagem } from './Personagem'

/** O personagem fica deslocado 0,55 para baixo dentro da cena. */
const DESLOCAMENTO_Y = -0.55

const CAMERA_TELA: Record<Exclude<Tela, 'caminho'>, { posicao: [number, number, number]; alvo: [number, number, number] }> = {
  inicio: { posicao: [2.6, 1.9, 5.9], alvo: [0, 0.85, 0] },
  respirar: { posicao: [0, 1.2, 5.7], alvo: [0, 0.8, 0] },
  dados: { posicao: [0, 1.2, 5.7], alvo: [0, 0.8, 0] },
}

function CameraGuiada() {
  const { camera } = useThree()
  const alvoAtual = useRef(new Vector3(0, 0.5, 0))
  const posDestino = useRef(new Vector3())
  const alvoDestino = useRef(new Vector3())

  useFrame((_, dt) => {
    const { tela, etapa } = useApp.getState()
    const cfg = tela === 'caminho' ? ETAPAS[etapa].camera : CAMERA_TELA[tela]
    posDestino.current.set(cfg.posicao[0], cfg.posicao[1] + DESLOCAMENTO_Y, cfg.posicao[2])
    alvoDestino.current.set(cfg.alvo[0], cfg.alvo[1] + DESLOCAMENTO_Y, cfg.alvo[2])
    const k = 1 - Math.exp(-dt * 2.2) // aproximação suave, independente do FPS
    camera.position.lerp(posDestino.current, k)
    alvoAtual.current.lerp(alvoDestino.current, k)
    camera.lookAt(alvoAtual.current)
  })
  return null
}

export function Cena() {
  return (
    <Canvas
      camera={{ position: [2.4, 1.4, 4.6], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="Personagem 3D mostrando o sistema respiratório"
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#C9C2FF" />
      <pointLight position={[0, 1, 2.5]} intensity={0.6} color="#BFF5EE" />

      <PresentationControls
        global={false}
        cursor
        snap
        speed={1.4}
        polar={[-0.1, 0.2]}
        azimuth={[-0.7, 0.7]}
      >
        <Personagem />
        <ParticulasAr />
      </PresentationControls>

      <ContactShadows position={[0, -1.3, 0]} opacity={0.28} scale={5} blur={2.6} far={2} />
      <CameraGuiada />
    </Canvas>
  )
}
