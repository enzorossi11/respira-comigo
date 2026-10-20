/**
 * Lógica pura da respiração guiada (sem React, sem 3D) — fácil de testar.
 *
 * Um ciclo é: inspirar → segurar (opcional) → expirar → pausa (opcional).
 * `faseNoTempo` diz em que fase estamos num instante t (segundos desde o início)
 * e quanto os pulmões devem estar "cheios" (0 = vazio, 1 = cheio).
 */

export type Fase = 'inspirar' | 'segurar' | 'expirar' | 'pausa'

export interface Ritmo {
  inspirar: number
  segurar: number
  expirar: number
  pausa: number
}

export interface EstadoRespiracao {
  fase: Fase
  /** 0 → 1 dentro da fase atual */
  progressoFase: number
  /** segundos que faltam na fase atual (arredondado para cima) */
  restante: number
  /** 0 = pulmões vazios, 1 = cheios (já com suavização) */
  enchimento: number
  /** índice do ciclo atual, começando em 0 */
  ciclo: number
  /** 0 → 1 dentro do ciclo completo (para o marcador no anel) */
  progressoCiclo: number
}

export interface Preset {
  id: string
  nome: string
  descricao: string
  ritmo: Ritmo
}

export const PRESETS: Preset[] = [
  {
    id: 'calma',
    nome: 'Calma',
    descricao: 'Expiração mais longa que a inspiração. Bom para desacelerar.',
    ritmo: { inspirar: 4, segurar: 0, expirar: 6, pausa: 0 },
  },
  {
    id: 'equilibrio',
    nome: 'Equilíbrio',
    descricao: 'Cinco segundos para entrar e cinco para sair: cerca de 6 respirações por minuto.',
    ritmo: { inspirar: 5, segurar: 0, expirar: 5, pausa: 0 },
  },
  {
    id: 'quadrada',
    nome: 'Quadrada',
    descricao: 'Quatro tempos iguais. Ajuda a manter o foco antes de uma prova.',
    ritmo: { inspirar: 4, segurar: 4, expirar: 4, pausa: 4 },
  },
]

export const LIMITES = {
  inspirar: { min: 2, max: 8 },
  segurar: { min: 0, max: 7 },
  expirar: { min: 2, max: 10 },
  pausa: { min: 0, max: 7 },
} as const

export const ROTULO_FASE: Record<Fase, string> = {
  inspirar: 'Inspire',
  segurar: 'Segure',
  expirar: 'Solte o ar',
  pausa: 'Pausa',
}

export function duracaoCiclo(r: Ritmo): number {
  return r.inspirar + r.segurar + r.expirar + r.pausa
}

export function respiracoesPorMinuto(r: Ritmo): number {
  const d = duracaoCiclo(r)
  return d > 0 ? Math.round((60 / d) * 10) / 10 : 0
}

/** Garante que o ritmo fica dentro dos limites seguros. */
export function normalizarRitmo(r: Ritmo): Ritmo {
  const lim = (v: number, k: keyof Ritmo) =>
    Math.min(LIMITES[k].max, Math.max(LIMITES[k].min, Math.round(Number.isFinite(v) ? v : LIMITES[k].min)))
  return {
    inspirar: lim(r.inspirar, 'inspirar'),
    segurar: lim(r.segurar, 'segurar'),
    expirar: lim(r.expirar, 'expirar'),
    pausa: lim(r.pausa, 'pausa'),
  }
}

/** Curva suave (ease-in-out) para o peito não "dar trancos". */
export function suavizar(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

export function faseNoTempo(t: number, ritmo: Ritmo): EstadoRespiracao {
  const r = normalizarRitmo(ritmo)
  const total = duracaoCiclo(r)
  const tempo = Math.max(0, t)
  const ciclo = Math.floor(tempo / total)
  const dentro = tempo - ciclo * total

  const fases: [Fase, number][] = [
    ['inspirar', r.inspirar],
    ['segurar', r.segurar],
    ['expirar', r.expirar],
    ['pausa', r.pausa],
  ]

  let acumulado = 0
  for (const [fase, dur] of fases) {
    if (dur <= 0) continue
    if (dentro < acumulado + dur) {
      const progressoFase = (dentro - acumulado) / dur
      let enchimento = 0
      if (fase === 'inspirar') enchimento = suavizar(progressoFase)
      else if (fase === 'segurar') enchimento = 1
      else if (fase === 'expirar') enchimento = 1 - suavizar(progressoFase)
      return {
        fase,
        progressoFase,
        restante: Math.max(1, Math.ceil(acumulado + dur - dentro - 1e-9)),
        enchimento,
        ciclo,
        progressoCiclo: dentro / total,
      }
    }
    acumulado += dur
  }
  // inalcançável na prática (dentro < total), mas mantém o tipo seguro
  return { fase: 'inspirar', progressoFase: 0, restante: r.inspirar, enchimento: 0, ciclo: ciclo + 1, progressoCiclo: 0 }
}

/** Quantos ciclos completos cabem na duração escolhida (mínimo 1). */
export function ciclosNaSessao(duracaoSegundos: number, r: Ritmo): number {
  return Math.max(1, Math.round(duracaoSegundos / duracaoCiclo(normalizarRitmo(r))))
}
