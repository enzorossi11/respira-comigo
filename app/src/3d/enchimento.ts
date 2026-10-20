import { faseNoTempo, type Fase } from '../lib/respiracao'
import { useApp } from '../store'

export interface Pulso {
  /** 0 = pulmões vazios, 1 = cheios */
  enchimento: number
  fase: Fase
  /** true quando a respiração guiada comanda o personagem */
  guiado: boolean
}

/**
 * Lê o estado atual sem causar re-render (para usar dentro de useFrame).
 * Fora da respiração guiada, o personagem respira sozinho num ritmo calmo (8 s).
 */
export function lerPulso(relogio: number): Pulso {
  const s = useApp.getState()
  if (s.tela === 'respirar' && (s.rodando || s.acumulado > 0)) {
    const e = faseNoTempo(s.tempo(), s.ritmo)
    return { enchimento: e.enchimento, fase: e.fase, guiado: true }
  }
  const x = (relogio % 8) / 8
  const enchimento = 0.5 - 0.5 * Math.cos(x * Math.PI * 2)
  return { enchimento, fase: x < 0.5 ? 'inspirar' : 'expirar', guiado: false }
}
