import { describe, expect, it } from 'vitest'
import { criarMapa, medirAncoras, type Ancoras } from './ajuste'
import { normalizarPerfil, PERFIL_PADRAO, pesosDoPerfil } from './perfil'

const ZA: Ancoras = {
  furcula: { y: 1.4454, z: 0.04126 },
  cintura: 1.0804,
  peito: { y: 1.2994, largura: 0.34969, profundidade: 0.25822, centroZ: -0.00537 },
  narina: { x: 0, y: 1.5504, z: 0.1026 },
}
const MH: Ancoras = {
  furcula: { y: 1.4451, z: 0.0775 },
  cintura: 1.1101,
  peito: { y: 1.3111, largura: 0.31362, profundidade: 0.23096, centroZ: 0.03061 },
  narina: { x: 0, y: 1.6001, z: 0.1587 },
}

describe('encaixe dos órgãos no corpo personalizado', () => {
  const mapa = criarMapa(ZA, MH)

  it('leva a narina de um corpo exatamente para a narina do outro', () => {
    const n = mapa(0, ZA.narina.y, ZA.narina.z)
    expect(n.y).toBeCloseTo(MH.narina.y, 5)
    expect(n.z).toBeCloseTo(MH.narina.z, 5)
  })

  it('mantém a fúrcula na altura certa e o centro do peito no lugar', () => {
    expect(mapa(0, ZA.furcula.y, 0).y).toBeCloseTo(MH.furcula.y, 5)
    expect(mapa(0, ZA.peito.y, ZA.peito.centroZ).z).toBeCloseTo(MH.peito.centroZ, 5)
  })

  it('estreita os pulmões quando o peito é mais estreito', () => {
    const lado = mapa(0.13, 1.3, 0)
    expect(lado.x).toBeCloseTo(0.13 * (MH.peito.largura / ZA.peito.largura), 5)
  })

  it('mede as âncoras num tronco simples (cilindro com cintura)', () => {
    const pos: number[] = []
    for (let y = 0.9; y <= 1.6; y += 0.004) {
      // mais estreito em 1,1 m; "fúrcula" (frente mais funda) em 1,45 m
      const largura = 0.14 + 0.5 * (y - 1.1) ** 2
      const frente = 0.1 - 0.04 * Math.exp(-(((y - 1.45) / 0.03) ** 2))
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
        pos.push(Math.cos(a) * largura, y, Math.sin(a) > 0 ? Math.sin(a) * frente : Math.sin(a) * 0.1)
      }
    }
    const an = medirAncoras(pos, { x: 0, y: 1.6, z: 0.12 })
    expect(an.furcula.y).toBeCloseTo(1.45, 1)
    expect(an.cintura).toBeCloseTo(1.1, 1)
    expect(an.peito.largura).toBeGreaterThan(0.28)
  })
})

describe('perfil do personagem', () => {
  it('converte as escolhas nos pesos dos morphs', () => {
    expect(pesosDoPerfil({ ...PERFIL_PADRAO, corpo: 'masculino', idade: 25 })).toEqual([0, 0, 0, 0, 0])
    expect(pesosDoPerfil({ ...PERFIL_PADRAO, corpo: 'feminino', idade: 12 })).toEqual([1, 1, 1, 0, 0])
    const [f, j, fj] = pesosDoPerfil({ ...PERFIL_PADRAO, corpo: 'feminino', idade: 18.5 })
    expect(f).toBe(1)
    expect(j).toBeCloseTo(0.5, 5)
    expect(fj).toBeCloseTo(0.5, 5)
  })

  it('o biotipo fica sempre no padrão (sem morph de magro ou largo)', () => {
    for (const idade of [12, 15, 25]) {
      const w = pesosDoPerfil({ ...PERFIL_PADRAO, idade })
      expect(w[3]).toBe(0)
      expect(w[4]).toBe(0)
    }
  })

  it('corrige perfis inválidos vindos do navegador', () => {
    const p = normalizarPerfil({ idade: 99, pele: -3, cabelo: 'x' as never, corCabelo: 50 })
    expect(p.idade).toBe(25)
    expect(p.pele).toBe(0)
    expect(p.cabelo).toBe('curto')
    expect(p.corCabelo).toBe(4)
    expect(normalizarPerfil(null)).toEqual(PERFIL_PADRAO)
  })
})
