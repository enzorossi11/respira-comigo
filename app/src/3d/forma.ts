/**
 * Planta do personagem de desenho (o "amigo") e do caminho do ar dentro dele.
 *
 * Tudo em unidades da cena, no espaço do personagem: pés em y = CHAO_Y, olhando
 * para +z, lado direito da tela = +x. As proporções são de uma pessoa (cabeça
 * cerca de 1/4,5 da altura num jovem), com o estilo simples de desenho; os
 * órgãos são versões simplificadas (balões, tubos, galhos), sem textura nem
 * detalhe anatômico.
 */
import { CatmullRomCurve3, Vector3 } from 'three'
import type { Parte } from '../conteudo/etapas'
import type { Perfil } from './perfil'

export const CHAO_Y = -2.47
export const RAIO_CABECA = 0.48

/* --------------------------------------------------------------- rosto */

/** Queixo: uma segunda esfera, mais baixa e à frente, que afina o rosto embaixo. */
export const QUEIXO = { centro: new Vector3(0, -0.3 * RAIO_CABECA, 0.12 * RAIO_CABECA), raio: 0.8 * RAIO_CABECA }

/** z da superfície do rosto num ponto (x, y), com a cabeça centrada em 0. */
export function superficieRosto(x: number, y: number): number {
  const R = RAIO_CABECA
  const cabeca = Math.sqrt(Math.max(0, R * R - x * x - y * y))
  const dy = y - QUEIXO.centro.y
  const q = QUEIXO.raio
  const queixo = q * q - x * x - dy * dy > 0 ? QUEIXO.centro.z + Math.sqrt(q * q - x * x - dy * dy) : 0
  return Math.max(cabeca, queixo)
}

/**
 * Nariz de desenho (no espaço da cabeça): a ponta é uma bola que sai bem do
 * rosto, com as duas "asas" do lado e as duas narinas embaixo.
 */
export const NARIZ = (() => {
  const y = -0.2 * RAIO_CABECA
  const raio = 0.07
  // o centro fica um pouco à frente da pele: assim a bola inteira (e o contorno) aparece
  return { centro: new Vector3(0, y, superficieRosto(0, y) + 0.022), raio, escala: new Vector3(1, 0.95, 0.85) }
})()

/** As duas narinas, na parte de baixo da ponta do nariz (lado -1 e +1). */
export const NARINAS = ([-1, 1] as const).map((lado) => {
  const direcao = new Vector3(lado * 0.36, -0.74, 0.56).normalize()
  return { lado, direcao, centro: direcao.clone().multiply(NARIZ.escala).multiplyScalar(NARIZ.raio).add(NARIZ.centro) }
})

/** Narina por onde o ar entra no jogo (a do lado +x) e a direção de quem chega até ela. */
export const NARINA = NARINAS[1].centro
export const SAIDA_NARINA = new Vector3(0.16, -0.55, 0.82).normalize()

/** Onde o caminho do ar começa no desenho: dentro da ponta do nariz, entre as narinas. */
export const ENTRADA_AR = NARIZ.centro.clone().add(new Vector3(0, -0.028, 0))

/* ------------------------------------------------------------ proporções */

export type Faixa = 'crianca' | 'jovem' | 'adulto'

/** idade (12 a 25) → faixa usada no desenho */
export function faixaDaIdade(idade: number): Faixa {
  if (idade <= 14) return 'crianca'
  if (idade >= 22) return 'adulto'
  return 'jovem'
}

const PROPORCOES: Record<Faixa, { perna: number; tronco: number; largura: number; membro: number }> = {
  crianca: { perna: 1.45, tronco: 1.15, largura: 0.46, membro: 0.105 },
  jovem: { perna: 1.8, tronco: 1.35, largura: 0.52, membro: 0.115 },
  adulto: { perna: 2.0, tronco: 1.5, largura: 0.58, membro: 0.125 },
}

export interface Medidas {
  faixa: Faixa
  perna: number
  tronco: number
  /** meia-largura dos ombros (eixo x) */
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
  const cabeca = new Vector3(0, troncoTopo + 0.2 + RAIO_CABECA * 0.95, 0)
  const pulmaoAltura = p.tronco * 0.25
  const pulmaoY = troncoTopo - 0.16 - pulmaoAltura
  return {
    faixa,
    ...p,
    quadril,
    troncoBase,
    troncoTopo,
    cabeca,
    pulmaoY,
    pulmaoAltura,
    carinaY: pulmaoY + pulmaoAltura * 0.6,
  }
}

