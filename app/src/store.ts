import { create } from 'zustand'
import { normalizarPerfil, PERFIL_PADRAO, type Perfil } from './3d/perfil'
import { ciclosNaSessao, duracaoCiclo, normalizarRitmo, PRESETS, type Ritmo } from './lib/respiracao'

export type Tela = 'perfil' | 'inicio' | 'caminho' | 'jornada' | 'respirar' | 'dados'
export type ModoRespirar = 'livre' | 'desafio'
export type Reacao = 'feliz' | 'uau' | 'ops'

const CHAVE = 'respira-comigo:prefs'

interface Prefs {
  ritmo: Ritmo
  presetId: string
  duracaoMin: number
  som: boolean
  sessoes: number
  recordeJornada: number
  estrelasJornada: number
  recordeRitmo: number
  /** personagem criado pelo usuário (null = ainda não criou) */
  perfil: Perfil | null
}

const PADRAO: Prefs = {
  ritmo: PRESETS[0].ritmo,
  presetId: PRESETS[0].id,
  duracaoMin: 2,
  som: true,
  sessoes: 0,
  recordeJornada: 0,
  estrelasJornada: 0,
  recordeRitmo: 0,
  perfil: null,
}

/** localStorage pode falhar (aba anônima, bloqueio) — o app funciona sem ele. */
function carregar(): Prefs {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return PADRAO
    const p = { ...PADRAO, ...JSON.parse(bruto) } as Prefs
    return { ...p, ritmo: normalizarRitmo(p.ritmo), perfil: p.perfil ? normalizarPerfil(p.perfil) : null }
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
  modo: ModoRespirar
  /** última reação do personagem (o 3D usa o instante para animar) */
  reacao: { tipo: Reacao; em: number } | null

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
  setModo: (m: ModoRespirar) => void
  reagir: (tipo: Reacao) => void
  registrarJornada: (pontos: number, estrelas: number) => boolean
  registrarRitmo: (pontos: number) => boolean
  /** perfil em edição na tela de personalização (ainda não salvo) */
  rascunho: Perfil
  setRascunho: (p: Partial<Perfil>) => void
  salvarPerfil: () => void
  editarPerfil: () => void
}

const inicial = carregar()

export const useApp = create<Estado>((set, get) => {
  const persistir = () => {
    const { ritmo, presetId, duracaoMin, som, sessoes, recordeJornada, estrelasJornada, recordeRitmo, perfil } = get()
    salvar({ ritmo, presetId, duracaoMin, som, sessoes, recordeJornada, estrelasJornada, recordeRitmo, perfil })
  }

  return {
    ...inicial,
    // primeiro acesso: começa criando o personagem
    tela: inicial.perfil ? 'inicio' : 'perfil',
    etapa: 0,
    rascunho: inicial.perfil ?? PERFIL_PADRAO,
    rodando: false,
    inicioMs: 0,
    acumulado: 0,
    concluida: false,
    modo: 'livre',
    reacao: null,

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
    setModo: (modo) => set({ modo, rodando: false, acumulado: 0, concluida: false }),
    reagir: (tipo) => set({ reacao: { tipo, em: performance.now() } }),
    registrarJornada: (pontos, estrelas) => {
      const recorde = pontos > get().recordeJornada
      set({ recordeJornada: Math.max(get().recordeJornada, pontos), estrelasJornada: Math.max(get().estrelasJornada, estrelas) })
      persistir()
      return recorde
    },
    setRascunho: (p) => set({ rascunho: normalizarPerfil({ ...get().rascunho, ...p }) }),
    salvarPerfil: () => {
      set({ perfil: get().rascunho, tela: 'inicio' })
      persistir()
      window.scrollTo?.({ top: 0 })
    },
    editarPerfil: () => {
      set({ rascunho: get().perfil ?? PERFIL_PADRAO, tela: 'perfil' })
      window.scrollTo?.({ top: 0 })
    },
    registrarRitmo: (pontos) => {
      const recorde = pontos > get().recordeRitmo
      set({ recordeRitmo: Math.max(get().recordeRitmo, pontos) })
      persistir()
      return recorde
    },
  }
})
