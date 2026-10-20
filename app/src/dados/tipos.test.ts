import { describe, expect, it } from 'vitest'
import base from '../../../data/processed/indicadores.json'
import { formatarValor, paraLinhas, type BaseIndicadores, type Grafico } from './tipos'

const g: Grafico = {
  id: 'x',
  titulo: 't',
  descricao: 'd',
  tipo: 'barra',
  unidade: '%',
  fonte: 'f',
  url: 'u',
  categorias: ['Meninos', 'Meninas'],
  series: [{ nome: '2019', valores: [8, 27] }],
}

describe('paraLinhas', () => {
  it('monta uma linha por categoria', () => {
    expect(paraLinhas(g)).toEqual([
      { categoria: 'Meninos', '2019': 8 },
      { categoria: 'Meninas', '2019': 27 },
    ])
  })
})

describe('formatarValor', () => {
  it('formata porcentagem no padrão brasileiro', () => {
    expect(formatarValor(50.6, '%')).toBe('50,6%')
  })
  it('formata contagens com separador de milhar', () => {
    expect(formatarValor(123456, 'internações')).toBe('123.456 internações')
  })
})

describe('arquivo de dados real', () => {
  const b = base as BaseIndicadores

  it('tem indicadores com fonte e link', () => {
    expect(b.indicadores.length).toBeGreaterThan(0)
    for (const i of b.indicadores) {
      expect(i.fonte).toBeTruthy()
      expect(i.url).toMatch(/^https?:\/\//)
      expect(Number.isFinite(i.valor)).toBe(true)
    }
  })

  it('cada série tem um valor por categoria', () => {
    for (const gr of b.graficos) {
      for (const s of gr.series) expect(s.valores).toHaveLength(gr.categorias.length)
    }
  })
})
