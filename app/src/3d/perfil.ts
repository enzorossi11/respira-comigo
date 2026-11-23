/**
 * Personalização do personagem. Fica só no navegador (localStorage) e nunca
 * sai do aparelho.
 */
export interface Perfil {
  corpo: 'feminino' | 'masculino'
  /** 12 a 25 (25 = adulto) */
  idade: number
  /** índice em TONS */
  pele: number
  cabelo: 'curto' | 'longo'
  /** índice em CORES_CABELO */
  corCabelo: number
}

export const IDADE_MIN = 12
export const IDADE_MAX = 25

export const PERFIL_PADRAO: Perfil = {
  corpo: 'masculino',
  idade: 15,
  pele: 2,
  cabelo: 'curto',
  corCabelo: 1,
}

/** Tons de pele (a mesma cor aparece na amostra e no personagem) */
export const TONS: { nome: string; amostra: string }[] = [
  { nome: 'Clara', amostra: '#f2c9a8' },
  { nome: 'Média clara', amostra: '#dfaa84' },
  { nome: 'Média', amostra: '#bf8a64' },
  { nome: 'Morena', amostra: '#9a6747' },
  { nome: 'Escura', amostra: '#6b4430' },
]

export const CORES_CABELO: { nome: string; amostra: string }[] = [
  { nome: 'Preto', amostra: '#2b2522' },
  { nome: 'Castanho escuro', amostra: '#5a3d2b' },
  { nome: 'Castanho', amostra: '#8a5e3b' },
  { nome: 'Ruivo', amostra: '#c8602f' },
  { nome: 'Loiro', amostra: '#e6c06e' },
]

const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Confere e completa um perfil vindo do localStorage */
export function normalizarPerfil(p: Partial<Perfil> | null | undefined): Perfil {
  const q = { ...PERFIL_PADRAO, ...(p ?? {}) }
  return {
    corpo: q.corpo === 'feminino' ? 'feminino' : 'masculino',
    idade: Math.round(lim(Number(q.idade) || PERFIL_PADRAO.idade, IDADE_MIN, IDADE_MAX)),
    pele: Math.round(lim(Number(q.pele) || 0, 0, TONS.length - 1)),
    cabelo: q.cabelo === 'longo' ? 'longo' : 'curto',
    corCabelo: Math.round(lim(Number(q.corCabelo) || 0, 0, CORES_CABELO.length - 1)),
  }
}
