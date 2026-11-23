/**
 * Planta do personagem de desenho (o "amigo") e do caminho do ar dentro dele.
 *
 * Tudo em unidades da cena, no espaço do personagem: pés em y = CHAO_Y, olhando
 * para +z, lado direito da tela = +x. A cabeça é grande e redonda, no estilo
 * dos desenhos infantis; os órgãos são versões simplificadas (balões, tubos,
 * galhos), sem textura nem detalhe anatômico.
 */
import { CatmullRomCurve3, Vector3 } from 'three'
import type { Parte } from '../conteudo/etapas'
import type { Perfil } from './perfil'

export const CHAO_Y = -2.47
export const RAIO_CABECA = 0.6

export type Faixa = 'crianca' | 'jovem' | 'adulto'

/** idade (12 a 25) → faixa usada no desenho */
export function faixaDaIdade(idade: number): Faixa {
  if (idade <= 14) return 'crianca'
  if (idade >= 22) return 'adulto'
  return 'jovem'
}

const PROPORCOES: Record<Faixa, { perna: number; tronco: number; largura: number; membro: number }> = {
  crianca: { perna: 1.3, tronco: 1.25, largura: 0.54, membro: 0.15 },
  jovem: { perna: 1.55, tronco: 1.4, largura: 0.6, membro: 0.16 },
  adulto: { perna: 1.75, tronco: 1.5, largura: 0.66, membro: 0.17 },
}

export interface Medidas {
  faixa: Faixa
  perna: number
  tronco: number
  /** meia-largura do tronco (eixo x) */
  largura: number
  /** raio de braços e pernas */
  membro: number
  quadril: number
  troncoBase: number
  troncoTopo: number
  cabeca: Vector3
  /** centro dos pulmões (y) e meia-altura de cada pulmão */
  pulmaoY: number
  pulmaoAltura: number
  carinaY: number
}

export function medidas(perfil: Pick<Perfil, 'idade'>): Medidas {
  const faixa = faixaDaIdade(perfil.idade)
  const p = PROPORCOES[faixa]
  const quadril = CHAO_Y + p.perna
  const troncoBase = quadril + 0.02
  const troncoTopo = troncoBase + p.tronco
  const cabeca = new Vector3(0, troncoTopo + 0.22 + RAIO_CABECA * 0.92, 0)
  const pulmaoAltura = p.tronco * 0.27
  const pulmaoY = troncoTopo - 0.12 - pulmaoAltura
  return {
    faixa,
    ...p,
    quadril,
    troncoBase,
    troncoTopo,
    cabeca,
    pulmaoY,
    pulmaoAltura,
    carinaY: pulmaoY + pulmaoAltura * 0.55,
  }
}

/* ----------------------------------------------------------- caminho do ar */

const Z_ORGAOS = 0.05

/** Pontos do caminho do ar, da narina até o fundo de um pulmão (s = lado na tela). */
export function pontosDoAr(m: Medidas, s: 1 | -1): Vector3[] {
  const c = m.cabeca
  const R = RAIO_CABECA
  const laringeTopo = m.troncoTopo + 0.3
  return [
    new Vector3(0, c.y - 0.16, R + 0.02), // 0 narina
    new Vector3(0, c.y - 0.08, R * 0.7), // 1 dentro do nariz
    new Vector3(0, c.y - 0.04, R * 0.38), // 2 fundo do nariz
    new Vector3(0, c.y - 0.12, 0.06), // 3 nasofaringe
    new Vector3(0, c.y - 0.42, 0.04), // 4 faringe
    new Vector3(0, laringeTopo, Z_ORGAOS), // 5 laringe (topo)
    new Vector3(0, laringeTopo - 0.16, Z_ORGAOS), // 6 laringe (base) = início da traqueia
    new Vector3(0, (laringeTopo - 0.16 + m.carinaY) / 2, Z_ORGAOS), // 7 meio da traqueia
    new Vector3(0, m.carinaY + 0.05, Z_ORGAOS), // 8 fim da traqueia
    new Vector3(s * 0.05, m.carinaY - 0.03, Z_ORGAOS), // 9 carina
    new Vector3(s * 0.15, m.carinaY - 0.12, Z_ORGAOS), // 10 brônquio
    new Vector3(s * 0.24, m.pulmaoY, Z_ORGAOS), // 11 dentro do pulmão
    new Vector3(s * 0.27, m.pulmaoY - m.pulmaoAltura * 0.55, Z_ORGAOS), // 12 fundo do pulmão
  ]
}

