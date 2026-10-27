import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { useApp } from '../store'

/**
 * Modelo anatômico do corpo humano (Z-Anatomy, CC BY-SA 4.0), recortado em
 * data/modelo3d/exportar_modelo.py: pele em três partes, cabelo, olhos,
 * bermuda e os órgãos do sistema respiratório.
 */
export const URL_MODELO = `${import.meta.env.BASE_URL}modelos/corpo.glb`

export type ParteModelo =
  | 'PeleCabeca'
  | 'PeleTronco'
  | 'PeleMembros'
  | 'Cabelo'
  | 'Esclera'
  | 'Iris'
  | 'Bermuda'
  | 'PulmaoDireito'
  | 'PulmaoEsquerdo'
  | 'Traqueia'
  | 'Bronquios'
  | 'Laringe'
  | 'Faringe'
  | 'CavidadeNasal'
  | 'Diafragma'

export interface PecaModelo {
  geometria: BufferGeometry
  /** centro da peça, em metros (no sistema do modelo) */
  centro: Vector3
}

/**
 * Carrega o modelo e devolve a geometria de cada peça já com a transformação
 * aplicada (o gltfpack guarda a quantização no nó pai) e centralizada,
 * para dar para animar cada parte em volta do próprio centro.
 */
export function usePecasModelo(): Record<ParteModelo, PecaModelo> {
  const { scene } = useGLTF(URL_MODELO, false, true)
  return useMemo(() => {
    scene.updateMatrixWorld(true)
    const out = {} as Record<ParteModelo, PecaModelo>
    scene.traverse((o: Object3D) => {
      if (!(o as Mesh).isMesh) return
      const nome = (o.parent?.name || o.name) as ParteModelo
      // a quantização (gltfpack) guarda as posições em inteiros: passa para float antes de transformar
      const orig = (o as Mesh).geometry
      const pos = orig.getAttribute('position')
      const f = new Float32Array(pos.count * 3)
      for (let i = 0; i < pos.count; i++) {
        f[i * 3] = pos.getX(i)
        f[i * 3 + 1] = pos.getY(i)
        f[i * 3 + 2] = pos.getZ(i)
      }
      const geo = new BufferGeometry()
      geo.setAttribute('position', new Float32BufferAttribute(f, 3))
      if (orig.index) geo.setIndex(orig.index.clone())
      geo.applyMatrix4(o.matrixWorld)
      geo.computeVertexNormals()
      geo.computeBoundingBox()
      const centro = geo.boundingBox!.getCenter(new Vector3())
      geo.translate(-centro.x, -centro.y, -centro.z)
      out[nome] = { geometria: geo, centro }
    })
    return out
  }, [scene])
}

useGLTF.preload(URL_MODELO, false, true)

/** Há quanto tempo (s) aconteceu a última reação, e qual foi. */
export function reacaoAtual(): { tipo: 'feliz' | 'uau' | 'ops'; idade: number } | null {
  const r = useApp.getState().reacao
  if (!r) return null
  const idade = (performance.now() - r.em) / 1000
  return idade < 1.6 ? { tipo: r.tipo, idade } : null
}

/** Pulinho de comemoração (aplicado ao personagem inteiro) */
export function alturaPulo(): number {
  const r = reacaoAtual()
  if (!r || r.tipo === 'ops') return 0
  return Math.max(0, Math.sin(Math.min(1, r.idade / 0.55) * Math.PI)) * 0.22
}

/** Balanço de "ops" (rotação em z, em radianos) */
export function balancoOps(): number {
  const r = reacaoAtual()
  if (!r || r.tipo !== 'ops' || r.idade > 0.9) return 0
  return Math.sin(r.idade * 22) * 0.05 * (1 - r.idade / 0.9)
}

/**
 * Pele "de vidro": mais transparente de frente e mais visível nas bordas
 * (efeito fresnel), para dar volume sem esconder os órgãos.
 */
export function materialVidro(cor: string, opacidade = 0.32): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    color: cor,
    roughness: 0.35,
    transparent: true,
    opacity: opacidade,
    depthWrite: false,
  })
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
      gl_FragColor.a = clamp(gl_FragColor.a * mix(0.5, 2.0, fr), 0.0, 0.85);`,
    )
  }
  mat.customProgramCacheKey = () => 'vidro'
  return mat
}
