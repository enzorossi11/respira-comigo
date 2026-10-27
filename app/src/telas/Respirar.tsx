import { useEffect, useRef, useState } from 'react'
import { AnelRespiracao } from '../componentes/AnelRespiracao'
import { deveSegurar, Placar, type ResultadoCiclo } from '../lib/desafio'
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
import { liberarAudio, tocarEfeito, tocarFase } from '../lib/som'
import { useApp } from '../store'

const CAMPOS: { chave: keyof Ritmo; rotulo: string }[] = [
  { chave: 'inspirar', rotulo: 'Inspirar' },
  { chave: 'segurar', rotulo: 'Segurar' },
  { chave: 'expirar', rotulo: 'Expirar' },
  { chave: 'pausa', rotulo: 'Pausa' },
]

const DURACOES = [1, 2, 3, 5]
const TEXTO_NOTA = { perfeito: 'Perfeito!', bom: 'Bom!', quase: 'Quase… siga o anel' } as const

function formatar(seg: number) {
  const s = Math.max(0, Math.round(seg))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface Final {
  pontos: number
  precisao: number
  melhorCombo: number
  estrelas: number
  recorde: boolean
}

export function Respirar() {
  const s = useApp()
  const [estado, setEstado] = useState<EstadoRespiracao | null>(null)
  const [tempo, setTempo] = useState(0)
  const ultimaFase = useRef<Fase | null>(null)
  const ativo = s.rodando || s.acumulado > 0
  const total = s.duracaoSessao()
  const desafio = s.modo === 'desafio'

  // desafio de ritmo
  const placar = useRef<Placar | null>(null)
  const apertado = useRef(false)
  const [botao, setBotao] = useState(false)
  const [pontos, setPontos] = useState(0)
  const [combo, setCombo] = useState(0)
  const [ultimo, setUltimo] = useState<ResultadoCiclo | null>(null)
  const [final, setFinal] = useState<Final | null>(null)

  const apertar = (v: boolean) => {
    apertado.current = v
    setBotao(v)
  }

  // barra de espaço também funciona como botão (enquanto o desafio está rodando,
  // ela não aciona outros botões, para não pausar sem querer)
  useEffect(() => {
    if (!desafio || !s.rodando) return
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (!e.repeat) apertar(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      apertar(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [desafio, s.rodando])

  // relógio da sessão: atualiza o anel, toca o som e conta os pontos do desafio
  useEffect(() => {
    let id = 0
    let ultimoQuadro = performance.now()
    const reagirAoCiclo = (r: ResultadoCiclo | null) => {
      if (!r) return
      const st = useApp.getState()
      setUltimo(r)
      setPontos(placar.current?.pontos ?? 0)
      setCombo(r.combo)
      st.reagir(r.nota === 'perfeito' ? (r.combo >= 3 ? 'uau' : 'feliz') : r.nota === 'bom' ? 'feliz' : 'ops')
      if (st.som) tocarEfeito(r.nota === 'perfeito' ? 'combo' : r.nota === 'bom' ? 'acerto' : 'batida')
    }
    const passo = () => {
      const st = useApp.getState()
      const agora = performance.now()
      const dt = Math.min(0.1, (agora - ultimoQuadro) / 1000)
      ultimoQuadro = agora
      const t = st.tempo()
      const dur = st.duracaoSessao()
      if (st.rodando && t >= dur) {
        if (st.modo === 'desafio' && placar.current) {
          reagirAoCiclo(placar.current.fecharCiclo())
          const p = placar.current
          const recorde = st.registrarRitmo(p.pontos)
          setFinal({ pontos: p.pontos, precisao: p.precisaoMedia, melhorCombo: p.melhorCombo, estrelas: p.estrelas(), recorde })
          if (st.som) tocarEfeito('vitoria')
        }
        st.concluir()
        setEstado(null)
        ultimaFase.current = null
        return
      }
      const e = faseNoTempo(t, st.ritmo)
      setEstado(e)
      setTempo(t)
      if (st.rodando && st.modo === 'desafio' && placar.current) reagirAoCiclo(placar.current.registrar(t, apertado.current, dt))
      if (st.rodando && e.fase !== ultimaFase.current) {
        ultimaFase.current = e.fase
        if (st.som && st.modo === 'livre') tocarFase(e.fase)
      }
      if (st.rodando) id = requestAnimationFrame(passo)
    }
    passo()
    return () => cancelAnimationFrame(id)
  }, [s.rodando, s.ritmo])

  const comecar = () => {
    liberarAudio()
    ultimaFase.current = null
    if (desafio && s.acumulado === 0) {
      placar.current = new Placar(s.ritmo)
      setPontos(0)
      setCombo(0)
      setUltimo(null)
      setFinal(null)
    }
    s.iniciar()
    // tira o foco do botão "Começar" (senão a barra de espaço o acionaria)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  const esperado = estado && ativo ? (deveSegurar(estado.fase) ? 'segure' : 'solte') : null
  const acertando = esperado ? (esperado === 'segure') === botao : true

  return (
    <section className="painel" aria-labelledby="titulo-respirar">
      <p className="sobretitulo">Respiração guiada</p>
      <h2 id="titulo-respirar">Respire comigo</h2>

      <div className="modos" role="tablist" aria-label="Modo">
        <button role="tab" aria-selected={!desafio} className={!desafio ? 'ativo' : ''} onClick={() => s.setModo('livre')} disabled={s.rodando}>
          🌿 Livre
        </button>
        <button role="tab" aria-selected={desafio} className={desafio ? 'ativo' : ''} onClick={() => s.setModo('desafio')} disabled={s.rodando}>
          🎯 Desafio de ritmo
        </button>
      </div>
      {desafio && !ativo && !final && (
        <p className="lead pequeno">
          <b>Segure o botão</b> (ou a barra de espaço) enquanto <b>inspira</b> e <b>solte</b> enquanto <b>expira</b>. Cada ciclo certinho
          vale pontos, e acertos seguidos fazem combo!
        </p>
      )}

      <div className="respirar-topo">
        <AnelRespiracao estado={ativo ? estado : null} ativo={ativo} />
        <div className="respirar-info">
          {final ? (
            <div className="concluida desafio-final" role="status">
              <div className="estrelas pequeno">
                {[1, 2, 3].map((i) => (
                  <span key={i} className={i <= final.estrelas ? 'on' : ''}>
                    ★
                  </span>
                ))}
              </div>
              <strong>{final.pontos} pontos</strong>
              {final.recorde && <span className="selo-recorde">Novo recorde!</span>}
              <p>
                Precisão média {Math.round(final.precisao * 100)}% · melhor combo ×{final.melhorCombo}
              </p>
            </div>
          ) : s.concluida ? (
            <div className="concluida" role="status">
              <strong>Sessão concluída 🎉</strong>
              <p>Como você está se sentindo agora? Repita sempre que precisar.</p>
            </div>
          ) : desafio && ativo ? (
            <div className="placar-vivo">
              <div className="placar-pontos">
                <strong>{pontos}</strong> pts
                {combo >= 2 && <span className="combo">combo ×{combo}</span>}
              </div>
              {ultimo && (
                <div key={ultimo.ciclo} className={`nota-ciclo ${ultimo.nota}`}>
                  {TEXTO_NOTA[ultimo.nota]} {ultimo.nota !== 'quase' && `+${ultimo.pontos}`}
                </div>
              )}
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
            {ativo ? `${formatar(tempo)} de ${formatar(total)}` : `Sessão de ${formatar(total)}`} · {respiracoesPorMinuto(s.ritmo)}{' '}
            respirações por minuto
          </p>
          <div className="acoes">
            {s.rodando ? (
              <button className="btn btn-secundario" onClick={s.pausar}>
                Pausar
              </button>
            ) : (
              <button className="btn btn-primario" onClick={comecar}>
                {s.acumulado > 0 ? 'Continuar' : s.concluida ? (desafio ? 'Jogar de novo' : 'Respirar de novo') : 'Começar'}
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

      {desafio && s.rodando && (
        <button
          className={`botao-ritmo ${botao ? 'apertado' : ''} ${acertando ? 'certo' : 'errado'}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            apertar(true)
          }}
          onPointerUp={() => apertar(false)}
          onPointerCancel={() => apertar(false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-pressed={botao}
        >
          <span className="botao-ritmo-acao">{esperado === 'segure' ? 'Segure e inspire' : 'Solte e expire'}</span>
          <span className="botao-ritmo-dica">{botao ? 'segurando…' : 'toque e segure'}</span>
        </button>
      )}

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
              <span>{[p.ritmo.inspirar, p.ritmo.segurar, p.ritmo.expirar, p.ritmo.pausa].filter((x) => x > 0).join('·')}</span>
            </button>
          ))}
        </div>
        <p className="nota">{PRESETS.find((p) => p.id === s.presetId)?.descricao ?? 'Ritmo personalizado.'}</p>

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
          <span>Som</span>
        </label>
      </fieldset>
    </section>
  )
}
