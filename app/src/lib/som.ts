import type { Fase } from './respiracao'

/**
 * Sinais sonoros suaves para cada fase, gerados na hora com a Web Audio API
 * (sem arquivos de áudio). Volume baixo de propósito.
 */
let ctx: AudioContext | null = null

function contexto(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

const FREQ: Record<Fase, [number, number]> = {
  inspirar: [262, 392], // sobe
  segurar: [392, 392],
  expirar: [392, 220], // desce
  pausa: [220, 220],
}

export function tocarFase(fase: Fase) {
  const c = contexto()
  if (!c) return
  const agora = c.currentTime
  const osc = c.createOscillator()
  const ganho = c.createGain()
  const [de, para] = FREQ[fase]
  osc.type = 'sine'
  osc.frequency.setValueAtTime(de, agora)
  osc.frequency.exponentialRampToValueAtTime(para, agora + 0.6)
  ganho.gain.setValueAtTime(0.0001, agora)
  ganho.gain.exponentialRampToValueAtTime(fase === 'segurar' || fase === 'pausa' ? 0.03 : 0.06, agora + 0.08)
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.9)
  osc.connect(ganho).connect(c.destination)
  osc.start(agora)
  osc.stop(agora + 1)
}

export type Efeito = 'oxigenio' | 'batida' | 'fase' | 'vitoria' | 'acerto' | 'combo'

/** Efeitos curtos dos jogos */
export function tocarEfeito(efeito: Efeito) {
  const c = contexto()
  if (!c) return
  const agora = c.currentTime
  const nota = (freq: number, ini: number, dur: number, vol: number, tipo: OscillatorType = 'sine', ate?: number) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(freq, agora + ini)
    if (ate) osc.frequency.exponentialRampToValueAtTime(ate, agora + ini + dur)
    g.gain.setValueAtTime(0.0001, agora + ini)
    g.gain.exponentialRampToValueAtTime(vol, agora + ini + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, agora + ini + dur)
    osc.connect(g).connect(c.destination)
    osc.start(agora + ini)
    osc.stop(agora + ini + dur + 0.05)
  }
  switch (efeito) {
    case 'oxigenio':
      nota(880, 0, 0.12, 0.05)
      nota(1320, 0.05, 0.14, 0.04)
      break
    case 'batida':
      nota(180, 0, 0.3, 0.09, 'triangle', 70)
      break
    case 'fase':
      nota(523, 0, 0.18, 0.04)
      nota(784, 0.1, 0.25, 0.04)
      break
    case 'acerto':
      nota(659, 0, 0.18, 0.045)
      break
    case 'combo':
      nota(659, 0, 0.12, 0.045)
      nota(988, 0.08, 0.2, 0.045)
      break
    case 'vitoria':
      ;[523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.12, 0.35, 0.05))
      break
  }
}

/** Precisa ser chamado a partir de um clique (regra dos navegadores). */
export function liberarAudio() {
  contexto()
}
