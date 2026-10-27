import { describe, expect, it } from 'vitest'
import { aleatorio, colide, gerarPercurso, pegouOxigenio, posVirus, type Obstaculo } from './obstaculos'
import { CAMINHOS, FASES, faseEm, LADO_POR_SINAL, S_ESCOLHA, paraMundo, raioEm, S } from './percurso'
import { Simulacao, VIDAS } from './simulacao'

describe('percurso', () => {
  it('as fases vêm em ordem ao longo do caminho', () => {
    for (let i = 1; i < FASES.length; i++) expect(FASES[i].inicio).toBeGreaterThan(FASES[i - 1].inicio)
    expect(faseEm(0).id).toBe('fora')
    expect(faseEm(S.fim).id).toBe('alveolo')
  })

  it('o túnel afina do nariz até os bronquíolos', () => {
    expect(raioEm(S.narina + 5)).toBeGreaterThan(raioEm(S.traqueia + 10))
    expect(raioEm(S.traqueia + 10)).toBeGreaterThan(raioEm(S.fim))
    expect(raioEm(S.fim)).toBeGreaterThan(1)
  })

  it('os dois caminhos são iguais até a carina e se separam depois', () => {
    const d = paraMundo(CAMINHOS.direito, S.traqueia, 0, 0)
    const e = paraMundo(CAMINHOS.esquerdo, S.traqueia, 0, 0)
    expect(d.distanceTo(e)).toBeLessThan(0.5)
    const df = CAMINHOS.direito.curva.getPointAt(1)
    const ef = CAMINHOS.esquerdo.curva.getPointAt(1)
    expect(df.distanceTo(ef)).toBeGreaterThan(40)
  })

  it('cada sinal na bifurcação leva a um pulmão diferente', () => {
    expect(LADO_POR_SINAL.positivo).not.toBe(LADO_POR_SINAL.negativo)
  })
})

describe('colisão', () => {
  it('poeira: bate perto, passa longe', () => {
    const o: Obstaculo = { tipo: 'poeira', s: 50, x: 1, y: 0, r: 0.5 }
    expect(colide(o, 50, 1.2, 0, 0)).toBe(true)
    expect(colide(o, 50, -1.5, 0, 0)).toBe(false)
    expect(colide(o, 53, 1, 0, 0)).toBe(false) // já passou
  })

  it('pelo: bate na parte que sai da parede, não no centro oposto', () => {
    const o: Obstaculo = { tipo: 'pelo', s: S.narina + 10, ang: 0, comp: 1.8 }
    const R = raioEm(o.s)
    expect(colide(o, o.s, R - 1, 0, 0)).toBe(true)
    expect(colide(o, o.s, -R + 1, 0, 0)).toBe(false)
  })

  it('vírus: colisão acompanha o movimento', () => {
    const o: Obstaculo = { tipo: 'virus', s: 100, cx: 0, cy: 0, amp: 1, vel: 1, fase: 0, r: 0.5 }
    const [x1, y1] = posVirus(o, 0)
    expect(colide(o, 100, x1, y1, 0)).toBe(true)
    const [x2, y2] = posVirus(o, Math.PI)
    expect(colide(o, 100, x1, y1, Math.PI)).toBe(Math.hypot(x1 - x2, y1 - y2) < 0.9)
  })

  it('epiglote: bloqueia um lado e libera o outro', () => {
    const o: Obstaculo = { tipo: 'epiglote', s: S.laringe, vel: 0, fase: 0 }
    expect(colide(o, o.s, 1, 0, 0)).toBe(true)
    expect(colide(o, o.s, -1.2, 0, 0)).toBe(false)
  })

  it('oxigênio: pega quando passa em cima', () => {
    expect(pegouOxigenio({ id: 1, s: 30, x: 0, y: 0 }, 30.2, 0.3, 0)).toBe(true)
    expect(pegouOxigenio({ id: 1, s: 30, x: 0, y: 0 }, 30.2, 2, 0)).toBe(false)
  })
})

