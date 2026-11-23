import { describe, expect, it } from 'vitest'
import { PARADAS } from '../conteudo/paradas'
import { caminhoDoAr, cameraDaParte, centroDaParte, CHAO_Y, faixaDaIdade, fracoesDosPontos, medidas, NARINA, NARIZ, pontosDoAr, RAIO_CABECA, superficieRosto, TRECHO_PARTE } from './forma'
import { IDADE_MAX, IDADE_MIN, normalizarPerfil, PERFIL_PADRAO } from './perfil'

describe('planta do personagem de desenho', () => {
  it('as três faixas de idade cobrem toda a escala da personalização', () => {
    expect(faixaDaIdade(IDADE_MIN)).toBe('crianca')
    expect(faixaDaIdade(Math.round((IDADE_MIN + IDADE_MAX) / 2))).toBe('jovem')
    expect(faixaDaIdade(IDADE_MAX)).toBe('adulto')
  })

  it('o adulto é mais alto que a criança, com os pés sempre no chão', () => {
    const c = medidas({ idade: IDADE_MIN })
    const a = medidas({ idade: IDADE_MAX })
    expect(a.cabeca.y).toBeGreaterThan(c.cabeca.y)
    expect(c.quadril).toBeGreaterThan(CHAO_Y)
  })

  it('o corpo segue a ordem de cima para baixo: cabeça, laringe, pulmões, diafragma', () => {
    const m = medidas(PERFIL_PADRAO)
    const y = (p: Parameters<typeof centroDaParte>[1]) => centroDaParte(m, p).y
    expect(y('nariz')).toBeGreaterThan(y('laringe'))
    expect(y('laringe')).toBeGreaterThan(y('traqueia'))
    expect(y('traqueia')).toBeGreaterThan(y('pulmoes'))
    expect(y('pulmoes')).toBeGreaterThan(y('diafragma'))
  })
})

describe('rosto', () => {
  it('o nariz fica no meio do rosto, encostado na pele, e a narina embaixo dele', () => {
    expect(NARIZ.centro.z).toBeGreaterThan(RAIO_CABECA * 0.8)
    expect(Math.abs(NARIZ.centro.z - superficieRosto(0, NARIZ.centro.y))).toBeLessThan(NARIZ.raio)
    expect(NARINA.y).toBeLessThan(NARIZ.centro.y)
  })

  it('o queixo deixa o rosto mais fino embaixo (rosto de gente, não uma bola)', () => {
    const larguraEm = (y: number) => {
      let x = 0
      while (superficieRosto(x, y) > 0) x += 0.005
      return x
    }
    expect(larguraEm(-0.4 * RAIO_CABECA)).toBeLessThan(larguraEm(0))
  })
})

describe('caminho do ar', () => {
  const m = medidas(PERFIL_PADRAO)

  it('começa na narina, desce sempre e termina dentro de um pulmão de cada lado', () => {
    for (const s of [1, -1] as const) {
      const p = pontosDoAr(m, s)
      expect(p[0].z).toBeGreaterThan(RAIO_CABECA * 0.85) // a narina fica na frente do rosto
      for (let i = 4; i < p.length; i++) expect(p[i].y).toBeLessThan(p[i - 1].y + 1e-9)
      expect(Math.sign(p[p.length - 1].x)).toBe(s)
    }
  })

  it('as frações do caminho crescem de 0 a 1', () => {
    const f = fracoesDosPontos(caminhoDoAr(m, 1))
    expect(f[0]).toBe(0)
    expect(f[f.length - 1]).toBeCloseTo(1, 6)
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThan(f[i - 1])
  })

  it('toda parada tem câmera mirando a sua parte, de perto e pela frente', () => {
    for (const { parte } of PARADAS) {
      const c = cameraDaParte(m, parte)
      expect(c.posicao.z).toBeGreaterThan(c.alvo.z)
      expect(c.posicao.distanceTo(c.alvo)).toBeLessThan(3.6)
      const t = TRECHO_PARTE[parte]
      if (t) expect(t[1]).toBeGreaterThan(t[0])
    }
  })
})

describe('perfil salvo', () => {
  it('corrige valores fora da faixa', () => {
    const p = normalizarPerfil({ idade: 99, pele: -3, corCabelo: 50, corpo: 'x' as never })
    expect(p.idade).toBe(IDADE_MAX)
    expect(p.pele).toBe(0)
    expect(p.corpo).toBe('masculino')
  })
})
