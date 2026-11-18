/**
 * Ícones e ilustrações do Respira Comigo.
 *
 * Desenhados à mão em SVG para ficarem iguais em qualquer aparelho (emojis mudam
 * de um sistema para outro). Traço grosso, cantos redondos e poucas cores:
 * fáceis de reconhecer de longe e sem detalhes que distraiam.
 */
import type { ReactNode } from 'react'
import type { Parte } from '../conteudo/etapas'

const NOITE = '#2A2F55'

interface P {
  tamanho?: number
  className?: string
}

function Svg({ tamanho = 24, className, children, vb = 24 }: P & { children: ReactNode; vb?: number }) {
  return (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      width={tamanho}
      height={tamanho}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={vb === 24 ? 2.4 : 4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ------------------------------------------------------------------ interface

export const IconeCasa = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-5h4v5" />
  </Svg>
)

export const IconeSom = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
    <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
)

export const IconeSemSom = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Svg>
)

export const IconeSeta = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
)

export const IconeVoltar = (p: P) => (
  <Svg {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Svg>
)

/** Balão de fala: "ouvir esta frase". */
export const IconeOuvir = (p: P) => (
  <Svg {...p}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4V16h0A2.5 2.5 0 0 1 4 13.5z" />
    <path d="M8.5 9h7M8.5 12h4.5" />
  </Svg>
)

export const IconeCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)

export const IconeRepetir = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.8 4.5v3.8H16" />
  </Svg>
)

export const IconePausa = (p: P) => (
  <Svg {...p}>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconePlay = (p: P) => (
  <Svg {...p}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </Svg>
)

/** Pessoa com seta: mudar o personagem. */
export const IconeAmigo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
  </Svg>
)

export const IconeEstrela = ({ tamanho = 24, className, cheia = true }: P & { cheia?: boolean }) => (
  <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} className={className} aria-hidden="true">
    <path
      d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9L3.5 9.4l5.9-.8z"
      fill={cheia ? '#FFC94A' : '#E6E3F0'}
      stroke={cheia ? '#E8A916' : '#D2CEE0'}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
)

// ------------------------------------------------------- áreas (cartões grandes)

/** Aprender: o caminho pontilhado do nariz até o pulmão. */
export const IlustraAprender = ({ tamanho = 72 }: P) => (
  <svg viewBox="0 0 72 72" width={tamanho} height={tamanho} aria-hidden="true">
    <circle cx="36" cy="36" r="34" fill="#D9F4EF" />
    <path d="M22 18c-3 6-3 10 1 12" fill="none" stroke={NOITE} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M26 30c4 4 10 2 12 8s4 10 6 12" fill="none" stroke="#2BB5A8" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 7" />
    <path d="M44 46c-6-4-12 0-12 8 0 6 6 8 10 5 3-2 3-6 3-9z" fill="#F2909B" />
    <path d="M48 46c6-4 12 0 12 8 0 6-6 8-10 5-3-2-3-6-3-9z" fill="#F2909B" />
    <circle cx="22" cy="17" r="5" fill="#FFC94A" />
  </svg>
)

