import { ROTULO_CRIANCA, type EstadoRespiracao, type Fase } from '../lib/respiracao'

const COR: Record<Fase, [string, string]> = {
  inspirar: ['#2BB5A8', '#17857B'],
  segurar: ['#FFC94A', '#DCA222'],
  expirar: ['#8C7CF0', '#6656D4'],
  pausa: ['#FFC94A', '#DCA222'],
}

/**
 * Balão que cresce quando é hora de puxar o ar e murcha quando é hora de soltar.
 * A cor muda com a fase, o número dentro conta os segundos que faltam e a
 * frase fica embaixo, sempre do mesmo tamanho.
 */
export function Balao({ estado }: { estado: EstadoRespiracao | null }) {
  const e = estado
  const enchimento = e?.enchimento ?? 0.4
  const [cor, corEsc] = e ? COR[e.fase] : ['#D9D3FA', '#B9AFF2']
  const escala = 0.6 + 0.4 * enchimento
  const rx = 100 * escala
  const ry = 108 * escala
  const cy = 122 - (1 - escala) * 34

  return (
    <div className="balao-area" role="img" aria-label={e ? `${ROTULO_CRIANCA[e.fase]}, ${e.restante}` : 'Balão pronto para começar'}>
      <div className="balao">
        <svg viewBox="0 0 260 260" width="100%" height="100%">
          <path d={`M130 ${cy + ry} c-6 12 8 18 0 30`} fill="none" stroke="#2A2F55" strokeWidth="3.5" strokeLinecap="round" opacity=".6" />
          <path d={`M121 ${cy + ry + 3} l9 -11 l9 11 z`} fill={corEsc} />
          <ellipse cx="130" cy={cy} rx={rx} ry={ry} fill={cor} />
          <ellipse cx="130" cy={cy} rx={rx} ry={ry} fill="none" stroke={corEsc} strokeWidth="5" />
          <ellipse
            cx={130 - rx * 0.42}
            cy={cy - ry * 0.42}
            rx={rx * 0.16}
            ry={ry * 0.24}
            fill="#fff"
            opacity=".45"
            transform={`rotate(-20 ${130 - rx * 0.42} ${cy - ry * 0.42})`}
          />
        </svg>
        {e && (
          <div className="balao-num" style={{ top: `${(cy / 260) * 100}%` }}>
            {e.restante}
          </div>
        )}
      </div>
      <div className="balao-fase" aria-live="polite">
        {e ? ROTULO_CRIANCA[e.fase] : 'Pronto?'}
      </div>
    </div>
  )
}
