import { CatmullRomCurve3, Vector3 } from 'three'

/**
 * Geometria do caminho do ar, tirada do modelo anatômico do Z-Anatomy
 * (public/modelos/corpo.glb, em metros, pés em y = 0, olhando para +z).
 *
 * O modelo é colocado na cena com escala ESCALA e os pés em BASE_Y
 * (unidades locais do personagem). Lado "direito" do personagem = -x na tela.
 */
export const ESCALA = 2.8
export const BASE_Y = -2.47

/** Converte um ponto do modelo (metros) para as unidades locais do personagem. */
const m = (x: number, y: number, z: number) => new Vector3(x * ESCALA, BASE_Y + y * ESCALA, z * ESCALA)

export const PONTOS = {
  narina: m(0, 1.541, 0.112),
  cavidadeNasal: m(0, 1.556, 0.085),
  cavidadeFundo: m(0, 1.567, 0.058),
  nasofaringe: m(0, 1.568, 0.03),
  faringe: m(0, 1.542, 0.022),
  faringeBaixa: m(0, 1.51, 0.02),
  laringe: m(0, 1.484, 0.017),
  inicioTraqueia: m(0, 1.457, 0.009),
  meioTraqueia: m(0, 1.416, 0.003),
  fimTraqueia: m(0, 1.385, -0.006),
  carina: m(0, 1.364, -0.012),
}

const lado = (s: 1 | -1) =>
  s === -1
    ? { b1: m(-0.0138, 1.348, -0.017), b2: m(-0.0315, 1.318, -0.021), pulmao: m(-0.068, 1.275, 0.0) }
    : { b1: m(0.0271, 1.335, -0.018), b2: m(0.0436, 1.321, -0.021), pulmao: m(0.074, 1.272, 0.0) }

export const CENTRO_PULMAO = {
  direito: m(-0.065, 1.3, 0.005),
  esquerdo: m(0.068, 1.3, 0.008),
}

/** Caminho completo, da narina ao fundo de um pulmão — usado pelas partículas. */
export const caminhoCompleto = (s: 1 | -1) => {
  const l = lado(s)
  return new CatmullRomCurve3(
    [
      PONTOS.narina,
      PONTOS.cavidadeNasal,
      PONTOS.cavidadeFundo,
      PONTOS.nasofaringe,
      PONTOS.faringe,
      PONTOS.faringeBaixa,
      PONTOS.laringe,
      PONTOS.inicioTraqueia,
      PONTOS.meioTraqueia,
      PONTOS.fimTraqueia,
      PONTOS.carina,
      l.b1,
      l.b2,
      l.pulmao,
    ],
    false,
    'centripetal',
  )
}
