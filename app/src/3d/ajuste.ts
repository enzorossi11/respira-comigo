/**
 * Encaixe dos órgãos (Z-Anatomy) dentro do corpo personalizado (MakeHuman).
 *
 * Os dois modelos têm proporções diferentes, e o corpo do MakeHuman muda com a
 * personalização (idade e sexo). Por isso, em vez de uma posição fixa,
 * medimos "âncoras" na pele do tronco dos dois corpos — com a mesma regra — e
 * levamos os órgãos de um para o outro:
 *  - fúrcula (o "buraquinho" na base do pescoço) e cintura → escala e posição na vertical;
 *  - largura e profundidade do peito → escala na horizontal e na profundidade;
 *  - narina → o trecho de cima (nariz e faringe) é puxado até a narina do corpo novo.
 *
 * Tudo em metros, no sistema do modelo (pés em y = 0, olhando para +z).
 */

export type V3 = { x: number; y: number; z: number }

export interface Ancoras {
  /** fúrcula: ponto da linha do meio, na frente, onde o pescoço encontra o peito */
  furcula: { y: number; z: number }
  /** altura da cintura (onde o tronco é mais estreito) */
  cintura: number
  /** fatia do peito, um pouco abaixo da fúrcula */
  peito: { y: number; largura: number; profundidade: number; centroZ: number }
  /** centro entre as narinas */
  narina: V3
}

/**
 * Mede as âncoras na pele do tronco. `pos` é a lista de vértices (x, y, z, x, y, z…).
 * A busca usa a altura da narina como referência, para funcionar com qualquer altura.
 */
export function medirAncoras(pos: ArrayLike<number>, narina: V3): Ancoras {
  const n = pos.length / 3
  const X = (i: number) => pos[i * 3]
  const Y = (i: number) => pos[i * 3 + 1]
  const Z = (i: number) => pos[i * 3 + 2]

  // fúrcula: na linha do meio, a frente do corpo é mais "funda" logo abaixo do pescoço
  let fy = narina.y - 0.14
  let fz = Infinity
  const passo = 0.005
  for (let y = narina.y - 0.2; y <= narina.y - 0.08; y += passo) {
    let frente = -Infinity
    for (let i = 0; i < n; i++) {
      if (Math.abs(X(i)) < 0.012 && Math.abs(Y(i) - y) < 0.008 && Z(i) > frente) frente = Z(i)
    }
    if (frente > -Infinity && frente < fz) {
      fz = frente
      fy = y
    }
  }

  // largura do tronco numa altura
  const fatia = (y: number) => {
    let x0 = Infinity
    let x1 = -Infinity
    let z0 = Infinity
    let z1 = -Infinity
    for (let i = 0; i < n; i++) {
      if (Math.abs(Y(i) - y) > 0.008) continue
      x0 = Math.min(x0, X(i))
      x1 = Math.max(x1, X(i))
      z0 = Math.min(z0, Z(i))
      z1 = Math.max(z1, Z(i))
    }
    return { largura: x1 - x0, profundidade: z1 - z0, centroZ: (z0 + z1) / 2 }
  }

  // cintura: a fatia mais estreita entre 25 e 40 cm abaixo da fúrcula
  let cintura = fy - 0.33
  let menor = Infinity
  for (let y = fy - 0.4; y <= fy - 0.25; y += passo) {
    const l = fatia(y).largura
    if (l > 0 && l < menor) {
      menor = l
      cintura = y
    }
  }

  // peito: a 40% do caminho entre a fúrcula e a cintura
  const py = fy - 0.4 * (fy - cintura)
  return { furcula: { y: fy, z: fz }, cintura, peito: { y: py, ...fatia(py) }, narina }
}

/** Função que leva um ponto do Z-Anatomy para dentro do corpo personalizado. */
export type Mapa = (x: number, y: number, z: number, saida?: V3) => V3

export function criarMapa(de: Ancoras, para: Ancoras): Mapa {
  const sy = (para.furcula.y - para.cintura) / (de.furcula.y - de.cintura)
  const sx = para.peito.largura / de.peito.largura
  const sz = para.peito.profundidade / de.peito.profundidade
  const base = (x: number, y: number, z: number): V3 => ({
    x: x * sx,
    y: para.furcula.y + (y - de.furcula.y) * sy,
    z: para.peito.centroZ + (z - de.peito.centroZ) * sz,
  })
  // o que sobra na narina é corrigido aos poucos do pescoço para cima
  const nb = base(de.narina.x, de.narina.y, de.narina.z)
  const r = { x: para.narina.x - nb.x, y: para.narina.y - nb.y, z: para.narina.z - nb.z }
  const y0 = de.furcula.y + 0.01
  const y1 = de.furcula.y + 0.09
  return (x, y, z, saida = { x: 0, y: 0, z: 0 }) => {
    const b = base(x, y, z)
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)))
    const w = t * t * (3 - 2 * t)
    saida.x = b.x + r.x * w
    saida.y = b.y + r.y * w
    saida.z = b.z + r.z * w
    return saida
  }
}
