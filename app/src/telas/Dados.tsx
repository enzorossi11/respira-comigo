import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import base from '../../../data/processed/indicadores.json'
import { formatarValor, paraLinhas, type BaseIndicadores, type Grafico } from '../dados/tipos'
import { BotaoOuvir } from '../componentes/BotaoOuvir'
import { useApp } from '../store'

const DADOS = base as BaseIndicadores
const CORES = ['#2BB5A8', '#7C6FE0', '#F28F6B', '#1F2547']

function GraficoDados({ g }: { g: Grafico }) {
  const linhas = paraLinhas(g)
  const fmt = (v: unknown) => (typeof v === 'number' ? formatarValor(v, g.unidade === '%' ? '%' : '') : String(v))
  const eixoY = (v: number) => (g.unidade === '%' ? `${v}%` : v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v))

  return (
    <figure className="grafico">
      <figcaption>
        <h3>{g.titulo}</h3>
        <p>{g.descricao}</p>
      </figcaption>
      <div className="grafico-area">
        <ResponsiveContainer width="100%" height="100%">
          {g.tipo === 'linha' ? (
            <LineChart data={linhas} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E3E7F0" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={eixoY} tick={{ fontSize: 12 }} width={56} />
              <Tooltip formatter={fmt} />
              <Legend />
              {g.series.map((s, i) => (
                <Line key={s.nome} dataKey={s.nome} stroke={CORES[i % CORES.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          ) : (
            <BarChart data={linhas} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E3E7F0" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={eixoY} tick={{ fontSize: 12 }} width={56} />
              <Tooltip formatter={fmt} cursor={{ fill: 'rgba(124,111,224,0.08)' }} />
              {g.series.length > 1 && <Legend />}
              {g.series.map((s, i) => (
                <Bar key={s.nome} dataKey={s.nome} fill={CORES[i % CORES.length]} radius={[6, 6, 0, 0]} maxBarSize={56} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="fonte">
        Fonte:{' '}
        <a href={g.url} target="_blank" rel="noreferrer">
          {g.fonte}
        </a>
      </p>
    </figure>
  )
}

export function Dados() {
  const irPara = useApp((s) => s.irPara)
  return (
    <section className="painel painel-largo" aria-labelledby="titulo-dados">
      <div className="adultos-topo">
        <p className="sobretitulo">Para pais, professores e terapeutas</p>
        <h2 id="titulo-dados" className="titulo-grande">
          Por que isso importa
        </h2>
        <p className="texto-suave">Números oficiais sobre a saúde de crianças e adolescentes no Brasil. Cada valor tem a fonte logo abaixo.</p>
        <BotaoOuvir texto="Por que isso importa. Números oficiais sobre a saúde de crianças e adolescentes no Brasil." />
      </div>

      <div className="cards">
        {DADOS.indicadores.map((i) => (
          <article key={i.id} className="card-ind">
            <div className="card-valor">{formatarValor(i.valor, i.unidade)}</div>
            <h3>{i.titulo}</h3>
            <p className="card-publico">
              {i.publico} · {i.ano}
            </p>
            <a className="fonte" href={i.url} target="_blank" rel="noreferrer">
              {i.fonte}
            </a>
          </article>
        ))}
      </div>

      <div className="graficos">
        {DADOS.graficos.map((g) => (
          <GraficoDados key={g.id} g={g} />
        ))}
      </div>

      <p className="nota">Dados atualizados em {new Date(DADOS.gerado_em + 'T12:00:00').toLocaleDateString('pt-BR')}.</p>

      <div className="aviso-adultos">
        <p>
          <b>Como usar com a criança.</b> A ordem sugerida é Aprender, Jogar e Respirar, mas cada parte funciona sozinha. Todas as
          telas têm o botão Ouvir, que lê o texto em voz alta. O som pode ser desligado no botão do canto superior direito. No jogo
          ninguém perde: bater só empurra o ar um pouco para trás. Os tempos da respiração podem ser ajustados em "Ajustes para
          adultos", na tela Respirar.
        </p>
        <p>
          O Respira Comigo é um projeto educativo e não substitui atendimento profissional. Se precisar conversar, procure a UBS ou
          o CAPS da sua região, ou ligue <b>188</b> (CVV, 24 horas, gratuito).
        </p>
        <p className="nota">
          Corpo 3D feito com o <a href="https://www.makehumancommunity.org/" target="_blank" rel="noreferrer">MakeHuman</a> (CC0). Órgãos adaptados do{' '}
          <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">Z-Anatomy</a> (Gauthier Kervyn e Marcin Zielinski, a partir do BodyParts3D), licença{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
        </p>
      </div>

      <div data-area="respirar">
        <button className="btn btn-primario" onClick={() => irPara('inicio')}>
          Voltar para a criança
        </button>
      </div>
    </section>
  )
}
