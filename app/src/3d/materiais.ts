/**
 * Materiais de "desenho animado": sombreado em poucos tons, sem textura de pele,
 * sem brilho realista.
 */
import { Color, DataTexture, MeshToonMaterial, NearestFilter, RedFormat, type ColorRepresentation, type Side } from 'three'

let gradiente: DataTexture | null = null

/** Três faixas de luz (sombra, meio, luz): é o que dá o aspecto de desenho. */
function gradienteToon(): DataTexture {
  if (gradiente) return gradiente
  gradiente = new DataTexture(new Uint8Array([150, 210, 255]), 3, 1, RedFormat)
  gradiente.minFilter = NearestFilter
  gradiente.magFilter = NearestFilter
  gradiente.generateMipmaps = false
  gradiente.needsUpdate = true
  return gradiente
}

export function toon(cor: ColorRepresentation, extra: { side?: Side } = {}): MeshToonMaterial {
  return new MeshToonMaterial({ color: new Color(cor), gradientMap: gradienteToon(), ...extra })
}

/**
 * "Vidro" de desenho: o meio é quase transparente e a borda fica mais forte,
 * como o contorno de uma garrafa. Serve para o tronco (e para a cabeça no
 * caminho do ar) deixar os órgãos à vista sem sumir a silhueta.
 */
export function vidro(cor: ColorRepresentation, opacidade: number): MeshToonMaterial {
  const m = toon(cor)
  m.transparent = true
  m.opacity = opacidade
  m.depthWrite = false
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
  float borda = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
  borda = smoothstep(0.55, 0.95, borda);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.72, borda);
  gl_FragColor.a = mix(gl_FragColor.a, min(1.0, gl_FragColor.a * 1.8 + 0.45), borda);`,
    )
  }
  m.customProgramCacheKey = () => 'vidro-toon'
  return m
}
