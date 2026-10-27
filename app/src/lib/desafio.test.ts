import { describe, expect, it } from 'vitest'
import { deveSegurar, notaPara, Placar } from './desafio'
import { faseNoTempo, type Ritmo } from './respiracao'

const calma: Ritmo = { inspirar: 4, segurar: 0, expirar: 6, pausa: 0 }
const dt = 1 / 60

function jogar(p: Placar, ciclos: number, decidir: (t: number) => boolean) {
  const out = []
  const fim = ciclos * p.duracaoCiclo
  for (let t = 0; t < fim; t += dt) {
    const r = p.registrar(t, decidir(t), dt)
    if (r) out.push(r)
  }
  const r = p.fecharCiclo()
  if (r) out.push(r)
  return out
}

describe('desafio de ritmo', () => {
  it('segura ao inspirar e ao segurar o ar; solta ao expirar e na pausa', () => {
    expect(deveSegurar('inspirar')).toBe(true)
    expect(deveSegurar('segurar')).toBe(true)
    expect(deveSegurar('expirar')).toBe(false)
    expect(deveSegurar('pausa')).toBe(false)
  })

  it('quem acompanha certinho ganha "perfeito", combo e 3 estrelas', () => {
    const p = new Placar(calma)
    const res = jogar(p, 4, (t) => deveSegurar(faseNoTempo(t, calma).fase))
    expect(res).toHaveLength(4)
    expect(res.every((r) => r.nota === 'perfeito')).toBe(true)
    expect(p.melhorCombo).toBe(4)
    expect(p.pontos).toBe(100 + 125 + 150 + 175)
    expect(p.estrelas()).toBe(3)
  })

  it('quem reage um pouco atrasado ainda tira nota boa (tolerância)', () => {
    const p = new Placar(calma)
    const res = jogar(p, 3, (t) => deveSegurar(faseNoTempo(Math.max(0, t - 0.3), calma).fase))
    expect(res.every((r) => r.nota === 'perfeito')).toBe(true)
  })

  it('quem nunca aperta, ou aperta o tempo todo, não pontua bem', () => {
    for (const sempre of [false, true]) {
      const p = new Placar(calma)
      const res = jogar(p, 2, () => sempre)
      expect(res.every((r) => r.nota === 'quase')).toBe(true)
      expect(p.combo).toBe(0)
      expect(p.estrelas()).toBe(1)
    }
  })

  it('notas por faixa de precisão', () => {
    expect(notaPara(0.9)).toBe('perfeito')
    expect(notaPara(0.7)).toBe('bom')
    expect(notaPara(0.3)).toBe('quase')
  })
})
