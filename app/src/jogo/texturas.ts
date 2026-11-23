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

/** Parede das vias aéreas, em versão de desenho: rosa-claro liso, com manchinhas suaves (sem vasos). */
export function texturaParede(): CanvasTexture {
  if (parede) return parede
  const [c, g] = canvas(512, 512)
  const rnd = aleatorio(11)
  g.fillStyle = '#fbe3e8'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 512
    const y = rnd() * 512
    const r = 14 + rnd() * 46
    for (const dx of [-512, 0, 512])
      for (const dy of [-512, 0, 512]) {
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
        grad.addColorStop(0, rnd() < 0.6 ? 'rgba(255,255,255,0.4)' : 'rgba(240,150,175,0.16)')
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = grad
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
      }
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  parede = t
  return t
}