/** Jogar: a bolinha de oxigênio brilhando, com rastro. */
export const IlustraJogar = ({ tamanho = 72 }: P) => (
  <svg viewBox="0 0 72 72" width={tamanho} height={tamanho} aria-hidden="true">
    <circle cx="36" cy="36" r="34" fill="#FFE6DA" />
    <path d="M12 46c6-2 10-6 14-6M12 36c6 0 10-2 14-2" fill="none" stroke="#FFB38A" strokeWidth="4" strokeLinecap="round" />
    <circle cx="42" cy="36" r="15" fill="#FF8A5B" />
    <circle cx="42" cy="36" r="15" fill="none" stroke="#fff" strokeWidth="3" opacity=".7" />
    <text x="42" y="41.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="14" fill="#fff">
      O₂
    </text>
    <path d="M58 18v6M55 21h6M60 48v4M58 50h4" stroke="#FF8A5B" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

/** Respirar: um balão que enche. */
export const IlustraRespirar = ({ tamanho = 72 }: P) => (
  <svg viewBox="0 0 72 72" width={tamanho} height={tamanho} aria-hidden="true">
    <circle cx="36" cy="36" r="34" fill="#ECE8FF" />
    <ellipse cx="36" cy="31" rx="15" ry="17" fill="#8C7CF0" />
    <ellipse cx="30" cy="25" rx="4" ry="6" fill="#fff" opacity=".45" />
    <path d="M33 48l3 3 3-3z" fill="#8C7CF0" />
    <path d="M36 51c-3 4 3 7 0 12" fill="none" stroke={NOITE} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

// ----------------------------------------------------------- partes do corpo

const FUNDO_PARTE = '#FFFFFF'

export function IlustraParte({ parte, tamanho = 96 }: { parte: Parte; tamanho?: number }) {
  const rosa = '#F2909B'
  const rosaEsc = '#D9606F'
  const azul = '#BFE3F2'
  const azulEsc = '#6FB5D6'
  const conteudo: Record<Parte, ReactNode> = {
    nariz: (
      <>
        <path d="M44 18c-6 14-14 26-14 34 0 6 6 8 12 8s12-2 14-6" fill="#FBD3C0" stroke={NOITE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="40" cy="56" rx="4" ry="2.5" fill={NOITE} />
        <path d="M18 50h8M16 58h10M20 66h8" stroke="#2BB5A8" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
    faringe: (
      <>
        <path d="M30 14c-10 0-16 10-16 20s6 14 12 16v30h28V50c6-2 12-6 12-16S60 14 50 14" fill="#FBD3C0" stroke={NOITE} strokeWidth="4" strokeLinejoin="round" />
        <path d="M40 30v42" stroke={rosaEsc} strokeWidth="9" strokeLinecap="round" />
        <path d="M40 30v42" stroke={rosa} strokeWidth="5" strokeLinecap="round" />
      </>
    ),
    laringe: (
      <>
        <path d="M28 40h24v36H28z" fill={azul} stroke={azulEsc} strokeWidth="4" strokeLinejoin="round" />
        <path d="M28 40c0-10 6-18 12-18s12 8 12 18" fill="none" stroke={azulEsc} strokeWidth="4" />
        <path d="M30 30c6-8 14-12 22-10" stroke={rosaEsc} strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="52" cy="20" r="3" fill={rosaEsc} />
      </>
    ),
    traqueia: (
      <>
        <rect x="30" y="10" width="20" height="62" rx="10" fill={azul} stroke={azulEsc} strokeWidth="4" />
        {[22, 32, 42, 52, 62].map((y) => (
          <path key={y} d={`M30 ${y}h20`} stroke={azulEsc} strokeWidth="4" strokeLinecap="round" />
        ))}
      </>
    ),
    bronquios: (
      <>
        <path d="M40 8v22" stroke={azulEsc} strokeWidth="9" strokeLinecap="round" />
        <path d="M40 30c0 8-14 8-18 18M40 30c0 8 14 8 18 18" stroke={azulEsc} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M22 48c-4 4-8 6-10 12M22 48c0 6 2 10 6 14M58 48c4 4 8 6 10 12M58 48c0 6-2 10-6 14" stroke={azulEsc} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {[
          [12, 62],
          [28, 64],
          [68, 62],
          [52, 64],
        ].map(([x, y]) => (
          <circle key={`${x}`} cx={x} cy={y} r="4.5" fill={rosa} />
        ))}
      </>
    ),
    pulmoes: (
      <>
        <path d="M40 10v18" stroke={azulEsc} strokeWidth="6" strokeLinecap="round" />
        <path d="M35 26c-14-6-24 10-24 28 0 14 8 20 18 18 6-1 8-6 8-12V32c0-3-1-5-2-6z" fill={rosa} stroke={rosaEsc} strokeWidth="3.5" />
        <path d="M45 26c14-6 24 10 24 28 0 14-8 20-18 18-6-1-8-6-8-12V32c0-3 1-5 2-6z" fill={rosa} stroke={rosaEsc} strokeWidth="3.5" />
      </>
    ),
    alveolos: (
      <>
        <path d="M40 8v20" stroke={azulEsc} strokeWidth="6" strokeLinecap="round" />
        {[
          [40, 36, 9],
          [28, 44, 9],
          [52, 44, 9],
          [34, 56, 9],
          [48, 57, 9],
          [24, 58, 7],
          [57, 60, 7],
          [41, 68, 8],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={rosa} stroke={rosaEsc} strokeWidth="3" />
        ))}
        <path d="M14 70c10-4 16 4 26 0s16 4 26 0" stroke="#E0575F" strokeWidth="4" strokeLinecap="round" fill="none" />
      </>
    ),
    diafragma: (
      <>
        <path d="M30 16c-10 0-16 12-16 24h52c0-12-6-24-16-24" fill={rosa} opacity=".55" />
        <path d="M8 56c8-22 56-22 64 0" stroke="#C9606D" strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M40 60v14M34 68l6 6 6-6" stroke={NOITE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 80 80" width={tamanho} height={tamanho} aria-hidden="true">
      <circle cx="40" cy="40" r="39" fill={FUNDO_PARTE} />
      {conteudo[parte]}
    </svg>
  )
}

// ---------------------------------------------------------------- ritmos

export function IlustraRitmo({ id, tamanho = 56 }: { id: string; tamanho?: number }) {
  const cor = '#8C7CF0'
  if (id === 'calma')
    // tartaruga: devagar
    return (
      <svg viewBox="0 0 56 56" width={tamanho} height={tamanho} aria-hidden="true">
        <ellipse cx="26" cy="32" rx="16" ry="11" fill="#7BCFA6" stroke="#3F9C72" strokeWidth="3" />
        <path d="M14 30h24M20 23v18M32 23v18" stroke="#3F9C72" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
        <circle cx="46" cy="30" r="6" fill="#9EDDBD" stroke="#3F9C72" strokeWidth="3" />
        <circle cx="48" cy="28.5" r="1.4" fill={NOITE} />
        <path d="M16 42v4M34 42v4" stroke="#3F9C72" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  if (id === 'quadrada')
    return (
      <svg viewBox="0 0 56 56" width={tamanho} height={tamanho} aria-hidden="true">
        <rect x="12" y="12" width="32" height="32" rx="6" fill="none" stroke={cor} strokeWidth="4" />
        {[
          [12, 12],
          [44, 12],
          [44, 44],
          [12, 44],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="#FFC94A" stroke="#E8A916" strokeWidth="2" />
        ))}
      </svg>
    )
  // equilíbrio: uma onda igual para entrar e sair
  return (
    <svg viewBox="0 0 56 56" width={tamanho} height={tamanho} aria-hidden="true">
      <path d="M6 28c6-14 16-14 22 0s16 14 22 0" fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

// -------------------------------------------------------------- carinhas

export type Sentimento = 'bem' | 'meio' | 'mal'

export function Carinha({ tipo, tamanho = 64 }: { tipo: Sentimento; tamanho?: number }) {
  const fundo = { bem: '#FFE08A', meio: '#D8E6F5', mal: '#E3DCFA' }[tipo]
  const boca = {
    bem: 'M20 37c4 6 20 6 24 0',
    meio: 'M21 39h22',
    mal: 'M21 42c4-5 18-5 22 0',
  }[tipo]
  return (
    <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill={fundo} stroke={NOITE} strokeWidth="3" />
      <circle cx="23" cy="26" r="3.2" fill={NOITE} />
      <circle cx="41" cy="26" r="3.2" fill={NOITE} />
      <path d={boca} fill="none" stroke={NOITE} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

// ------------------------------------------------------------ regras do jogo

export const IlustraDedo = ({ tamanho = 48 }: P) => (
  <svg viewBox="0 0 48 48" width={tamanho} height={tamanho} aria-hidden="true">
    <path
      d="M18 26V10a3 3 0 0 1 6 0v12l8 1.5c3 .6 4.5 3 4 6L34.5 38c-.5 3-3 5-6 5H22c-2 0-3.5-1-4.6-2.6L12 33c-1.2-1.8-.6-4 1.2-4.8 1.5-.7 3.2 0 4.2 1.2z"
      fill="#FBD3C0"
      stroke={NOITE}
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    <path d="M6 10h6M36 10h6M9 4l3 3M39 4l-3 3" stroke="#FF8A5B" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
)

export const IlustraOxigenio = ({ tamanho = 48 }: P) => (
  <svg viewBox="0 0 48 48" width={tamanho} height={tamanho} aria-hidden="true">
    <circle cx="24" cy="24" r="17" fill="#C9F7FF" stroke="#2BB5A8" strokeWidth="3" />
    <text x="24" y="29.5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="14" fill="#137A71">
      O₂
    </text>
  </svg>
)

export const IlustraPoeira = ({ tamanho = 48 }: P) => (
  <svg viewBox="0 0 48 48" width={tamanho} height={tamanho} aria-hidden="true">
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2
      return <path key={i} d={`M${24 + Math.cos(a) * 10} ${24 + Math.sin(a) * 10}L${24 + Math.cos(a) * 17} ${24 + Math.sin(a) * 17}`} stroke="#A98C6B" strokeWidth="3" strokeLinecap="round" />
    })}
    <circle cx="24" cy="24" r="11" fill="#C9AE8E" stroke="#A98C6B" strokeWidth="2.5" />
  </svg>
)
