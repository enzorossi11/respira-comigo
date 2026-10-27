import { FASES, raioEm, S } from './percurso'

/**
 * Obstáculos e oxigênio da Jornada do ar, descritos no referencial local do
 * túnel (s = distância no caminho; x, y = posição na seção do túnel).
 * A colisão é feita nesse referencial, em 2D, o que deixa o teste simples e exato.
 */

export type Obstaculo =
  | { tipo: 'pelo'; s: number; ang: number; comp: number }
  | { tipo: 'poeira' | 'polen'; s: number; x: number; y: number; r: number }
  | { tipo: 'virus'; s: number; cx: number; cy: number; amp: number; vel: number; fase: number; r: number }
  | { tipo: 'epiglote'; s: number; vel: number; fase: number }

export interface Oxigenio {
  id: number
  s: number
  x: number
  y: number
}

export const RAIO_JOGADOR = 0.38
/** Metade da "espessura" de cada obstáculo ao longo do caminho */
const PROFUNDIDADE = { pelo: 0.35, poeira: 0.6, polen: 0.6, virus: 0.55, epiglote: 0.3 } as const

/** Gerador pseudoaleatório com semente (o mesmo percurso toda vez) */
export function aleatorio(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Posição atual do vírus (ele gira devagar em volta de um centro) */
export function posVirus(o: Extract<Obstaculo, { tipo: 'virus' }>, t: number): [number, number] {
  const a = o.fase + t * o.vel
  return [o.cx + Math.cos(a) * o.amp, o.cy + Math.sin(a) * o.amp]
}

/** Ângulo atual da epiglote (meio disco que gira e bloqueia metade do túnel) */
export function anguloEpiglote(o: Extract<Obstaculo, { tipo: 'epiglote' }>, t: number): number {
  return o.fase + t * o.vel
}

function distPontoSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const k = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy))
}

/** O jogador em (s, x, y), no instante t, encosta no obstáculo? */
export function colide(o: Obstaculo, s: number, x: number, y: number, t: number, rj = RAIO_JOGADOR): boolean {
  if (Math.abs(s - o.s) > PROFUNDIDADE[o.tipo] + rj) return false
  switch (o.tipo) {
    case 'pelo': {
      const R = raioEm(o.s)
      const c = Math.cos(o.ang)
      const sn = Math.sin(o.ang)
      return distPontoSegmento(x, y, R * c, R * sn, (R - o.comp) * c, (R - o.comp) * sn) < rj + 0.12
    }
    case 'poeira':
    case 'polen':
      return Math.hypot(x - o.x, y - o.y) < rj + o.r
    case 'virus': {
      const [vx, vy] = posVirus(o, t)
      return Math.hypot(x - vx, y - vy) < rj + o.r
    }
    case 'epiglote': {
      // bloqueia o semiplano para onde aponta; uma folga pequena na borda
      const a = anguloEpiglote(o, t)
      return x * Math.cos(a) + y * Math.sin(a) > -rj * 0.5
    }
  }
}

export function pegouOxigenio(o: Oxigenio, s: number, x: number, y: number): boolean {
  return Math.abs(s - o.s) < 0.9 && Math.hypot(x - o.x, y - o.y) < 0.95
}

/** Monta o percurso completo (mesma semente = mesmo jogo). */
export function gerarPercurso(semente = 7): { obstaculos: Obstaculo[]; oxigenios: Oxigenio[] } {
  const rnd = aleatorio(semente)
  const ob: Obstaculo[] = []
  const dentro = (s: number, folga: number) => {
    // ponto aleatório dentro do túnel, longe da parede
    const R = raioEm(s) - folga
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd()) * R
    return [Math.cos(a) * r, Math.sin(a) * r] as const
  }

  // Lá fora: poeira e pólen flutuando
  for (let s = 16; s < S.narina - 8; s += 7 + rnd() * 3) {
    const [x, y] = dentro(s, 1.2)
    ob.push({ tipo: rnd() < 0.5 ? 'poeira' : 'polen', s, x, y, r: 0.55 + rnd() * 0.35 })
  }

  // Nariz: pelos saindo da parede
  for (let s = S.narina + 6; s < S.faringe - 4; s += 3.6 + rnd() * 1.8) {
    ob.push({ tipo: 'pelo', s, ang: rnd() * Math.PI * 2, comp: 1.5 + rnd() * 0.9 })
    if (rnd() < 0.35) ob.push({ tipo: 'pelo', s: s + 0.4, ang: rnd() * Math.PI * 2, comp: 1.2 + rnd() * 0.6 })
  }

  // Faringe: um pouco de poeira que escapou
  for (const k of [0.3, 0.7]) {
    const s = S.faringe + (S.laringe - S.faringe) * k
    const [x, y] = dentro(s, 1)
    ob.push({ tipo: 'poeira', s, x, y, r: 0.6 })
  }

  // Laringe: a epiglote balançando
  ob.push({ tipo: 'epiglote', s: S.laringe, vel: 1.1, fase: rnd() * Math.PI * 2 })

  // Traqueia: vírus
  for (let s = S.traqueia + 8; s < S.carina - 14; s += 7 + rnd() * 3) {
    const [cx, cy] = dentro(s, 1.2)
    ob.push({ tipo: 'virus', s, cx, cy, amp: 0.5 + rnd() * 0.6, vel: 0.8 + rnd() * 0.8, fase: rnd() * 6.28, r: 0.5 })
  }

  // Depois da bifurcação: vírus e poeira, cada vez mais apertado
  for (let s = S.carina + 10; s < S.fim - 10; s += 6 + rnd() * 2.5) {
    if (rnd() < 0.55) {
      const [cx, cy] = dentro(s, 0.9)
      ob.push({ tipo: 'virus', s, cx, cy, amp: 0.3 + rnd() * 0.3, vel: 0.9 + rnd() * 0.8, fase: rnd() * 6.28, r: 0.42 })
    } else {
      const [x, y] = dentro(s, 0.8)
      ob.push({ tipo: 'poeira', s, x, y, r: 0.42 })
    }
  }

  // Oxigênio: grupos de 4 em arco, longe dos obstáculos
  const oxigenios: Oxigenio[] = []
  let id = 0
  for (let s0 = 10; s0 < S.fim - 6; s0 += 11 + rnd() * 4) {
    const [x0, y0] = dentro(s0, 1.1)
    const ang = rnd() * Math.PI * 2
    for (let k = 0; k < 4; k++) {
      const s = s0 + k * 1.6
      const R = raioEm(s) - 0.7
      let x = x0 + Math.cos(ang) * k * 0.35
      let y = y0 + Math.sin(ang) * k * 0.35
      const r = Math.hypot(x, y)
      if (r > R) {
        x *= R / r
        y *= R / r
      }
      const perto = ob.some((o) => Math.abs(o.s - s) < 2.2 && o.tipo !== 'pelo' && o.tipo !== 'epiglote' && o.tipo !== 'virus' && Math.hypot(x - o.x, y - o.y) < 1.4)
      const pertoEpiglote = Math.abs(s - S.laringe) < 2.5
      if (!perto && !pertoEpiglote) oxigenios.push({ id: id++, s, x, y })
    }
  }

  return { obstaculos: ob, oxigenios }
}

/** Fases que aparecem no mapa de progresso */
export const MARCOS = FASES.map((f) => ({ id: f.id, nome: f.nome, fracao: f.inicio / S.fim }))
