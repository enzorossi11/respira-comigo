import type { ReactNode } from 'react'
import { BotaoOuvir } from '../componentes/BotaoOuvir'
import { IconeAmigo, IconeCheck, IlustraAprender, IlustraJogar, IlustraRespirar } from '../componentes/Icones'
import { useApp, type Tela } from '../store'

interface Cartao {
  tela: Tela
  area: 'aprender' | 'jogar' | 'respirar'
  titulo: string
  sub: string
  ilustra: ReactNode
}

const CARTOES: Cartao[] = [
  { tela: 'caminho', area: 'aprender', titulo: 'Aprender', sub: 'O caminho do ar', ilustra: <IlustraAprender tamanho={84} /> },
  { tela: 'jornada', area: 'jogar', titulo: 'Jogar', sub: 'Leve o ar até o pulmão', ilustra: <IlustraJogar tamanho={84} /> },
  { tela: 'respirar', area: 'respirar', titulo: 'Respirar', sub: 'Respire com o seu amigo', ilustra: <IlustraRespirar tamanho={84} /> },
]

const FALA =
  'Oi! Vamos respirar juntos? Primeiro, aprenda o caminho do ar. Depois, jogue. No fim, respire com o seu amigo. Toque em um cartão para começar.'

/**
 * Tela inicial: três cartões grandes, sempre na mesma ordem (1, 2, 3).
 * Funciona como uma agenda visual: o que já foi feito ganha um ✓.
 */
export function Inicio() {
  const irPara = useApp((s) => s.irPara)
  const editarPerfil = useApp((s) => s.editarPerfil)
  const feito: Record<Cartao['tela'], boolean> = {
    caminho: useApp((s) => s.caminhoFeito),
    jornada: useApp((s) => s.recordeJornada > 0),
    respirar: useApp((s) => s.sessoes > 0),
    inicio: false,
    perfil: false,
    dados: false,
  }

  return (
    <section className="painel" aria-labelledby="titulo-inicio">
      <div className="ola">
        <h2 id="titulo-inicio" className="titulo-grande">
          Oi! Vamos respirar juntos?
        </h2>
        <p className="frase texto-suave">Escolha um cartão.</p>
      </div>

      <ol className="agenda" aria-label="O que fazer">
        {CARTOES.map((c, i) => (
          <li key={c.tela} data-area={c.area}>
            <button className="cartao-area" onClick={() => irPara(c.tela)}>
              {c.ilustra}
              <span>
                <strong>{c.titulo}</strong>
                <span className="sub">{c.sub}</span>
              </span>
              <span className={`cartao-num ${feito[c.tela] ? 'feito' : ''}`} aria-label={feito[c.tela] ? 'feito' : `passo ${i + 1}`}>
                {feito[c.tela] ? <IconeCheck tamanho={30} /> : i + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <BotaoOuvir texto={FALA} />

      <div className="rodape-inicio">
        <button className="btn btn-secundario" onClick={editarPerfil}>
          <IconeAmigo tamanho={28} />
          Mudar meu amigo
        </button>
        <button className="link-adultos" onClick={() => irPara('dados')}>
          Para adultos
        </button>
      </div>
    </section>
  )
}
