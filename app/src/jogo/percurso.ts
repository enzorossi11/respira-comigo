import { CatmullRomCurve3, Vector3 } from 'three'

/**
 * Percurso da "Jornada do ar": a partícula começa fora do corpo, entra pela
 * narina e desce até um alvéolo. Tudo é descrito pela distância percorrida
 * `s` (em unidades da cena) ao longo de uma curva, e cada posição é dada no
 * referencial local da curva: x (lado) e y (cima), dentro do túnel.
 */

export type Lado = 'direito' | 'esquerdo'

export interface Fase {
  id: string
  nome: string
  dica: string
  inicio: number // s em que a fase começa
}

export interface Quadro {
  ponto: Vector3
  tangente: Vector3
  normal: Vector3 // "cima" local
  binormal: Vector3 // "lado" local
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

/** Pontos de controle comuns (de fora até a carina) */
const PREFIXO = [
  v(0, -38, 112), // lá fora, na altura do peito do personagem gigante
  v(0, -24, 64),
  v(0, -10, 22),
  v(0, -3.5, 5),
  v(0, 0, 0), // narina (embaixo do nariz: o ar entra subindo)
  v(0, 4, -6), // cavidade nasal
  v(0, 6.5, -18),
  v(0, 3, -34),
  v(0, -10, -48), // nasofaringe (curva para baixo)
  v(0, -30, -52), // faringe
  v(0, -48, -50), // laringe / epiglote
  v(0, -64, -48), // início da traqueia
  v(0, -92, -47),
  v(0, -118, -47), // carina
]

/** Ramo de cada brônquio, a partir da carina (x espelhado) */
const RAMO = (sx: number) => [
  v(9 * sx, -128, -47),
  v(19 * sx, -145, -45.5),
  v(25 * sx, -164, -44),
  v(28 * sx, -182, -43),
  v(30 * sx, -198, -42.5), // bronquíolo terminal
  v(31 * sx, -208, -42.2), // entrada do alvéolo
]

/** Lado do personagem: o pulmão direito fica à esquerda de quem olha de frente,
 *  mas aqui o jogador está DENTRO do corpo olhando para baixo, então usamos o
 *  lado do próprio corpo: direito = x negativo. */
const SINAL: Record<Lado, number> = { direito: -1, esquerdo: 1 }

export interface Caminho {
  curva: CatmullRomCurve3
  comprimento: number
  quadros: Quadro[]
  passo: number // distância entre quadros
}

/** Referencial por transporte paralelo, começando com "cima" = +y do mundo. */
function construirQuadros(curva: CatmullRomCurve3, n: number): Quadro[] {
  const quadros: Quadro[] = []
  let normal = v(0, 1, 0)
  let tangAnterior: Vector3 | null = null
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const ponto = curva.getPointAt(u)
    const tangente = curva.getTangentAt(u).normalize()
    if (tangAnterior) {
      // gira a normal junto com a tangente (sem torcer o túnel)
      const eixo = new Vector3().crossVectors(tangAnterior, tangente)
      const senAng = eixo.length()
      if (senAng > 1e-6) {
        eixo.divideScalar(senAng)
        const ang = Math.atan2(senAng, tangAnterior.dot(tangente))
        normal = normal.clone().applyAxisAngle(eixo, ang)
      }
    }
    // re-ortogonaliza
    normal.sub(tangente.clone().multiplyScalar(normal.dot(tangente))).normalize()
    const binormal = new Vector3().crossVectors(tangente, normal).normalize()
    quadros.push({ ponto, tangente, normal: normal.clone(), binormal })
    tangAnterior = tangente
  }
  return quadros
}

function criarCaminho(lado: Lado): Caminho {
  const curva = new CatmullRomCurve3([...PREFIXO, ...RAMO(SINAL[lado])], false, 'centripetal')
  const comprimento = curva.getLength()
  const n = Math.ceil(comprimento / 0.5)
  return { curva, comprimento, quadros: construirQuadros(curva, n), passo: comprimento / n }
}

export const CAMINHOS: Record<Lado, Caminho> = {
  direito: criarCaminho('direito'),
  esquerdo: criarCaminho('esquerdo'),
}

/** Distância s do ponto da curva mais próximo de `alvo`. */
function sProximo(c: Caminho, alvo: Vector3): number {
  let melhor = 0
  let d = Infinity
  c.quadros.forEach((q, i) => {
    const di = q.ponto.distanceToSquared(alvo)
    if (di < d) {
      d = di
      melhor = i
    }
  })
  return melhor * c.passo
}

