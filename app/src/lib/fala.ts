/**
 * Leitura em voz alta (Web Speech API, voz do próprio aparelho, sem internet).
 * Ajuda quem ainda não lê bem ou prefere ouvir. Todas as telas com texto têm
 * um botão "Ouvir"; na respiração a voz também guia cada fase.
 */

type Ouvinte = (falando: boolean) => void
const ouvintes = new Set<Ouvinte>()
let textoAtual: string | null = null

function avisar(falando: boolean) {
  ouvintes.forEach((o) => o(falando))
}

/** Componentes se inscrevem para saber se há fala em andamento. */
export function aoMudarFala(o: Ouvinte): () => void {
  ouvintes.add(o)
  return () => ouvintes.delete(o)
}

export function textoFalando(): string | null {
  return textoAtual
}

function vozPortugues(): SpeechSynthesisVoice | undefined {
  const vozes = window.speechSynthesis?.getVoices() ?? []
  return vozes.find((v) => v.lang === 'pt-BR') ?? vozes.find((v) => v.lang.toLowerCase().startsWith('pt'))
}

export function podeFalar(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/** Fala o texto (interrompe o que estiver falando antes). */
export function falar(texto: string, { rapido = false }: { rapido?: boolean } = {}) {
  if (!podeFalar()) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'pt-BR'
    u.rate = rapido ? 1 : 0.85 // um pouco mais devagar que o normal
    u.pitch = 1.05
    const voz = vozPortugues()
    if (voz) u.voice = voz
    u.onend = u.onerror = () => {
      if (textoAtual === texto) {
        textoAtual = null
        avisar(false)
      }
    }
    textoAtual = texto
    avisar(true)
    window.speechSynthesis.speak(u)
  } catch {
    textoAtual = null
    avisar(false)
  }
}

export function pararFala() {
  try {
    if (podeFalar()) window.speechSynthesis.cancel()
  } catch {
    /* nada a fazer */
  }
  if (textoAtual !== null) {
    textoAtual = null
    avisar(false)
  }
}
