import { lazy, Suspense, type ReactNode } from 'react'
import icone from './componentes/icone.svg'
import { IconeAmigo, IconeCasa, IconeSemSom, IconeSom, IlustraAprender, IlustraJogar, IlustraRespirar } from './componentes/Icones'
import { pararFala } from './lib/fala'
import { useApp, type Tela } from './store'
import { Caminho } from './telas/Caminho'
import { Inicio } from './telas/Inicio'
import { Perfil } from './telas/Perfil'
import { Respirar } from './telas/Respirar'

// a cena 3D, o jogo e a área dos adultos são carregados à parte, para o app abrir mais rápido
const Cena = lazy(() => import('./3d/Cena').then((m) => ({ default: m.Cena })))
const Dados = lazy(() => import('./telas/Dados').then((m) => ({ default: m.Dados })))
const Jornada = lazy(() => import('./jogo/Jornada').then((m) => ({ default: m.Jornada })))

export type Area = 'casa' | 'aprender' | 'jogar' | 'respirar'

/** Cada tela tem uma área (cor) e um título fixo no topo. */
const TOPO: Record<Tela, { area: Area; titulo: string; icone?: ReactNode }> = {
  perfil: { area: 'casa', titulo: 'Meu amigo', icone: <span className="topo-icone-amigo"><IconeAmigo tamanho={30} /></span> },
  inicio: { area: 'casa', titulo: 'Respira Comigo' },
  caminho: { area: 'aprender', titulo: 'Aprender', icone: <IlustraAprender tamanho={52} /> },
  jornada: { area: 'jogar', titulo: 'Jogar', icone: <IlustraJogar tamanho={52} /> },
  respirar: { area: 'respirar', titulo: 'Respirar', icone: <IlustraRespirar tamanho={52} /> },
  dados: { area: 'casa', titulo: 'Para adultos' },
}

export default function App() {
  const tela = useApp((s) => s.tela)
  const irPara = useApp((s) => s.irPara)
  const som = useApp((s) => s.som)
  const setSom = useApp((s) => s.setSom)
  const com3d = tela !== 'dados' && tela !== 'jornada'
  const topo = TOPO[tela]
  const naCasa = tela === 'inicio'

  return (
    <div className="app" data-area={topo.area}>
      <header className="topo">
        <button
          className="btn-redondo btn-casa"
          onClick={() => irPara('inicio')}
          aria-label="Voltar para o começo"
          aria-current={naCasa ? 'page' : undefined}
          title="Começo"
        >
          <IconeCasa tamanho={32} />
        </button>

        <div className="topo-titulo">
          {naCasa ? (
            <>
              <img src={icone} alt="" width={48} height={48} />
              <h1 className="marca-nome">
                Respira <b>Comigo</b>
              </h1>
            </>
          ) : (
            <div className="topo-pilula">
              {topo.icone}
              <h1>{topo.titulo}</h1>
            </div>
          )}
        </div>

        <button
          className="btn-redondo"
          onClick={() => {
            if (som) pararFala()
            setSom(!som)
          }}
          aria-pressed={som}
          aria-label={som ? 'Desligar o som' : 'Ligar o som'}
          title={som ? 'Som ligado' : 'Som desligado'}
        >
          {som ? <IconeSom tamanho={30} /> : <IconeSemSom tamanho={30} />}
        </button>
      </header>

      <main className={`conteudo ${com3d ? 'com-3d' : 'sem-3d'} tela-${tela}`}>
        <div className="palco" hidden={!com3d}>
          <Suspense fallback={<div className="palco-carregando">Chamando o seu amigo…</div>}>
            <Cena />
          </Suspense>
        </div>
        <div className="lado">
          {tela === 'perfil' && <Perfil />}
          {tela === 'inicio' && <Inicio />}
          {tela === 'caminho' && <Caminho />}
          {tela === 'respirar' && <Respirar />}
          {tela === 'jornada' && (
            <Suspense fallback={<p className="palco-carregando">Preparando o jogo…</p>}>
              <Jornada />
            </Suspense>
          )}
          {tela === 'dados' && (
            <Suspense fallback={<p className="palco-carregando">Carregando…</p>}>
              <Dados />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  )
}
