import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { aleatorio } from './obstaculos'

/** Texturas desenhadas na hora (sem arquivos de imagem). */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

let parede: CanvasTexture | null = null

/** Parede úmida das vias aéreas: base clara com vasinhos e manchas. */
export function texturaParede(): CanvasTexture {
  if (parede) return parede
  const [c, g] = canvas(512, 512)
  const rnd = aleatorio(11)
  g.fillStyle = '#f4e9ea'
  g.fillRect(0, 0, 512, 512)
  // manchas suaves
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 512
    const y = rnd() * 512
    const r = 10 + rnd() * 40
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(170,70,90,0.12)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // vasinhos sanguíneos (desenhados com wrap para a textura emendar)
  const vaso = (x: number, y: number, ang: number, larg: number, n: number) => {
    g.lineWidth = larg
    for (let k = 0; k < n; k++) {
      const nx = x + Math.cos(ang) * 14
      const ny = y + Math.sin(ang) * 14
      for (const dx of [-512, 0, 512])
        for (const dy of [-512, 0, 512]) {
          g.beginPath()
          g.moveTo(x + dx, y + dy)
          g.lineTo(nx + dx, ny + dy)
          g.stroke()
        }
      x = nx
      y = ny
      ang += (rnd() - 0.5) * 0.9
      if (rnd() < 0.12 && larg > 0.8) {
        vaso(x, y, ang + (rnd() < 0.5 ? 0.9 : -0.9), larg * 0.6, n - k)
        g.lineWidth = larg
      }
    }
  }
  g.lineCap = 'round'
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(${150 + rnd() * 40},${30 + rnd() * 30},${60 + rnd() * 30},0.45)`
    g.lineWidth = 2.2 + rnd() * 1.6
    vaso(rnd() * 512, rnd() * 512, rnd() * 6.28, g.lineWidth, 26)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  parede = t
  return t
}

let pele: CanvasTexture | null = null

/** Pele do rosto, vista bem de perto, lá fora. */
export function texturaPele(): CanvasTexture {
  if (pele) return pele
  const [c, g] = canvas(512, 512)
  const rnd = aleatorio(5)
  g.fillStyle = '#f3c3a2'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(200,120,90,0.10)' : 'rgba(255,230,210,0.18)'
    const r = 1 + rnd() * 4
    g.beginPath()
    g.arc(rnd() * 512, rnd() * 512, r, 0, Math.PI * 2)
    g.fill()
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(6, 6)
  t.colorSpace = SRGBColorSpace
  pele = t
  return t
}