/* ----------------------------------------------------------- caminho do ar */

const Z_ORGAOS = 0.03

/** Pontos do caminho do ar, da narina até o fundo de um pulmão (s = lado na tela). */
export function pontosDoAr(m: Medidas, s: 1 | -1): Vector3[] {
  const c = m.cabeca
  const R = RAIO_CABECA
  const laringeTopo = m.troncoTopo + 0.14
  return [
    c.clone().add(ENTRADA_AR), // 0 entrada (dentro da ponta do nariz)
    new Vector3(0, c.y - 0.14 * R, 0.72 * R), // 1 dentro do nariz
    new Vector3(0, c.y - 0.06 * R, 0.4 * R), // 2 fundo do nariz
    new Vector3(0, c.y - 0.24 * R, 0.08), // 3 nasofaringe
    new Vector3(0, c.y - 0.8 * R, 0.04), // 4 faringe
    new Vector3(0, laringeTopo, Z_ORGAOS), // 5 laringe (topo)
    new Vector3(0, m.troncoTopo + 0.01, Z_ORGAOS), // 6 laringe (base) = início da traqueia
    new Vector3(0, (m.troncoTopo + m.carinaY) / 2, Z_ORGAOS), // 7 meio da traqueia
    new Vector3(0, m.carinaY + 0.05, Z_ORGAOS), // 8 fim da traqueia
    new Vector3(s * 0.04, m.carinaY - 0.03, Z_ORGAOS), // 9 carina
    new Vector3(s * 0.13, m.carinaY - 0.1, Z_ORGAOS), // 10 brônquio
    new Vector3(s * 0.21, m.pulmaoY, Z_ORGAOS), // 11 dentro do pulmão
    new Vector3(s * 0.23, m.pulmaoY - m.pulmaoAltura * 0.55, Z_ORGAOS), // 12 fundo do pulmão
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

/** Lado (x) de cada pulmão: meia-distância entre os centros. */
export const ladoPulmao = (m: Medidas) => m.largura * 0.46

/** Centro de cada parte, para rótulos e câmera. */
export function centroDaParte(m: Medidas, parte: Parte): Vector3 {
  const c = m.cabeca
  const R = RAIO_CABECA
  switch (parte) {
    case 'nariz':
      return new Vector3(0, c.y - 0.14 * R, 0.62 * R)
    case 'faringe':
      return new Vector3(0, c.y - 0.52 * R, 0.06)
    case 'laringe':
      return new Vector3(0, m.troncoTopo + 0.08, Z_ORGAOS)
    case 'traqueia':
      return new Vector3(0, (m.troncoTopo + m.carinaY) / 2, Z_ORGAOS)
    case 'bronquios':
      return new Vector3(0, m.carinaY - 0.1, Z_ORGAOS)
    case 'pulmoes':
      return new Vector3(0, m.pulmaoY, Z_ORGAOS)
    case 'alveolos':
      return new Vector3(ladoPulmao(m), m.pulmaoY - 0.08, Z_ORGAOS)
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
    nariz: [0.5, 0.08, 0.1],
    faringe: [-0.6, 0.0, 0.1],
    laringe: [0.45, 0.04, 0.2],
    traqueia: [0.48, 0.0, 0.3],
    bronquios: [-0.55, -0.05, 0.3],
    pulmoes: [0.0, m.pulmaoAltura + 0.22, 0.4],
    alveolos: [0.55, 0.26, 0.35],
    diafragma: [0.0, -0.25, 0.45],
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
    nariz: [1.0, 0.25, 1.4],
    faringe: [1.4, 0.12, 1.1],
    laringe: [0.85, 0.2, 1.65],
    traqueia: [0.65, 0.2, 2.15],
    bronquios: [0.2, 0.2, 2.1],
    pulmoes: [0.0, 0.25, 2.8],
    alveolos: [0.5, 0.2, 2.2],
    diafragma: [0.0, 0.5, 2.7],
  }
  if (parte === 'alveolos') alvo.x += 0.12
  const [dx, dy, dz] = desvio[parte]
  return { posicao: alvo.clone().add(new Vector3(dx, dy, dz)), alvo }
}
