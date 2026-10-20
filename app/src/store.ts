import { create } from 'zustand'
import { ciclosNaSessao, duracaoCiclo, normalizarRitmo, PRESETS, type Ritmo } from './lib/respiracao'

export type Tela = 'inicio' | 'caminho' | 'respirar' | 'dados'

const CHAVE = 'respira-comigo:prefs'

interface Prefs {
  ritmo: Ritmo
  presetId: string
  duracaoMin: number
  som: boolean
  sessoes: number
}

const PADRAO: Prefs = {
  ritmo: PRESETS[0].ritmo,
  presetId: PRESETS[0].id,
  duracaoMin: 2,
  som: false,
  sessoes: 0,
}

/** localStorage pode falhar (aba anônima, bloqueio) — o app funciona sem ele. */
function carregar(): Prefs {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return PADRAO
    const p = { ...PADRAO, ...JSON.parse(bruto) } as Prefs
    return { ...p, ritmo: normalizarRitmo(p.ritmo) }
  } catch {
    return PADRAO
  }
}

function salvar(p: Prefs) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p))
  } catch {
    /* sem persistência, sem problema */
  }
}

interface Estado extends Prefs {
  tela: Tela
  etapa: number
  /** sessão de respiração */
  rodando: boolean
  inicioMs: number
  acumulado: number
  concluida: boolean

  irPara: (t: Tela) => void
  setEtapa: (i: number) => void
  setRitmo: (r: Ritmo, presetId?: string) => void
  setDuracao: (min: number) => void
  setSom: (v: boolean) => void
  iniciar: () => void
  pausar: () => void
  reiniciar: () => void
  /** segundos desde o início da sessão (sem contar pausas) */
  tempo: () => number
  /** duração total da sessão, arredondada para ciclos inteiros */
  duracaoSessao: () => number
  concluir: () => void
}

const inicial = carregar()

export const useApp = create<Estado>((set, get) => {
  const persistir = () => {
    const { ritmo, presetId, duracaoMin, som, sessoes } = get()
    salvar({ ritmo, presetId, duracaoMin, som, sessoes })
  }

  return {
    ...inicial,
    tela: 'inicio',
    etapa: 0,
    rodando: false,
    inicioMs: 0,
    acumulado: 0,
    concluida: false,

    irPara: (tela) => {
      if (tela !== 'respirar' && get().rodando) get().pausar()
      set({ tela })
      window.scrollTo?.({ top: 0 })
    },
    setEtapa: (i) => set({ etapa: Math.max(0, Math.min(2, i)) }),
    setRitmo: (r, presetId = 'personalizado') => {
      set({ ritmo: normalizarRitmo(r), presetId, acumulado: 0, rodando: false, concluida: false })
      persistir()
    },
    setDuracao: (duracaoMin) => {
      set({ duracaoMin })
      persistir()
    },
    setSom: (som) => {
      set({ som })
      persistir()
    },
    iniciar: () => {
      const s = get()
      set({
        rodando: true,
        inicioMs: performance.now(),
        acumulado: s.concluida ? 0 : s.acumulado,
        concluida: false,
      })
    },
    pausar: () => {
      if (!get().rodando) return
      set({ rodando: false, acumulado: get().tempo() })
    },
    reiniciar: () => set({ rodando: false, acumulado: 0, concluida: false }),
    tempo: () => {
      const s = get()
      return s.rodando ? s.acumulado + (performance.now() - s.inicioMs) / 1000 : s.acumulado
    },
    duracaoSessao: () => {
      const s = get()
      return ciclosNaSessao(s.duracaoMin * 60, s.ritmo) * duracaoCiclo(s.ritmo)
    },
    concluir: () => {
      set({ rodando: false, concluida: true, acumulado: 0, sessoes: get().sessoes + 1 })
      persistir()
    },
  }
})