const D = CAMINHOS.direito
export const S = {
  narina: sProximo(D, PREFIXO[4]),
  faringe: sProximo(D, PREFIXO[8]),
  laringe: sProximo(D, PREFIXO[10]),
  traqueia: sProximo(D, PREFIXO[11]),
  carina: sProximo(D, PREFIXO[13]),
  bronquiolo: sProximo(D, RAMO(-1)[3]),
  fim: D.comprimento - 2,
}

/** O jogador escolhe o pulmão quando chega aqui */
export const S_BIFURCACAO = S.carina + 1
/** Onde o jogo para para o jogador escolher o pulmão (a bifurcação já aparece logo à frente) */
export const S_ESCOLHA = S.carina - 4

export const FASES: Fase[] = [
  { id: 'fora', nome: 'Lá fora', dica: 'Você é uma partícula de ar. Mire na narina e desvie da poeira e do pólen!', inicio: 0 },
  { id: 'nariz', nome: 'Nariz', dica: 'Os pelos e o muco seguram a sujeira. Desvie dos pelos!', inicio: S.narina },
  { id: 'faringe', nome: 'Faringe e laringe', dica: 'A epiglote fecha a passagem quando a gente engole. Passe pelo lado aberto!', inicio: S.faringe },
  { id: 'traqueia', nome: 'Traqueia', dica: 'Os cílios varrem a sujeira para cima. Cuidado com os vírus!', inicio: S.traqueia },
  { id: 'bronquios', nome: 'Brônquios', dica: 'Os brônquios levam o ar para cada pulmão. Logo à frente o caminho se divide em dois.', inicio: S.carina - 10 },
  { id: 'bronquiolos', nome: 'Bronquíolos', dica: 'Os tubos ficam cada vez mais finos. Quase lá!', inicio: S.bronquiolo },
  { id: 'alveolo', nome: 'Alvéolo', dica: 'Chegou! Aqui o oxigênio passa para o sangue.', inicio: S.fim - 6 },
]

export function faseEm(s: number): Fase {
  let atual = FASES[0]
  for (const f of FASES) if (s >= f.inicio) atual = f
  return atual
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Raio do túnel em cada ponto do caminho. */
export function raioEm(s: number): number {
  let r = 5.5 // lá fora: área livre na frente do rosto
  r += (3.4 - 5.5) * suave(S.narina - 8, S.narina, s) // narina e cavidade nasal
  r +=(2.8 - 3.4) * suave(S.faringe - 6, S.faringe + 4, s) // faringe
  r += (2.3 - 2.8) * suave(S.laringe - 4, S.laringe + 2, s) // laringe (mais estreita)
  r += (2.6 - 2.3) * suave(S.traqueia - 4, S.traqueia + 4, s) // traqueia
  r += (3.4 - 2.6) * suave(S.carina - 14, S.carina, s) // alarga na carina
  r += (2.1 - 3.4) * suave(S.carina + 2, S.carina + 22, s) // brônquio
  r += (1.5 - 2.1) * suave(S.bronquiolo - 10, S.bronquiolo + 6, s) // bronquíolo
  return r
}

/** Quadro (posição e eixos) interpolado em s. */
export function quadroEm(c: Caminho, s: number): Quadro {
  const t = Math.min(c.quadros.length - 1, Math.max(0, s / c.passo))
  const i = Math.floor(t)
  const j = Math.min(c.quadros.length - 1, i + 1)
  const f = t - i
  const a = c.quadros[i]
  const b = c.quadros[j]
  return {
    ponto: a.ponto.clone().lerp(b.ponto, f),
    tangente: a.tangente.clone().lerp(b.tangente, f).normalize(),
    normal: a.normal.clone().lerp(b.normal, f).normalize(),
    binormal: a.binormal.clone().lerp(b.binormal, f).normalize(),
  }
}

/** Posição no mundo de um ponto (x, y) do referencial local em s. */
export function paraMundo(c: Caminho, s: number, x: number, y: number, alvo = new Vector3()): Vector3 {
  const q = quadroEm(c, s)
  return alvo.copy(q.ponto).addScaledVector(q.binormal, x).addScaledVector(q.normal, y)
}

/**
 * Na bifurcação, qual sinal de x leva a cada pulmão (depende de como o
 * referencial girou ao longo da descida).
 */
export const LADO_POR_SINAL: { positivo: Lado; negativo: Lado } = (() => {
  const q = quadroEm(D, S_BIFURCACAO)
  const paraEsq = CAMINHOS.esquerdo.curva.getPointAt(Math.min(1, (S.carina + 15) / CAMINHOS.esquerdo.comprimento))
  const dir = paraEsq.sub(q.ponto)
  return dir.dot(q.binormal) > 0 ? { positivo: 'esquerdo', negativo: 'direito' } : { positivo: 'direito', negativo: 'esquerdo' }
})()
