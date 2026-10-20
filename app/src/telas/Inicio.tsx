import { useApp } from '../store'

const PASSOS = [
  { n: '1', titulo: 'Aprender', texto: 'Siga o caminho do ar, do nariz até os alvéolos, em 3 etapas.' },
  { n: '2', titulo: 'Praticar', texto: 'Respire junto com o personagem, no ritmo que você escolher.' },
  { n: '3', titulo: 'Entender', texto: 'Veja, com dados do IBGE e do SUS, por que isso importa.' },
]

export function Inicio() {
  const irPara = useApp((s) => s.irPara)
  const sessoes = useApp((s) => s.sessoes)

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
        <button className="btn btn-secundario" onClick={() => irPara('respirar')}>
          Ir direto para a respiração
        </button>
      </div>

      {sessoes > 0 && (
        <p className="nota">
          Você já completou {sessoes} {sessoes === 1 ? 'sessão' : 'sessões'} de respiração neste aparelho.
        </p>
      )}
      <p className="nota dica">Dica: arraste o personagem para girá-lo.</p>
    </section>
  )
}
