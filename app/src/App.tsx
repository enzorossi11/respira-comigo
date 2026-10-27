import { lazy, Suspense } from 'react'
import icone from './componentes/icone.svg'
import { useApp, type Tela } from './store'
import { Caminho } from './telas/Caminho'
import { Inicio } from './telas/Inicio'
import { Respirar } from './telas/Respirar'

// a cena 3D e o painel de dados são carregados à parte, para o app abrir mais rápido
const Cena = lazy(() => import('./3d/Cena').then((m) => ({ default: m.Cena })))
const Dados = lazy(() => import('./telas/Dados').then((m) => ({ default: m.Dados })))
const Jornada = lazy(() => import('./jogo/Jornada').then((m) => ({ default: m.Jornada })))

const MENU: { tela: Tela; rotulo: string }[] = [
  { tela: 'inicio', rotulo: 'Início' },
  { tela: 'caminho', rotulo: 'Caminho do ar' },
  { tela: 'jornada', rotulo: '🎮 Jogar' },
  { tela: 'respirar', rotulo: 'Respirar' },
  { tela: 'dados', rotulo: 'Por que importa' },
]

export default function App() {
  const tela = useApp((s) => s.tela)
  const irPara = useApp((s) => s.irPara)
  const com3d = tela !== 'dados' && tela !== 'jornada'

  return (
    <div className="app">
      <header className="topo">
        <button className="marca" onClick={() => irPara('inicio')} aria-label="Respira Comigo, voltar ao início">
          <img src={icone} alt="" width={36} height={36} />
          <span>
            Respira <b>Comigo</b>
          </span>
        </button>
        <nav className="menu" aria-label="Seções">
          {MENU.map((m) => (
            <button key={m.tela} className={tela === m.tela ? 'ativo' : ''} aria-current={tela === m.tela ? 'page' : undefined} onClick={() => irPara(m.tela)}>
              {m.rotulo}
            </button>
          ))}
        </nav>
      </header>

      <main className={`conteudo ${com3d ? 'com-3d' : 'sem-3d'} tela-${tela}`}>
        <div className="palco" hidden={!com3d}>
          <Suspense fallback={<div className="palco-carregando">Carregando personagem…</div>}>
            <Cena />
          </Suspense>
        </div>
        <div className="lado">
          {tela === 'inicio' && <Inicio />}
          {tela === 'caminho' && <Caminho />}
          {tela === 'respirar' && <Respirar />}
          {tela === 'jornada' && (
            <Suspense fallback={<p className="painel">Carregando o jogo…</p>}>
              <Jornada />
            </Suspense>
          )}
          {tela === 'dados' && (
            <Suspense fallback={<p className="painel">Carregando dados…</p>}>
              <Dados />
            </Suspense>
          )}
        </div>
      </main>

      <footer className="rodape">
        <p>
          O Respira Comigo é um projeto educativo e não substitui atendimento profissional. Se precisar conversar, procure a UBS ou o
          CAPS da sua região, ou ligue <b>188</b> (CVV, 24 horas, gratuito).
        </p>
        <p className="credito">
          Modelo anatômico 3D adaptado do{' '}
          <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">
            Z-Anatomy
          </a>{' '}
          (Gauthier Kervyn e Marcin Zielinski, a partir do BodyParts3D), licença{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">
            CC BY-SA 4.0
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
