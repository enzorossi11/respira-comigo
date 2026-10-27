import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { ETAPAS } from '../conteudo/etapas'
import { useApp } from '../store'
import { caminhoCompleto } from './anatomia'
import { COR } from './cores'
import { lerPulso } from './enchimento'

const N = 44

/** Fração do caminho em que o ar entra no pulmão e começa a se espalhar. */
const INICIO_ESPALHAR = 0.86

/**
 * Partículas de ar percorrendo o caminho narina → pulmão.
 * - Na tela "caminho": fluxo contínuo; as que estão no trecho da etapa atual brilham.
 * - Na respiração guiada: entram ao inspirar e voltam ao expirar, no ritmo escolhido.
 */
export function ParticulasAr() {
  const ref = useRef<InstancedMesh>(null)
  const curvas = useMemo(() => [caminhoCompleto(-1), caminhoCompleto(1)], [])
  const sementes = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        lado: i % 2,
        k: (i * 0.618034) % 1, // espalhamento uniforme
        jx: Math.sin(i * 12.9898) * 0.5,
        jy: Math.sin(i * 78.233) * 0.5,
        jz: Math.sin(i * 39.425) * 0.5,
      })),
    [],
  )
  const tmp = useMemo(() => new Object3D(), [])
  const cor = useMemo(() => new Color(), [])
  const cIn = useMemo(() => new Color(COR.inspira), [])
  const cOut = useMemo(() => new Color(COR.expira), [])
  const cOn = useMemo(() => new Color('#3FE0D0'), [])
  const cOff = useMemo(() => new Color('#B9C2D6'), [])

  useFrame(({ clock }) => {
    const malha = ref.current
    if (!malha) return
    const { tela, etapa } = useApp.getState()
    const pulso = lerPulso(clock.elapsedTime)
    const trecho = tela === 'caminho' ? ETAPAS[etapa].trecho : null
    const pausado = tela === 'respirar' && !pulso.guiado

    sementes.forEach((s, i) => {
      let u: number
      if (pulso.guiado || pausado) {
        // ar entra com o enchimento, as primeiras partículas vão mais fundo
        u = pulso.enchimento * 1.3 - s.k * 0.3
      } else {
        u = (clock.elapsedTime * 0.09 + s.k) % 1
      }
      // fora do caminho do ar, o trecho do nariz fica escondido (passaria rente à pele)
      const visivel = u > (trecho ? 0.015 : 0.2)
      u = Math.min(1, Math.max(0, u))
      const p = curvas[s.lado].getPointAt(u)
      // ao chegar no pulmão, o ar se espalha
      const esp = Math.max(0, (u - INICIO_ESPALHAR) / (1 - INICIO_ESPALHAR)) * 0.16
      tmp.position.set(p.x + s.jx * esp * 1.2, p.y + s.jy * esp * 2.4, p.z + s.jz * esp)
      tmp.scale.setScalar(visivel ? 1 : 0.0001)
      tmp.updateMatrix()
      malha.setMatrixAt(i, tmp.matrix)

      if (trecho) {
        const dentro = u >= trecho[0] && u <= trecho[1]
        cor.copy(dentro ? cOn : cOff)
      } else {
        cor.copy(pulso.fase === 'expirar' ? cOut : cIn)
      }
      malha.setColorAt(i, cor)
    })
    malha.instanceMatrix.needsUpdate = true
    if (malha.instanceColor) malha.instanceColor.needsUpdate = true
  })

  return (
    <group position={[0, -0.55, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, N]}>
        <sphereGeometry args={[0.026, 12, 12]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.25} roughness={0.3} />
      </instancedMesh>
    </group>
  )
}
