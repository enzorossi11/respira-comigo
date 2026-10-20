import { describe, expect, it } from 'vitest'
import {
  ciclosNaSessao,
  duracaoCiclo,
  faseNoTempo,
  normalizarRitmo,
  PRESETS,
  respiracoesPorMinuto,
  type Ritmo,
} from './respiracao'

const calma: Ritmo = { inspirar: 4, segurar: 0, expirar: 6, pausa: 0 }
const quadrada: Ritmo = { inspirar: 4, segurar: 4, expirar: 4, pausa: 4 }

describe('duração e frequência', () => {
  it('soma as fases do ciclo', () => {
    expect(duracaoCiclo(calma)).toBe(10)
    expect(duracaoCiclo(quadrada)).toBe(16)
  })

  it('calcula respirações por minuto', () => {
    expect(respiracoesPorMinuto(calma)).toBe(6)
    expect(respiracoesPorMinuto(quadrada)).toBe(3.8)
  })

  it('todos os presets ficam em ritmo lento (≤ 6 por minuto)', () => {
    for (const p of PRESETS) expect(respiracoesPorMinuto(p.ritmo)).toBeLessThanOrEqual(6)
  })
})

describe('faseNoTempo', () => {
  it('começa inspirando com pulmões vazios', () => {
    const e = faseNoTempo(0, calma)
    expect(e.fase).toBe('inspirar')
    expect(e.enchimento).toBe(0)
    expect(e.restante).toBe(4)
  })

  it('pula fases com duração zero', () => {
    expect(faseNoTempo(4.5, calma).fase).toBe('expirar')
  })

  it('fica cheio enquanto segura', () => {
    const e = faseNoTempo(5, quadrada)
    expect(e.fase).toBe('segurar')
    expect(e.enchimento).toBe(1)
  })

  it('esvazia na expiração e pausa vazio', () => {
    expect(faseNoTempo(8.01, quadrada).enchimento).toBeGreaterThan(0.99)
    expect(faseNoTempo(10, quadrada).enchimento).toBeCloseTo(0.5)
    expect(faseNoTempo(11.99, quadrada).enchimento).toBeLessThan(0.01)
    const pausa = faseNoTempo(13, quadrada)
    expect(pausa.fase).toBe('pausa')
    expect(pausa.enchimento).toBe(0)
  })

  it('conta os ciclos e recomeça', () => {
    const e = faseNoTempo(21, calma)
    expect(e.ciclo).toBe(2)
    expect(e.fase).toBe('inspirar')
    expect(e.progressoCiclo).toBeCloseTo(0.1)
  })

  it('a contagem regressiva desce de segundo em segundo', () => {
    expect(faseNoTempo(0.2, calma).restante).toBe(4)
    expect(faseNoTempo(1.2, calma).restante).toBe(3)
    expect(faseNoTempo(3.9, calma).restante).toBe(1)
  })

  it('ignora tempo negativo', () => {
    expect(faseNoTempo(-3, calma).fase).toBe('inspirar')
  })
})

describe('normalizarRitmo', () => {
  it('prende valores fora dos limites', () => {
    expect(normalizarRitmo({ inspirar: 0, segurar: -2, expirar: 99, pausa: 3.6 })).toEqual({
      inspirar: 2,
      segurar: 0,
      expirar: 10,
      pausa: 4,
    })
  })

  it('trata NaN', () => {
    expect(normalizarRitmo({ inspirar: NaN, segurar: 0, expirar: 6, pausa: 0 }).inspirar).toBe(2)
  })
})

describe('ciclosNaSessao', () => {
  it('cabe 12 ciclos de 10 s em 2 minutos', () => {
    expect(ciclosNaSessao(120, calma)).toBe(12)
  })
  it('nunca é zero', () => {
    expect(ciclosNaSessao(1, quadrada)).toBe(1)
  })
})
