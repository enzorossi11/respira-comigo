import { useEffect, useState } from 'react'
import { aoMudarFala, falar, pararFala, podeFalar, textoFalando } from '../lib/fala'
import { IconeOuvir, IconePausa } from './Icones'

/**
 * Botão "Ouvir": lê em voz alta o texto daquele bloco. Tocar de novo para.
 * Se o aparelho não tiver voz, o botão não aparece.
 */
export function BotaoOuvir({ texto, className = '' }: { texto: string; className?: string }) {
  const [falando, setFalando] = useState(false)

  useEffect(() => aoMudarFala(() => setFalando(textoFalando() === texto)), [texto])
  // ao trocar de texto (outra parada, outra tela), a fala anterior para
  useEffect(() => () => pararFala(), [texto])

  if (!podeFalar()) return null
  return (
    <button
      type="button"
      className={`btn btn-secundario btn-ouvir ${className}`}
      onClick={() => (falando ? pararFala() : falar(texto))}
      aria-pressed={falando}
      aria-label={falando ? 'Parar de ouvir' : 'Ouvir este texto'}
    >
      {falando ? <IconePausa tamanho={26} /> : <IconeOuvir tamanho={28} />}
      {falando ? 'Parar' : 'Ouvir'}
    </button>
  )
}
