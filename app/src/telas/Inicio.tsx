import { useApp } from '../store'

const PASSOS = [
  { n: '1', titulo: 'Aprender', texto: 'Siga o caminho do ar, do nariz até os alvéolos, em 3 etapas.' },
  { n: '2', titulo: 'Jogar', texto: 'Vire uma molécula de oxigênio e chegue até o alvéolo desviando de poeira e vírus.' },
  { n: '3', titulo: 'Praticar', texto: 'Respire junto com o personagem e tente acertar o ritmo para ganhar pontos.' },
  { n: '4', titulo: 'Entender', texto: 'Veja, com dados do IBGE e do SUS, por que isso importa.' },
]

export function Inicio() {
  const irPara = useApp((s) => s.irPara)
  const sessoes = useApp((s) => s.sessoes)
  const recordeJornada = useApp((s) => s.recordeJornada)
  const estrelas = useApp((s) => s.estrelasJornada)
  const recordeRitmo = useApp((s) => s.recordeRitmo)

  return (
    <section className="painel" aria-labelledby="titulo-inicio">
      <p className="sobretitulo">Sistema respiratório · Saúde e bem-estar</p>
      <h1 id="titulo-inicio">
        Aprenda o caminho do ar. <span className="verde">Respire no seu ritmo.</span>
      </h1>
      <p className="lead">
        Oi! Eu vou te mostrar por onde o ar passa quando você respira, e depois a gente respira junto por uns minutinhos.
      </p>

      <ol className="passos">
        {PASSOS.map((p) => (
          <li key={p.n}>
            <span className="passo-n">{p.n}</span>
            <div>
              <strong>{p.titulo}</strong>
              <p>{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="acoes">
        <button className="btn btn-primario" onClick={() => irPara('caminho')}>
          Começar pelo caminho do ar
        </button>
        <button className="btn btn-secundario" onClick={() => irPara('jornada')}>
          🎮 Jogar a Jornada do ar
        </button>
      </div>

      {(sessoes > 0 || recordeJornada > 0 || recordeRitmo > 0) && (
        <div className="conquistas" aria-label="Seu progresso neste aparelho">
          {recordeJornada > 0 && (
            <span>
              🏆 Jornada: <b>{recordeJornada}</b> pts {'★'.repeat(estrelas)}
            </span>
          )}
          {recordeRitmo > 0 && (
            <span>
              🎯 Ritmo: <b>{recordeRitmo}</b> pts
            </span>
          )}
          {sessoes > 0 && (
            <span>
              🫁 <b>{sessoes}</b> {sessoes === 1 ? 'sessão' : 'sessões'} de respiração
            </span>
          )}
        </div>
      )}
      <p className="nota dica">Dica: arraste o personagem para girá-lo.</p>
    </section>
  )
}
