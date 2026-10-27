import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { quadroEm, raioEm, S, type Caminho } from './percurso'

/** Cor da parede em cada trecho (vai se misturando entre os trechos) */
const CORES: [number, string][] = [
  [S.narina, '#e98d8f'],
  [S.faringe, '#e17f86'],
  [S.laringe, '#dd7a8a'],
  [S.traqueia, '#eea39f'],
  [S.carina, '#e993a8'],
  [S.bronquiolo, '#f1aab9'],
  [S.fim, '#f6bcc6'],
]
const corCartilagem = new Color('#fff0e6')

function corEm(s: number, alvo: Color) {
  let i = 0
  while (i < CORES.length - 1 && s > CORES[i + 1][0]) i++
  const [s0, c0] = CORES[i]
  const [s1, c1] = CORES[Math.min(CORES.length - 1, i + 1)]
  const t = s1 > s0 ? Math.min(1, Math.max(0, (s - s0) / (s1 - s0))) : 0
  return alvo.set(c0).lerp(new Color(c1), t)
}

/** Anéis de cartilagem: só na traqueia e no começo dos brônquios. */
export function anel(s: number): number {
  const naTraqueia = s > S.traqueia + 2 && s < S.carina - 4
  const noBronquio = s > S.carina + 4 && s < S.carina + 30
  if (!naTraqueia && !noBronquio) return 0
  const fase = (s % 2.4) / 2.4
  return Math.pow(Math.max(0, Math.sin(fase * Math.PI)), 6)
}

/**
 * Túnel com raio variável, levemente irregular, com as normais para dentro
 * (a câmera fica do lado de dentro).
 */
export function geometriaTunel(c: Caminho, s0: number, s1: number, lados = 40): BufferGeometry {
  const passos = Math.max(2, Math.ceil((s1 - s0) / 0.4))
  const nv = (passos + 1) * (lados + 1)
  const pos = new Float32Array(nv * 3)
  const nor = new Float32Array(nv * 3)
  const uv = new Float32Array(nv * 2)
  const cor = new Float32Array(nv * 3)
  const p = new Vector3()
  const dir = new Vector3()
  const col = new Color()

  let k = 0
  for (let i = 0; i <= passos; i++) {
    const s = s0 + ((s1 - s0) * i) / passos
    const q = quadroEm(c, s)
    const R = raioEm(s)
    const a = anel(s)
    corEm(s, col)
    if (a > 0) col.lerp(corCartilagem, a * 0.55)
    for (let j = 0; j <= lados; j++) {
      const th = (j / lados) * Math.PI * 2
      const bumps = 1 + 0.035 * Math.sin(th * 5 + s * 0.7) + 0.025 * Math.sin(th * 11 - s * 1.3)
      const r = R * bumps * (1 - 0.07 * a)
      dir.copy(q.binormal).multiplyScalar(Math.cos(th)).addScaledVector(q.normal, Math.sin(th))
      p.copy(q.ponto).addScaledVector(dir, r)
      pos.set([p.x, p.y, p.z], k * 3)
      nor.set([-dir.x, -dir.y, -dir.z], k * 3)
      uv.set([(j / lados) * 3, s / 9], k * 2)
      cor.set([col.r, col.g, col.b], k * 3)
      k++
    }
  }

  const idx: number[] = []
  for (let i = 0; i < passos; i++)
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j
      const b = a + lados + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('normal', new BufferAttribute(nor, 3))
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.setAttribute('color', new BufferAttribute(cor, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}
