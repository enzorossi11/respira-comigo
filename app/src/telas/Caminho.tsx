import { useEffect, useState } from 'react'
import { BotaoOuvir } from '../componentes/BotaoOuvir'
import { IconeEstrela, IconeRepetir, IconeSeta, IconeVoltar, IlustraParte, IlustraJogar, IlustraRespirar } from '../componentes/Icones'
import { PARADAS } from '../conteudo/paradas'
import { useApp } from '../store'

/**
 * O caminho do ar em oito paradas: uma parte do corpo por vez, uma frase,
 * e a mesma parte acesa no personagem. O fim é uma tela de parabéns.
 */
export function Caminho() {
  const parada = useApp((s) => s.parada)
  const setParada = useApp((s) => s.setParada)
  const concluir = useApp((s) => s.concluirCaminho)
  const irPara = useApp((s) => s.irPara)
  const [fim, setFim] = useState(false)
  const p = PARADAS[parada]

  const avancar = () => {
    if (parada < PARADAS.length - 1) setParada(parada + 1)
    else if (!fim) {
      concluir()
      setFim(true)
      useApp.getState().reagir('uau')
    }
  }
  const voltar = () => {
    if (fim) setFim(false)
    else if (parada > 0) setParada(parada - 1)
  }

  // setas do teclado também avançam e voltam
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowRight') avancar()
      if (ev.key === 'ArrowLeft') voltar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (fim) {
    return (
      <section className="painel" aria-labelledby="titulo-fim" key="fim">
        <div className="parabens">
          <div className="estrelas">
            <IconeEstrela tamanho={64} />
            <IconeEstrela tamanho={80} />
            <IconeEstrela tamanho={64} />
          </div>
          <h2 id="titulo-fim" className="titulo-grande">
            Muito bem!
          </h2>
          <p className="frase">Você conheceu todo o caminho do ar.</p>
          <BotaoOuvir texto="Muito bem! Você conheceu todo o caminho do ar. Agora você pode jogar ou respirar." />
        </div>
        <div data-area="jogar">
          <button className="btn btn-primario btn-enorme btn-largo" onClick={() => irPara('jornada')}>
            <IlustraJogar tamanho={52} />
            Jogar
          </button>
        </div>
        <div data-area="respirar">
          <button className="btn btn-primario btn-largo" onClick={() => irPara('respirar')}>
            <IlustraRespirar tamanho={44} />
            Respirar
          </button>
        </div>
        <button
          className="btn btn-secundario"
          onClick={() => {
            setFim(false)
            setParada(0)
          }}
        >
          <IconeRepetir tamanho={28} />
          Ver de novo
        </button>
      </section>
    )
  }

  return (
    <section className="painel" aria-labelledby="titulo-parada">
      <nav className="trilha" aria-label="Paradas do caminho do ar">
        {PARADAS.map((x, i) => (
          <button
            key={x.parte}
            className={i === parada ? 'atual' : i < parada ? 'feita' : ''}
            aria-current={i === parada ? 'step' : undefined}
            aria-label={`${i + 1}. ${x.nome}`}
            title={x.nome}
            onClick={() => setParada(i)}
          />
        ))}
      </nav>

      <article className="cartao-parada" key={p.parte}>
        <span className="parada-contador">
          {parada + 1} de {PARADAS.length}
        </span>
        <span className="ilustra">
          <IlustraParte parte={p.parte} tamanho={128} />
        </span>
        <h2 id="titulo-parada">{p.nome}</h2>
        <p className="frase">{p.frase}</p>
        <BotaoOuvir texto={`${p.nome}. ${p.frase}`} />
      </article>

      <div className="linha-botoes">
        <button className="btn-redondo" onClick={voltar} disabled={parada === 0} aria-label="Voltar" title="Voltar">
          <IconeVoltar tamanho={30} />
        </button>
        <button className="btn btn-primario btn-enorme" onClick={avancar}>
          {parada === PARADAS.length - 1 ? 'Terminar' : 'Próximo'}
          <IconeSeta tamanho={34} />
        </button>
      </div>
    </section>
  )
}
