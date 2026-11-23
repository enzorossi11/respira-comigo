import { useEffect, useRef, useState } from 'react'
import { Balao } from '../componentes/Balao'
import { BotaoOuvir } from '../componentes/BotaoOuvir'
import { Carinha, IconePausa, IconePlay, IconeRepetir, IlustraRitmo, type Sentimento } from '../componentes/Icones'
import { falar, pararFala } from '../lib/fala'
import { ciclosNaSessao, faseNoTempo, LIMITES, PRESETS, ROTULO_CRIANCA, type EstadoRespiracao, type Fase, type Ritmo } from '../lib/respiracao'
import { liberarAudio, tocarFase } from '../lib/som'
import { useApp } from '../store'

/** Nome e desenho de cada ritmo, para criança. */
const NOME_RITMO: Record<string, string> = { calma: 'Devagar', equilibrio: 'Igual', quadrada: 'Quadrado' }

const CAMPOS: { chave: keyof Ritmo; rotulo: string }[] = [
  { chave: 'inspirar', rotulo: 'Puxar o ar' },
  { chave: 'segurar', rotulo: 'Segurar' },
  { chave: 'expirar', rotulo: 'Soltar o ar' },
  { chave: 'pausa', rotulo: 'Descansar' },
]
const DURACOES = [1, 2, 3, 5]

const RESPOSTA: Record<Sentimento, string> = {
  bem: 'Que bom! Você pode respirar assim sempre que quiser.',
  meio: 'Tudo bem. Se quiser, respire mais uma vez comigo.',
  mal: 'Tudo bem não estar bem. Chame um adulto de confiança, e respire comigo de novo.',
}
const NOME_SENTIMENTO: Record<Sentimento, string> = { bem: 'Bem', meio: 'Mais ou menos', mal: 'Não muito bem' }

const FALA_INICIO =
  'Sente-se com calma. Escolha um ritmo e toque em Começar. Quando o balão crescer, puxe o ar pelo nariz. Quando ele diminuir, solte o ar devagar.'