describe('gerarPercurso', () => {
  it('é sempre igual para a mesma semente', () => {
    expect(gerarPercurso(3)).toEqual(gerarPercurso(3))
    expect(aleatorio(1)()).toBe(aleatorio(1)())
  })

  it('tem obstáculos de todos os tipos e oxigênio dentro do túnel', () => {
    const { obstaculos, oxigenios } = gerarPercurso()
    const tipos = new Set(obstaculos.map((o) => o.tipo))
    for (const t of ['pelo', 'poeira', 'polen', 'virus', 'epiglote']) expect(tipos.has(t as Obstaculo['tipo'])).toBe(true)
    expect(oxigenios.length).toBeGreaterThan(40)
    for (const o of oxigenios) expect(Math.hypot(o.x, o.y)).toBeLessThan(raioEm(o.s))
  })
})

describe('Simulacao', () => {
  it('não anda antes de começar', () => {
    const j = new Simulacao()
    j.passo(0.05)
    expect(j.s).toBe(2)
  })

  it('perde fôlego ao bater e termina quando acaba', () => {
    const j = new Simulacao()
    j.iniciar()
    // sem desviar, a partícula bate até perder o jogo ou chega ao fim
    for (let i = 0; i < 20000 && j.status === 'jogando'; i++) j.passo(1 / 60)
    expect(['perdeu', 'venceu']).toContain(j.status)
    if (j.status === 'perdeu') expect(j.vidas).toBe(0)
    expect(j.batidas).toBeGreaterThan(0)
  })

  it('escolhe o pulmão pelo lado em que passa na bifurcação', () => {
    const j = new Simulacao()
    j.iniciar()
    j.vidas = 999
    j.mirar(1, 0)
    for (let i = 0; i < 20000 && !j.lado; i++) j.passo(1 / 60)
    expect(j.lado).toBe(LADO_POR_SINAL.positivo)
  })

  it('dá de 1 a 3 estrelas ao vencer', () => {
    const j = new Simulacao()
    j.iniciar()
    j.vidas = 999
    for (let i = 0; i < 40000 && j.status === 'jogando'; i++) j.passo(1 / 60)
    expect(j.status).toBe('venceu')
    expect(j.estrelas()).toBeGreaterThanOrEqual(1)
    expect(j.estrelas()).toBeLessThanOrEqual(3)
    expect(VIDAS).toBe(3)
  })

  it('para o jogo por 2 s a cada mensagem', () => {
    const j = new Simulacao()
    j.iniciar()
    expect(j.pausa?.tipo).toBe('aviso')
    const s0 = j.s
    for (let i = 0; i < 100; i++) j.passo(1 / 60) // 1,67 s: ainda pausado
    expect(j.s).toBe(s0)
    expect(j.pausa).not.toBeNull()
    for (let i = 0; i < 30; i++) j.passo(1 / 60) // passa dos 2 s
    expect(j.pausa).toBeNull()
    j.passo(1 / 60)
    expect(j.s).toBeGreaterThan(s0)
  })

  it('na bifurcação, espera 3 s e escolhe o lado em que a partícula ficou', () => {
    const j = new Simulacao()
    j.iniciar()
    j.vidas = 999
    j.mirar(1, 0)
    for (let i = 0; i < 40000 && j.pausa?.tipo !== 'escolha'; i++) j.passo(1 / 60)
    expect(j.pausa?.tipo).toBe('escolha')
    expect(j.s).toBe(S_ESCOLHA)
    // o jogador muda de ideia durante a contagem
    j.mirar(-1, 0)
    for (let i = 0; i < 170; i++) j.passo(1 / 60)
    expect(j.lado).toBeNull()
    expect(j.s).toBe(S_ESCOLHA)
    for (let i = 0; i < 20 && !j.lado; i++) j.passo(1 / 60)
    expect(j.lado).toBe(LADO_POR_SINAL.negativo)
    expect(j.pausa?.tipo).toBe('aviso') // depois mostra o pulmão escolhido
  })
})
