import { duracaoCiclo, faseNoTempo, type Fase, type Ritmo } from './respiracao'

/**
 * Desafio de ritmo: o jogador SEGURA o botão enquanto inspira (e segura o ar)
 * e SOLTA enquanto expira. A cada ciclo, calculamos quanto do tempo ele
 * acompanhou certo e damos uma nota.
 */

export type Nota = 'perfeito' | 'bom' | 'quase'

export interface ResultadoCiclo {
  ciclo: number
  precisao: number // 0 a 1
  nota: Nota
  pontos: number
  combo: number
}

/** Logo depois que a fase muda, damos um tempinho para a pessoa reagir. */
export const TOLERANCIA = 0.45

export const deveSegurar = (f: Fase) => f === 'inspirar' || f === 'segurar'

export function notaPara(precisao: number): Nota {
  if (precisao >= 0.85) return 'perfeito'
  if (precisao >= 0.6) return 'bom'
  return 'quase'
}

export class Placar {
  pontos = 0
  combo = 0
  melhorCombo = 0
  resultados: ResultadoCiclo[] = []
  // acertos e tempo separados para a parte de segurar e a de soltar,
  // para que "nunca apertar" (ou "apertar sempre") não pareça bom
  private certo = { segurar: 0, soltar: 0 }
  private total = { segurar: 0, soltar: 0 }
  private cicloAtual = 0
  private ritmo: Ritmo

  constructor(ritmo: Ritmo) {
    this.ritmo = ritmo
  }

  /** Registra um instante t (s) com o botão pressionado ou não. Devolve o resultado quando um ciclo termina. */
  registrar(t: number, pressionado: boolean, dt: number): ResultadoCiclo | null {
    const e = faseNoTempo(t, this.ritmo)
    let fechou: ResultadoCiclo | null = null
    if (e.ciclo !== this.cicloAtual) {
      fechou = this.fecharCiclo()
      this.cicloAtual = e.ciclo
    }
    const desdeInicioFase = e.progressoFase * this.duracaoFase(e.fase)
    if (desdeInicioFase >= TOLERANCIA) {
      const parte = deveSegurar(e.fase) ? 'segurar' : 'soltar'
      this.total[parte] += dt
      if (pressionado === deveSegurar(e.fase)) this.certo[parte] += dt
    }
    return fechou
  }

  /** Fecha o ciclo em andamento (chamar também no fim da sessão). */
  fecharCiclo(): ResultadoCiclo | null {
    const { segurar: ts, soltar: tl } = this.total
    if (ts + tl < 0.5) {
      this.zerar()
      return null
    }
    const partes = [ts > 0 ? this.certo.segurar / ts : null, tl > 0 ? this.certo.soltar / tl : null].filter((x): x is number => x !== null)
    const precisao = partes.reduce((a, b) => a + b, 0) / partes.length
    const nota = notaPara(precisao)
    this.combo = nota === 'quase' ? 0 : this.combo + 1
    this.melhorCombo = Math.max(this.melhorCombo, this.combo)
    const pontos = nota === 'perfeito' ? 100 + (this.combo - 1) * 25 : nota === 'bom' ? 50 : 10
    this.pontos += pontos
    const r = { ciclo: this.cicloAtual, precisao, nota, pontos, combo: this.combo }
    this.resultados.push(r)
    this.zerar()
    return r
  }

  private zerar() {
    this.certo = { segurar: 0, soltar: 0 }
    this.total = { segurar: 0, soltar: 0 }
  }

  get precisaoMedia(): number {
    if (!this.resultados.length) return 0
    return this.resultados.reduce((a, r) => a + r.precisao, 0) / this.resultados.length
  }

  /** 3 estrelas: média ≥ 85%; 2: ≥ 65%; 1: terminou */
  estrelas(): number {
    if (!this.resultados.length) return 0
    const p = this.precisaoMedia
    return p >= 0.85 ? 3 : p >= 0.65 ? 2 : 1
  }

  private duracaoFase(f: Fase) {
    return this.ritmo[f]
  }

  get duracaoCiclo() {
    return duracaoCiclo(this.ritmo)
  }
}