export function Respirar() {
  const s = useApp()
  const [estado, setEstado] = useState<EstadoRespiracao | null>(null)
  const [sentimento, setSentimento] = useState<Sentimento | null>(null)
  const ultimaFase = useRef<Fase | null>(null)
  const ativo = s.rodando || s.acumulado > 0
  const totalCiclos = ciclosNaSessao(s.duracaoMin * 60, s.ritmo)

  // relógio da sessão: atualiza o balão e fala/toca cada fase nova
  useEffect(() => {
    let id = 0
    const passo = () => {
      const st = useApp.getState()
      const t = st.tempo()
      if (st.rodando && t >= st.duracaoSessao()) {
        st.concluir()
        st.reagir('feliz')
        if (st.som) falar('Pronto! Muito bem.')
        setEstado(null)
        ultimaFase.current = null
        return
      }
      const e = faseNoTempo(t, st.ritmo)
      setEstado(e)
      if (st.rodando && e.fase !== ultimaFase.current) {
        ultimaFase.current = e.fase
        if (st.som) {
          tocarFase(e.fase)
          falar(ROTULO_CRIANCA[e.fase], { rapido: true })
        }
      }
      if (st.rodando) id = requestAnimationFrame(passo)
    }
    passo()
    return () => cancelAnimationFrame(id)
  }, [s.rodando, s.ritmo])

  useEffect(() => () => pararFala(), [])

  const comecar = () => {
    liberarAudio()
    ultimaFase.current = null
    setSentimento(null)
    s.iniciar()
  }
  const parar = () => {
    pararFala()
    s.reiniciar()
  }

  // ------------------------------------------------------------- fim da sessão
  if (s.concluida && !ativo) {
    return (
      <section className="painel" aria-labelledby="titulo-fim-respirar">
        <div className="cabeca-painel">
          <h2 id="titulo-fim-respirar" className="titulo-grande">
            Pronto! Como você está?
          </h2>
          <BotaoOuvir texto="Pronto! Como você está? Toque em uma carinha." />
        </div>
        <div className="sentimentos" role="radiogroup" aria-label="Como você está">
          {(['bem', 'meio', 'mal'] as const).map((t) => (
            <button key={t} role="radio" aria-checked={sentimento === t} className="opcao" onClick={() => setSentimento(t)}>
              <Carinha tipo={t} tamanho={64} />
              {NOME_SENTIMENTO[t]}
            </button>
          ))}
        </div>
        {sentimento && (
          <>
            <p className="resposta" role="status">
              {RESPOSTA[sentimento]}
            </p>
            <BotaoOuvir texto={RESPOSTA[sentimento]} />
          </>
        )}
        <button className="btn btn-primario btn-enorme btn-largo" onClick={comecar}>
          <IconeRepetir tamanho={32} />
          Respirar de novo
        </button>
      </section>
    )
  }

  // ------------------------------------------------------------------ sessão
  const cicloAtual = estado && ativo ? estado.ciclo : -1
  return (
    <section className="painel" aria-labelledby="titulo-respirar">
      <h2 id="titulo-respirar" className="sr-only">
        Respire comigo
      </h2>

      <div className="balao-area">
        <Balao estado={ativo ? estado : null} />
        <div className="ciclos" aria-label={ativo ? `Respiração ${Math.min(cicloAtual + 1, totalCiclos)} de ${totalCiclos}` : `${totalCiclos} respirações`}>
          {Array.from({ length: totalCiclos }, (_, i) => (
            <span key={i} className={i < cicloAtual ? 'feito' : i === cicloAtual ? 'atual' : ''} />
          ))}
        </div>
      </div>

      {!ativo && (
        <>
          <div className="cabeca-painel">
            <p className="frase texto-suave">Balão cresce: puxe o ar. Balão diminui: solte o ar.</p>
            <BotaoOuvir texto={FALA_INICIO} />
          </div>
        </>
      )}

      {s.rodando ? (
        <div className="linha-botoes">
          <button className="btn btn-secundario btn-enorme btn-largo" onClick={s.pausar}>
            <IconePausa tamanho={30} />
            Pausar
          </button>
        </div>
      ) : (
        <div className="linha-botoes">
          <button className="btn btn-primario btn-enorme" onClick={comecar}>
            <IconePlay tamanho={32} />
            {s.acumulado > 0 ? 'Continuar' : 'Começar'}
          </button>
          {ativo && (
            <button className="btn btn-secundario btn-enorme" onClick={parar}>
              Parar
            </button>
          )}
        </div>
      )}

      {!ativo && (
        <>
          <div className="escolha">
            <span className="escolha-titulo">Ritmo</span>
            <div className="ritmos" role="radiogroup" aria-label="Ritmo">
              {PRESETS.map((p) => (
                <button key={p.id} role="radio" aria-checked={s.presetId === p.id} className="opcao" onClick={() => s.setRitmo(p.ritmo, p.id)}>
                  <IlustraRitmo id={p.id} tamanho={56} />
                  {NOME_RITMO[p.id] ?? p.nome}
                </button>
              ))}
            </div>
          </div>

          <details className="ajustes">
            <summary>Ajustes para adultos</summary>
            <div className="ajustes-corpo">
              <p className="nota">
                Ritmo atual: {PRESETS.find((p) => p.id === s.presetId)?.descricao ?? 'personalizado.'} Os tempos são em segundos.
              </p>
              <div className="sliders">
                {CAMPOS.map(({ chave, rotulo }) => (
                  <label key={chave} className="slider">
                    <span>
                      {rotulo}: {s.ritmo[chave]} s
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
              <div className="segmentado" role="radiogroup" aria-label="Duração da sessão">
                {DURACOES.map((m) => (
                  <button key={m} role="radio" aria-checked={s.duracaoMin === m} onClick={() => s.setDuracao(m)}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
