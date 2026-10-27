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

/** Tons de pele: textura do MakeHuman + uma cor que multiplica a textura */
export const TONS: { nome: string; textura: 'clara' | 'media' | 'escura'; tinta: string; amostra: string }[] = [
  { nome: 'Clara', textura: 'clara', tinta: '#ffffff', amostra: '#e3b090' },
  { nome: 'Média clara', textura: 'clara', tinta: '#efdfd2', amostra: '#d49c78' },
  { nome: 'Média', textura: 'media', tinta: '#ffffff', amostra: '#b08266' },
  { nome: 'Morena', textura: 'media', tinta: '#d4b4a0', amostra: '#8e6448' },
  { nome: 'Escura', textura: 'escura', tinta: '#ffffff', amostra: '#5d3925' },
]

/**
 * Cores de cabelo. A textura do cabelo é castanha; `fator` multiplica a textura
 * (valores acima de 1 clareiam — é assim que o loiro e o ruivo aparecem).
 */
export const CORES_CABELO: { nome: string; amostra: string; fator: [number, number, number] }[] = [
  { nome: 'Preto', amostra: '#1f1b18', fator: [0.22, 0.2, 0.19] },
  { nome: 'Castanho escuro', amostra: '#4a3528', fator: [0.55, 0.45, 0.38] },
  { nome: 'Castanho', amostra: '#7a5638', fator: [1.0, 0.8, 0.62] },
  { nome: 'Ruivo', amostra: '#b5562c', fator: [2.1, 1.05, 0.6] },
  { nome: 'Loiro', amostra: '#d9b46a', fator: [2.6, 2.1, 1.25] },
]

const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * Pesos dos "morph targets" do corpo.glb, na ordem
 * [Feminino, Jovem, FemininoJovem, Magro, Largo].
 * Jovem vai de 0 (25 anos) a 1 (12 anos); FemininoJovem é a correção do cruzamento.
 */
export function pesosDoPerfil(p: Perfil): number[] {
  const f = p.corpo === 'feminino' ? 1 : 0
  const j = lim((IDADE_MAX - p.idade) / (IDADE_MAX - IDADE_MIN), 0, 1)
  // biotipo fica sempre no padrão (corpo médio, saudável): Magro e Largo em zero
  return [f, j, f * j, 0, 0]
}

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
