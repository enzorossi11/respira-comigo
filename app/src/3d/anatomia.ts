import { CatmullRomCurve3, Vector3 } from 'three'
import type { Mapa } from './ajuste'

/**
 * Caminho do ar, com as coordenadas do modelo anatômico do Z-Anatomy
 * (metros, pés em y = 0, olhando para +z). Na cena, cada ponto é levado para
 * dentro do corpo personalizado (mapa) e convertido para as unidades do
 * personagem (escala e BASE_Y).
 *
 * Lado "direito" do personagem = -x na tela.
 */
/** Escala de exibição de um corpo de altura ALTURA_BASE (ver Corpo.tsx) */
export const ESCALA = 2.8
export const BASE_Y = -2.47

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

export const PONTOS_ZA = {
  narina: v(0, 1.541, 0.112),
  cavidadeNasal: v(0, 1.556, 0.085),
  cavidadeFundo: v(0, 1.567, 0.058),
  nasofaringe: v(0, 1.568, 0.03),
  faringe: v(0, 1.542, 0.022),
  faringeBaixa: v(0, 1.51, 0.02),
  laringe: v(0, 1.484, 0.017),
  inicioTraqueia: v(0, 1.457, 0.009),
  meioTraqueia: v(0, 1.416, 0.003),
  fimTraqueia: v(0, 1.385, -0.006),
  carina: v(0, 1.364, -0.012),
}

const lado = (s: 1 | -1) =>
  s === -1
    ? [v(-0.0138, 1.348, -0.017), v(-0.0315, 1.318, -0.021), v(-0.068, 1.275, 0.0)]
    : [v(0.0271, 1.335, -0.018), v(0.0436, 1.321, -0.021), v(0.074, 1.272, 0.0)]

/** Converte um ponto do Z-Anatomy para as unidades locais do personagem */
export function paraCena(p: Vector3, mapa: Mapa, escala: number): Vector3 {
  const q = mapa(p.x, p.y, p.z)
  return new Vector3(q.x * escala, BASE_Y + q.y * escala, q.z * escala)
}

/** Caminho completo, da narina ao fundo de um pulmão — usado pelas partículas. */
export function caminhoCompleto(s: 1 | -1, mapa: Mapa, escala: number): CatmullRomCurve3 {
  const P = PONTOS_ZA
  const pts = [
    P.narina,
    P.cavidadeNasal,
    P.cavidadeFundo,
    P.nasofaringe,
    P.faringe,
    P.faringeBaixa,
    P.laringe,
    P.inicioTraqueia,
    P.meioTraqueia,
    P.fimTraqueia,
    P.carina,
    ...lado(s),
  ].map((p) => paraCena(p, mapa, escala))
  return new CatmullRomCurve3(pts, false, 'centripetal')
}
