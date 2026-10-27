import { CORES_CABELO, IDADE_MAX, IDADE_MIN, TONS } from '../3d/perfil'
import { useApp } from '../store'

/**
 * Criação do personagem: poucas escolhas, todas por botão ou controle deslizante.
 * Nada é enviado — fica só neste aparelho.
 */
export function Perfil() {
  const p = useApp((s) => s.rascunho)
  const set = useApp((s) => s.setRascunho)
  const salvar = useApp((s) => s.salvarPerfil)
  const jaTinha = useApp((s) => s.perfil !== null)

  const idadeTexto = p.idade >= IDADE_MAX ? `${IDADE_MAX}+ anos` : `${p.idade} anos`

  return (
    <section className="painel perfil" aria-labelledby="titulo-perfil">
      <p className="sobretitulo">{jaTinha ? 'Seu personagem' : 'Antes de começar'}</p>
      <h1 id="titulo-perfil">{jaTinha ? 'Mude o seu personagem' : 'Crie o seu personagem'}</h1>
      <p className="lead">Ele vai te acompanhar pelo caminho do ar, no jogo e na respiração. Monte do jeito que quiser.</p>

      <fieldset className="campo">
        <legend>Corpo</legend>
        <div className="segmentado" role="radiogroup">
          {(['feminino', 'masculino'] as const).map((c) => (
            <button key={c} role="radio" aria-checked={p.corpo === c} className={p.corpo === c ? 'ativo' : ''} onClick={() => set({ corpo: c })}>
              {c === 'feminino' ? 'Feminino' : 'Masculino'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="campo">
        <legend>
          Idade <span className="valor">{idadeTexto}</span>
        </legend>
        <input
          type="range"
          min={IDADE_MIN}
          max={IDADE_MAX}
          step={1}
          value={p.idade}
          onChange={(e) => set({ idade: Number(e.target.value) })}
          aria-valuetext={idadeTexto}
          aria-label="Idade"
        />
      </fieldset>

      <fieldset className="campo">
        <legend>
          Tom de pele <span className="valor">{TONS[p.pele].nome}</span>
        </legend>
        <div className="amostras" role="radiogroup" aria-label="Tom de pele">
          {TONS.map((t, i) => (
            <button
              key={t.nome}
              role="radio"
              aria-checked={p.pele === i}
              aria-label={t.nome}
              title={t.nome}
              className={`amostra ${p.pele === i ? 'ativa' : ''}`}
              style={{ background: t.amostra }}
              onClick={() => set({ pele: i })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="campo">
        <legend>Cabelo</legend>
        <div className="segmentado" role="radiogroup">
          {(['curto', 'longo'] as const).map((c) => (
            <button key={c} role="radio" aria-checked={p.cabelo === c} className={p.cabelo === c ? 'ativo' : ''} onClick={() => set({ cabelo: c })}>
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
              className={`amostra pequena ${p.corCabelo === i ? 'ativa' : ''}`}
              style={{ background: c.amostra }}
              onClick={() => set({ corCabelo: i })}
            />
          ))}
        </div>
      </fieldset>

      <div className="acoes">
        <button className="btn btn-primario" onClick={salvar}>
          {jaTinha ? 'Salvar personagem' : 'Criar meu personagem'}
        </button>
      </div>
      <p className="nota">Suas escolhas ficam só neste aparelho. Nada é enviado.</p>
    </section>
  )
}

/** Ícone de "refazer o personagem": silhueta de pessoa com uma seta circular. */
export function IconeRefazer() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20.2 4.2v3.6h-3.6" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8.2 16.6c.7-2 2.1-3 3.8-3s3.1 1 3.8 3" />
    </svg>
  )
}
