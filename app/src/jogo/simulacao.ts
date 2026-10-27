import { colide, gerarPercurso, pegouOxigenio, RAIO_JOGADOR, type Obstaculo, type Oxigenio } from './obstaculos'
import { faseEm, LADO_POR_SINAL, raioEm, S, S_BIFURCACAO, type Lado } from './percurso'

/**
 * Regras da Jornada do ar, sem nada de 3D: avança a partícula, aplica o
 * controle, verifica colisões e coleta. O componente 3D só desenha o estado.
 */

export type Status = 'pronto' | 'jogando' | 'venceu' | 'perdeu'

export type Evento =
  | { tipo: 'batida'; obstaculo: Obstaculo['tipo'] }
  | { tipo: 'oxigenio'; id: number }
  | { tipo: 'fase'; id: string }
  | { tipo: 'lado'; lado: Lado }
  | { tipo: 'venceu' }
  | { tipo: 'perdeu' }

export const VIDAS = 3
export const VELOCIDADE = 10 // unidades por segundo
const INVULNERAVEL = 1.3 // segundos depois de uma batida
const RECUO = 2.5 // a batida empurra a partícula um pouco para trás

export class Simulacao {
  readonly obstaculos: Obstaculo[]
  readonly oxigenios: Oxigenio[]
  status: Status = 'pronto'
  s = 2
  x = 0
  y = 0
  alvoX = 0
  alvoY = 0
  t = 0
  vidas = VIDAS
  pontos = 0
  coletados = new Set<number>()
  batidas = 0
  invulneravelAte = 0
  lado: Lado | null = null
  fase = faseEm(0).id
  /** velocidade atual (desacelera um pouco depois de bater) */
  vel = VELOCIDADE
  /** maior passo de tempo aceito por quadro (maior só nos testes automáticos) */
  maxDt = 0.05

  constructor(semente = 7) {
    const p = gerarPercurso(semente)
    this.obstaculos = p.obstaculos
    this.oxigenios = p.oxigenios
  }

  get progresso() {
    return Math.min(1, this.s / S.fim)
  }

  get invulneravel() {
    return this.t < this.invulneravelAte
  }

  /** Lado do caminho para desenhar: antes da bifurcação, tanto faz */
  get ladoAtual(): Lado {
    return this.lado ?? (this.x >= 0 ? LADO_POR_SINAL.positivo : LADO_POR_SINAL.negativo)
  }

  iniciar() {
    if (this.status === 'pronto') this.status = 'jogando'
  }

  /** Alvo em coordenadas normalizadas (-1 a 1), vindas do mouse, toque ou teclado */
  mirar(nx: number, ny: number) {
    this.alvoX = Math.max(-1, Math.min(1, nx))
    this.alvoY = Math.max(-1, Math.min(1, ny))
  }

  passo(dt: number): Evento[] {
    const ev: Evento[] = []
    if (this.status !== 'jogando') return ev
    dt = Math.min(dt, this.maxDt) // evita "teletransporte" se a aba travar
    this.t += dt

    // velocidade volta ao normal aos poucos depois de uma batida
    // lá fora a partícula voa mais rápido (o trecho até o nariz é longo)
    const alvoVel = this.s < S.narina - 8 ? VELOCIDADE * 1.8 : VELOCIDADE
    this.vel += (alvoVel - this.vel) * Math.min(1, dt * 1.5)
    this.s += this.vel * dt

    // movimento suave até o alvo, sem sair do túnel
    const R = raioEm(this.s) - RAIO_JOGADOR - 0.15
    const tx = this.alvoX * R
    const ty = this.alvoY * R
    const k = 1 - Math.exp(-dt * 7)
    this.x += (tx - this.x) * k
    this.y += (ty - this.y) * k
    const d = Math.hypot(this.x, this.y)
    if (d > R) {
      this.x *= R / d
      this.y *= R / d
    }

    // escolha do pulmão
    if (!this.lado && this.s >= S_BIFURCACAO) {
      this.lado = this.x >= 0 ? LADO_POR_SINAL.positivo : LADO_POR_SINAL.negativo
      ev.push({ tipo: 'lado', lado: this.lado })
    }

    // fase
    const f = faseEm(this.s).id
    if (f !== this.fase) {
      this.fase = f
      ev.push({ tipo: 'fase', id: f })
    }

    // oxigênio
    for (const o of this.oxigenios) {
      if (this.coletados.has(o.id) || Math.abs(o.s - this.s) > 1.5) continue
      if (pegouOxigenio(o, this.s, this.x, this.y)) {
        this.coletados.add(o.id)
        this.pontos += 10
        ev.push({ tipo: 'oxigenio', id: o.id })
      }
    }

    // obstáculos
    if (!this.invulneravel) {
      for (const o of this.obstaculos) {
        if (Math.abs(o.s - this.s) > 1.5) continue
        if (colide(o, this.s, this.x, this.y, this.t)) {
          this.vidas -= 1
          this.batidas += 1
          this.invulneravelAte = this.t + INVULNERAVEL
          this.s = Math.max(1, this.s - RECUO)
          this.vel = VELOCIDADE * 0.35
          ev.push({ tipo: 'batida', obstaculo: o.tipo })
          if (this.vidas <= 0) {
            this.status = 'perdeu'
            ev.push({ tipo: 'perdeu' })
          }
          break
        }
      }
    }

    if (this.status === 'jogando' && this.s >= S.fim) {
      this.s = S.fim
      this.status = 'venceu'
      this.pontos += this.vidas * 50 // bônus por fôlego que sobrou
      ev.push({ tipo: 'venceu' })
    }
    return ev
  }

  /** 1 a 3 estrelas: chegar, chegar sem perder fôlego, e pegar bastante O₂ */
  estrelas(): number {
    if (this.status !== 'venceu') return 0
    const fracO2 = this.coletados.size / Math.max(1, this.oxigenios.length)
    return 1 + (this.batidas === 0 ? 1 : 0) + (fracO2 >= 0.6 ? 1 : 0)
  }
}
