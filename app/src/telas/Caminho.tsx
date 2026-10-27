import { useEffect } from 'react'
import { ETAPAS } from '../conteudo/etapas'
import { useApp } from '../store'

export function Caminho() {
  const etapa = useApp((s) => s.etapa)
  const setEtapa = useApp((s) => s.setEtapa)
  const irPara = useApp((s) => s.irPara)
  const e = ETAPAS[etapa]
  const ultima = etapa === ETAPAS.length - 1

  // setas do teclado navegam entre as etapas
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement) return
      if (ev.key === 'ArrowRight') setEtapa(etapa + 1)
      if (ev.key === 'ArrowLeft') setEtapa(etapa - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [etapa, setEtapa])

  return (
    <section className="painel" aria-labelledby="titulo-etapa">
      <nav className="etapas" aria-label="Etapas do caminho do ar">
        {ETAPAS.map((x, i) => (
          <button
            key={x.numero}
            className={`etapa-chip ${i === etapa ? 'ativa' : ''} ${i < etapa ? 'feita' : ''}`}
            aria-current={i === etapa ? 'step' : undefined}
            onClick={() => setEtapa(i)}
          >
            <span className="etapa-n">{x.numero}</span>
            <span className="etapa-nome">{x.titulo}</span>
          </button>
        ))}
      </nav>

      <p className="sobretitulo">Etapa {e.numero} de 3</p>
      <h2 id="titulo-etapa">{e.titulo}</h2>
      <p className="lead">{e.resumo}</p>

      <dl className="pontos">
        {e.pontos.map((p) => (
          <div key={p.termo}>
            <dt>{p.termo}</dt>
            <dd>{p.texto}</dd>
          </div>
        ))}
      </dl>

      <aside className="curiosidade">
        <strong>Você sabia?</strong> {e.curiosidade}
      </aside>

      <div className="acoes">
        <button className="btn btn-secundario" onClick={() => setEtapa(etapa - 1)} disabled={etapa === 0}>
          ← Anterior
        </button>
        {ultima ? (
          <>
            <button className="btn btn-primario" onClick={() => irPara('jornada')}>
              🎮 Agora, faça a jornada do ar →
            </button>
            <button className="btn btn-secundario" onClick={() => irPara('respirar')}>
              Ir para a respiração
            </button>
          </>
        ) : (
          <button className="btn btn-primario" onClick={() => setEtapa(etapa + 1)}>
            Próxima etapa →
          </button>
        )}
      </div>
    </section>
  )
}
