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

/** Precisa ser chamado a partir de um clique (regra dos navegadores). */
export function liberarAudio() {
  contexto()
}
