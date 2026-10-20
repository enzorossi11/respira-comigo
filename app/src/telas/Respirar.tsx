import { useEffect, useRef, useState } from 'react'
import { AnelRespiracao } from '../componentes/AnelRespiracao'
import {
  duracaoCiclo,
  faseNoTempo,
  LIMITES,
  PRESETS,
  respiracoesPorMinuto,
  type EstadoRespiracao,
  type Fase,
  type Ritmo,
} from '../lib/respiracao'
import { liberarAudio, tocarFase } from '../lib/som'
import { useApp } from '../store'

const CAMPOS: { chave: keyof Ritmo; rotulo: string }[] = [
  { chave: 'inspirar', rotulo: 'Inspirar' },
  { chave: 'segurar', rotulo: 'Segurar' },
  { chave: 'expirar', rotulo: 'Expirar' },
  { chave: 'pausa', rotulo: 'Pausa' },
]

const DURACOES = [1, 2, 3, 5]

function formatar(seg: number) {
  const s = Math.max(0, Math.round(seg))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Respirar() {
  const s = useApp()
  const [estado, setEstado] = useState<EstadoRespiracao | null>(null)
  const [tempo, setTempo] = useState(0)
  const ultimaFase = useRef<Fase | null>(null)
  const ativo = s.rodando || s.acumulado > 0
  const total = s.duracaoSessao()

  // relógio da sessão: atualiza o anel e toca o som quando a fase muda
  useEffect(() => {
    let id = 0
    const passo = () => {
      const st = useApp.getState()
      const t = st.tempo()
      const dur = st.duracaoSessao()
      if (st.rodando && t >= dur) {
        st.concluir()
        setEstado(null)
        ultimaFase.current = null
        return
      }
      const e = faseNoTempo(t, st.ritmo)
      setEstado(e)
      setTempo(t)
      if (st.rodando && e.fase !== ultimaFase.current) {
        ultimaFase.current = e.fase
        if (st.som) tocarFase(e.fase)
      }
      if (st.rodando) id = requestAnimationFrame(passo)
    }
    passo()
    return () => cancelAnimationFrame(id)
  }, [s.rodando, s.ritmo])

  const comecar = () => {
    liberarAudio()
    ultimaFase.current = null
    s.iniciar()
  }

  return (
    <section className="painel" aria-labelledby="titulo-respirar">
      <p className="sobretitulo">Respiração guiada</p>
      <h2 id="titulo-respirar">Respire comigo</h2>

      <div className="respirar-topo">
        <AnelRespiracao estado={ativo ? estado : null} ativo={ativo} />
        <div className="respirar-info">
          {s.concluida ? (
            <div className="concluida" role="status">
              <strong>Sessão concluída 🎉</strong>
              <p>Como você está se sentindo agora? Repita sempre que precisar.</p>
            </div>
          ) : (
            <p className="lead pequeno">
              {ativo
                ? 'Acompanhe o anel e o peito do personagem. Se ficar desconfortável, pare e respire normalmente.'
                : 'Sente-se confortável, solte os ombros e escolha um ritmo. Respire pelo nariz, se puder.'}
            </p>
          )}
          <div className="progresso" aria-label="Progresso da sessão">
            <div className="progresso-barra" style={{ width: `${ativo ? Math.min(100, (tempo / total) * 100) : 0}%` }} />
          </div>
          <p className="nota">
            {ativo ? `${formatar(tempo)} de ${formatar(total)}` : `Sessão de ${formatar(total)}`} ·{' '}
            {respiracoesPorMinuto(s.ritmo)} respirações por minuto
          </p>
          <div className="acoes">
            {s.rodando ? (
              <button className="btn btn-primario" onClick={s.pausar}>
                Pausar
              </button>
            ) : (
              <button className="btn btn-primario" onClick={comecar}>
                {s.acumulado > 0 ? 'Continuar' : s.concluida ? 'Respirar de novo' : 'Começar'}
              </button>
            )}
            {ativo && (
              <button className="btn btn-secundario" onClick={s.reiniciar}>
                Encerrar
              </button>
            )}
          </div>
        </div>
      </div>

      <fieldset className="grupo" disabled={s.rodando}>
        <legend>Ritmo</legend>
        <div className="presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset ${s.presetId === p.id ? 'ativo' : ''}`}
              aria-pressed={s.presetId === p.id}
              onClick={() => s.setRitmo(p.ritmo, p.id)}
            >
              <strong>{p.nome}</strong>
              <span>
                {[p.ritmo.inspirar, p.ritmo.segurar, p.ritmo.expirar, p.ritmo.pausa].filter((x) => x > 0).join('·')}
              </span>
            </button>
          ))}
        </div>
        <p className="nota">
          {PRESETS.find((p) => p.id === s.presetId)?.descricao ?? 'Ritmo personalizado.'}
        </p>

        <div className="sliders">
          {CAMPOS.map(({ chave, rotulo }) => (
            <label key={chave} className={`slider slider-${chave}`}>
              <span>
                {rotulo} <b>{s.ritmo[chave]} s</b>
              </span>
              <input
                type="range"
                min={LIMITES[chave].min}
                max={LIMITES[chave].max}
                step={1}
                value={s.ritmo[chave]}
                onChange={(ev) => s.setRitmo({ ...s.ritmo, [chave]: Number(ev.target.value) })}
              />
            </label>
          ))}
        </div>
        <p className="nota">Ciclo de {duracaoCiclo(s.ritmo)} segundos.</p>
      </fieldset>

      <fieldset className="grupo linha" disabled={s.rodando}>
        <legend>Duração</legend>
        <div className="segmentado" role="radiogroup" aria-label="Duração da sessão">
          {DURACOES.map((m) => (
            <button key={m} role="radio" aria-checked={s.duracaoMin === m} className={s.duracaoMin === m ? 'ativo' : ''} onClick={() => s.setDuracao(m)}>
              {m} min
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={s.som} onChange={(ev) => s.setSom(ev.target.checked)} />
          <span>Som suave a cada fase</span>
        </label>
      </fieldset>
    </section>
  )
}
