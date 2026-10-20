import { CatmullRomCurve3, Vector3 } from 'three'

/**
 * Geometria do caminho do ar do personagem (unidades da cena, y para cima,
 * o personagem olha para +z). Lado "direito" do personagem = -x na tela.
 */
const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

export const PONTOS = {
  narina: v(0, 2.0, 0.66),
  cavidadeNasal: v(0, 2.13, 0.42),
  nasofaringe: v(0, 2.1, 0.12),
  faringe: v(0, 1.88, -0.02),
  faringeBaixa: v(0, 1.66, 0.0),
  laringe: v(0, 1.48, 0.04),
  inicioTraqueia: v(0, 1.4, 0.04),
  carina: v(0, 0.88, 0.03),
}

const lado = (s: 1 | -1) => ({
  b1: v(0.2 * s, 0.74, 0.03),
  b2: v(0.36 * s, 0.52, 0.03),
  pulmao: v(0.42 * s, 0.28, 0.05),
})

export const LADO_DIREITO = lado(-1)
export const LADO_ESQUERDO = lado(1)

export const CENTRO_PULMAO = {
  direito: v(-0.4, 0.38, 0.02),
  esquerdo: v(0.4, 0.38, 0.02),
}

/** Vias aéreas superiores (nariz → laringe) */
export const curvaSuperior = new CatmullRomCurve3([
  PONTOS.narina,
  PONTOS.cavidadeNasal,
  PONTOS.nasofaringe,
  PONTOS.faringe,
  PONTOS.faringeBaixa,
  PONTOS.laringe,
  PONTOS.inicioTraqueia,
])

export const curvaTraqueia = new CatmullRomCurve3([PONTOS.inicioTraqueia, v(0, 1.15, 0.035), PONTOS.carina])

export const curvaBronquio = (s: 1 | -1) => {
  const l = lado(s)
  return new CatmullRomCurve3([PONTOS.carina, l.b1, l.b2, l.pulmao])
}

/** Caminho completo, da narina ao fundo de um pulmão — usado pelas partículas. */
export const caminhoCompleto = (s: 1 | -1) => {
  const l = lado(s)
  return new CatmullRomCurve3(
    [
      PONTOS.narina,
      PONTOS.cavidadeNasal,
      PONTOS.nasofaringe,
      PONTOS.faringe,
      PONTOS.faringeBaixa,
      PONTOS.laringe,
      PONTOS.inicioTraqueia,
      v(0, 1.15, 0.035),
      PONTOS.carina,
      l.b1,
      l.b2,
      l.pulmao,
    ],
    false,
    'centripetal',
  )
}

/** Pequenos ramos (bronquíolos) saindo de cada brônquio para dentro do pulmão. */
export const ramos = (s: 1 | -1): CatmullRomCurve3[] => {
  const l = lado(s)
  const alvos = [v(0.55 * s, 0.75, 0.05), v(0.62 * s, 0.4, 0.08), v(0.5 * s, 0.05, 0.04), v(0.3 * s, 0.1, 0.1)]
  return alvos.map((a) => {
    const meio = l.b2.clone().lerp(a, 0.5).add(v(0.03 * s, 0.03, 0))
    return new CatmullRomCurve3([l.b2, meio, a])
  })
}