export function caminhoDoAr(m: Medidas, s: 1 | -1): CatmullRomCurve3 {
  return new CatmullRomCurve3(pontosDoAr(m, s), false, 'centripetal')
}

/** Fração do comprimento (0 a 1) em que cada ponto de pontosDoAr fica. */
export function fracoesDosPontos(curva: CatmullRomCurve3): number[] {
  const n = curva.points.length
  const div = (n - 1) * 24
  const L = curva.getLengths(div)
  return Array.from({ length: n }, (_, i) => L[i * 24] / L[div])
}

/** Trecho do caminho (índices de pontosDoAr) que cada parte cobre — para as partículas brilharem. */
export const TRECHO_PARTE: Record<Parte, [number, number] | null> = {
  nariz: [0, 3],
  faringe: [3, 5],
  laringe: [5, 6],
  traqueia: [6, 9],
  bronquios: [9, 11],
  pulmoes: [10, 12],
  alveolos: [11, 12],
  diafragma: null,
}

/** Centro de cada parte, para rótulos e câmera. */
export function centroDaParte(m: Medidas, parte: Parte): Vector3 {
  const c = m.cabeca
  switch (parte) {
    case 'nariz':
      return new Vector3(0, c.y - 0.08, RAIO_CABECA * 0.65)
    case 'faringe':
      return new Vector3(0, c.y - 0.3, 0.05)
    case 'laringe':
      return new Vector3(0, m.troncoTopo + 0.22, Z_ORGAOS)
    case 'traqueia':
      return new Vector3(0, (m.troncoTopo + 0.14 + m.carinaY) / 2, Z_ORGAOS)
    case 'bronquios':
      return new Vector3(0, m.carinaY - 0.12, Z_ORGAOS)
    case 'pulmoes':
      return new Vector3(0, m.pulmaoY, Z_ORGAOS)
    case 'alveolos':
      return new Vector3(0.24, m.pulmaoY - 0.1, Z_ORGAOS)
    case 'diafragma':
      return new Vector3(0, m.pulmaoY - m.pulmaoAltura - 0.05, Z_ORGAOS)
  }
}

/**
 * Onde o rótulo de cada parte aparece: ao lado da parte, por fora do corpo,
 * para não tampar o que está sendo mostrado.
 */
export function posicaoRotulo(m: Medidas, parte: Parte): Vector3 {
  const c = centroDaParte(m, parte)
  const fora: Record<Parte, [number, number, number]> = {
    nariz: [0.62, 0.1, 0.1],
    faringe: [-0.75, 0.0, 0.1],
    laringe: [0.55, 0.05, 0.2],
    traqueia: [0.55, 0.0, 0.3],
    bronquios: [-0.62, -0.05, 0.3],
    pulmoes: [0.0, m.pulmaoAltura + 0.25, 0.45],
    alveolos: [0.62, 0.3, 0.4],
    diafragma: [0.0, -0.28, 0.5],
  }
  const [dx, dy, dz] = fora[parte]
  return c.add(new Vector3(dx, dy, dz))
}

/**
 * Câmera de cada parada: mira a parte e chega perto o bastante para ela ocupar
 * boa parte da tela. As partes da cabeça são vistas de lado, para enxergar
 * por dentro.
 */
export function cameraDaParte(m: Medidas, parte: Parte): { posicao: Vector3; alvo: Vector3 } {
  const alvo = centroDaParte(m, parte)
  const desvio: Record<Parte, [number, number, number]> = {
    nariz: [1.25, 0.3, 1.75],
    faringe: [1.75, 0.15, 1.35],
    laringe: [1.0, 0.25, 2.0],
    traqueia: [0.75, 0.25, 2.5],
    bronquios: [0.2, 0.2, 2.45],
    pulmoes: [0.0, 0.25, 3.3],
    alveolos: [0.55, 0.2, 2.6],
    diafragma: [0.0, 0.6, 3.1],
  }
  if (parte === 'alveolos') alvo.x = 0.35
  const [dx, dy, dz] = desvio[parte]
  return { posicao: alvo.clone().add(new Vector3(dx, dy, dz)), alvo }
}
