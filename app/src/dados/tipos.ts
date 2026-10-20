/** Formato de data/processed/indicadores.json (gerado pelos scripts em data/scripts). */

export interface Indicador {
  id: string
  titulo: string
  valor: number
  unidade: string
  publico: string
  ano: number
  fonte: string
  url: string
}

export interface Serie {
  nome: string
  valores: (number | null)[]
}

export interface Grafico {
  id: string
  titulo: string
  descricao: string
  tipo: 'barra' | 'linha'
  unidade: string
  fonte: string
  url: string
  categorias: string[]
  series: Serie[]
}

export interface BaseIndicadores {
  gerado_em: string
  indicadores: Indicador[]
  graficos: Grafico[]
}

/** Transforma o formato "categorias + séries" no formato de linhas que o Recharts usa. */
export function paraLinhas(g: Grafico): Record<string, string | number | null>[] {
  return g.categorias.map((cat, i) => {
    const linha: Record<string, string | number | null> = { categoria: cat }
    for (const s of g.series) linha[s.nome] = s.valores[i] ?? null
    return linha
  })
}

export function formatarValor(v: number, unidade: string): string {
  if (unidade === '%') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
  return `${v.toLocaleString('pt-BR')}${unidade ? ` ${unidade}` : ''}`
}
