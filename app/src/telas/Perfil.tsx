import { BotaoOuvir } from '../componentes/BotaoOuvir'
import { IconeCheck } from '../componentes/Icones'
import { CORES_CABELO, IDADE_MAX, IDADE_MIN, TONS } from '../3d/perfil'
import { useApp } from '../store'

/** Idade em três faixas, em vez de um controle deslizante. */
const IDADES = [
  { nome: 'Criança', idade: IDADE_MIN },
  { nome: 'Jovem', idade: Math.round((IDADE_MIN + IDADE_MAX) / 2) },
  { nome: 'Adulto', idade: IDADE_MAX },
]

const FALA = 'Monte o seu amigo. Ele vai respirar com você. Escolha o corpo, a idade, a cor da pele e o cabelo. Depois, toque em Pronto.'

/**
 * Criação do personagem: poucas escolhas, todas por botão grande.
 * Nada é enviado — fica só neste aparelho.
 */
export function Perfil() {
  const p = useApp((s) => s.rascunho)
  const set = useApp((s) => s.setRascunho)
  const salvar = useApp((s) => s.salvarPerfil)
  const faixa = IDADES.reduce((a, b) => (Math.abs(b.idade - p.idade) < Math.abs(a.idade - p.idade) ? b : a))

  return (
    <section className="painel perfil" aria-labelledby="titulo-perfil">
      <div className="ola">
        <h2 id="titulo-perfil" className="titulo-grande">
          Monte o seu amigo
        </h2>
        <p className="frase texto-suave">Ele vai respirar com você.</p>
      </div>
      <BotaoOuvir texto={FALA} />

      <div className="escolha">
        <span className="escolha-titulo">Corpo</span>
        <div className="opcoes" role="radiogroup" aria-label="Corpo">
          {(['feminino', 'masculino'] as const).map((c) => (
            <button key={c} role="radio" aria-checked={p.corpo === c} className="opcao" onClick={() => set({ corpo: c })}>
              {c === 'feminino' ? 'Menina' : 'Menino'}
            </button>
          ))}
        </div>
      </div>

      <div className="escolha">
        <span className="escolha-titulo">Idade</span>
        <div className="opcoes" role="radiogroup" aria-label="Idade">
          {IDADES.map((f) => (
            <button key={f.nome} role="radio" aria-checked={faixa === f} className="opcao" onClick={() => set({ idade: f.idade })}>
              {f.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="escolha">
        <span className="escolha-titulo">Cor da pele</span>
        <div className="amostras" role="radiogroup" aria-label="Cor da pele">
          {TONS.map((t, i) => (
            <button
              key={t.nome}
              role="radio"
              aria-checked={p.pele === i}
              aria-label={t.nome}
              title={t.nome}
              className="amostra"
              style={{ background: t.amostra }}
              onClick={() => set({ pele: i })}
            />
          ))}
        </div>
      </div>

      <div className="escolha">
        <span className="escolha-titulo">Cabelo</span>
        <div className="opcoes" role="radiogroup" aria-label="Tamanho do cabelo">
          {(['curto', 'longo'] as const).map((c) => (
            <button key={c} role="radio" aria-checked={p.cabelo === c} className="opcao" onClick={() => set({ cabelo: c })}>
              {c === 'curto' ? 'Curto' : 'Comprido'}
            </button>
          ))}
        </div>
        <div className="amostras" role="radiogroup" aria-label="Cor do cabelo">
          {CORES_CABELO.map((c, i) => (
            <button
              key={c.nome}
              role="radio"
              aria-checked={p.corCabelo === i}
              aria-label={c.nome}
              title={c.nome}
              className="amostra"
              style={{ background: c.amostra }}
              onClick={() => set({ corCabelo: i })}
            />
          ))}
        </div>
      </div>

      <button className="btn btn-primario btn-enorme btn-largo" onClick={salvar}>
        <IconeCheck tamanho={34} />
        Pronto!
      </button>
      <p className="nota">As escolhas ficam só neste aparelho.</p>
    </section>
  )
}
