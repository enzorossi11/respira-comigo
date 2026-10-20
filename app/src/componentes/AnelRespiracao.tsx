import type { EstadoRespiracao } from '../lib/respiracao'
import { ROTULO_FASE } from '../lib/respiracao'

const COR_FASE = {
  inspirar: '#2BB5A8',
  segurar: '#FFB38A',
  expirar: '#7C6FE0',
  pausa: '#FFB38A',
} as const

/**
 * O mesmo anel do logo: o círculo interno cresce e encolhe com a respiração
 * e o ponto pêssego percorre o anel ao longo do ciclo.
 */
export function AnelRespiracao({ estado, ativo }: { estado: EstadoRespiracao | null; ativo: boolean }) {
  const e = estado
  const enchimento = e?.enchimento ?? 0
  const ang = (e?.progressoCiclo ?? 0) * Math.PI * 2 - Math.PI / 2
  const R = 92
  const raioInterno = 38 + enchimento * 40
  const cor = e ? COR_FASE[e.fase] : '#2BB5A8'

  return (
    <div className="anel" role="img" aria-label={e ? `${ROTULO_FASE[e.fase]}, ${e.restante} segundos` : 'Pronto para começar'}>
      <svg viewBox="0 0 220 220" width="100%" height="100%">
        <circle cx="110" cy="110" r={R} fill="none" stroke="#E8ECF4" strokeWidth="10" />
        <path d={`M110 ${110 - R} A${R} ${R} 0 0 0 110 ${110 + R}`} fill="none" stroke="#2BB5A8" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
        <path d={`M110 ${110 + R} A${R} ${R} 0 0 0 110 ${110 - R}`} fill="none" stroke="#7C6FE0" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
        <circle cx="110" cy="110" r={raioInterno} fill={cor} opacity="0.18" />
        <circle cx="110" cy="110" r={raioInterno * 0.72} fill={cor} opacity="0.22" />
        <circle cx={110 + Math.cos(ang) * R} cy={110 + Math.sin(ang) * R} r="11" fill="#FFB38A" stroke="#fff" strokeWidth="3" />
      </svg>
      <div className="anel-centro">
        <div className="anel-fase" aria-live="polite">
          {ativo && e ? ROTULO_FASE[e.fase] : 'Pronto?'}
        </div>
        <div className="anel-num">{ativo && e ? e.restante : '·'}</div>
      </div>
    </div>
  )
}
