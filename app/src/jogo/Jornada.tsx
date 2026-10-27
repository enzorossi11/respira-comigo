import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from 'react'
import { liberarAudio, tocarEfeito } from '../lib/som'
import { MODO_TESTE } from '../lib/teste'
import { useApp } from '../store'
import { CenaJogo } from './CenaJogo'
import { colide, MARCOS } from './obstaculos'
import { FASES, raioEm, type Lado } from './percurso'
import { Simulacao, VIDAS, type Evento, type Status } from './simulacao'

const NOME_LADO: Record<Lado, string> = { direito: 'Pulmão direito', esquerdo: 'Pulmão esquerdo' }
const MSG_BATIDA = {
  pelo: 'Ai! Um pelo do nariz segurou você.',
  poeira: 'Poeira! O muco prende a sujeira.',
  polen: 'Pólen! É ele que causa alergia.',
  virus: 'Um vírus! Desvie da próxima vez.',
  epiglote: 'A epiglote fechou a passagem!',
} as const

interface Hud {
  status: Status
  pontos: number
  o2: number
  vidas: number
  progresso: number
  fase: string
  lado: Lado | null
}

function lerHud(j: Simulacao): Hud {
  return {
    status: j.status,
    pontos: j.pontos,
    o2: j.coletados.size,
    vidas: j.vidas,
    progresso: j.progresso,
    fase: j.fase,
    lado: j.lado,
  }
}

/** Loop da simulação dentro do Canvas (mesmo relógio do desenho) */
function Motor({ sim, onEventos }: { sim: MutableRefObject<Simulacao>; onEventos: (e: Evento[]) => void }) {
  const teclas = useTeclas()
  useFrame((_, dt) => {
    const j = sim.current
    // teclado: empurra o alvo na direção das setas
    const [kx, ky] = teclas.current
    if (kx || ky) j.mirar(j.alvoX + kx * dt * 2.4, j.alvoY + ky * dt * 2.4)
    const ev = j.passo(dt)
    if (ev.length) onEventos(ev)
  })
  return null
}

function useTeclas() {
  const dir = useRef<[number, number]>([0, 0])
  useEffect(() => {
    const ativas = new Set<string>()
    const atualizar = () => {
      const x = (ativas.has('ArrowRight') || ativas.has('d') ? 1 : 0) - (ativas.has('ArrowLeft') || ativas.has('a') ? 1 : 0)
      const y = (ativas.has('ArrowUp') || ativas.has('w') ? 1 : 0) - (ativas.has('ArrowDown') || ativas.has('s') ? 1 : 0)
      dir.current = [x, y]
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(k)) {
        e.preventDefault()
        ativas.add(k)
        atualizar()
      }
    }
    const up = (e: KeyboardEvent) => {
      ativas.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
      atualizar()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  return dir
}

function Estrelas({ n }: { n: number }) {
  return (
    <div className="estrelas" aria-label={`${n} de 3 estrelas`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''}>
          ★
        </span>
      ))}
    </div>
  )
}

export function Jornada() {
  const sim = useRef(new Simulacao())
  const tremor = useRef(0)
  const area = useRef<HTMLDivElement>(null)
  const [hud, setHud] = useState<Hud>(() => lerHud(sim.current))
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'bom' | 'ruim' | 'info'; id: number } | null>(null)
  const [flash, setFlash] = useState(0)
  const [recorde, setRecorde] = useState(false)
  const [partida, setPartida] = useState(0)
  const som = useApp((s) => s.som)
  const setSom = useApp((s) => s.setSom)
  const registrar = useApp((s) => s.registrarJornada)
  const melhor = useApp((s) => s.recordeJornada)
  const irPara = useApp((s) => s.irPara)

  // gancho só para testes automáticos (prints e vídeo): /?teste
  useEffect(() => {
    if (new URLSearchParams(location.search).has('teste')) {
      Object.assign(window, { __jornada: sim, __colide: colide, __raioEm: raioEm })
      sim.current.maxDt = 0.25
    }
  }, [])

  const avisar = useCallback((texto: string, tipo: 'bom' | 'ruim' | 'info') => setAviso({ texto, tipo, id: performance.now() }), [])

  // HUD atualiza ~10 vezes por segundo (o 3D roda a 60)
  useEffect(() => {
    const id = setInterval(() => setHud(lerHud(sim.current)), 100)
    return () => clearInterval(id)
  }, [partida])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), aviso.tipo === 'info' ? 3800 : 1600)
    return () => clearTimeout(id)
  }, [aviso])

  const onEventos = useCallback(
    (ev: Evento[]) => {
      const tocar = useApp.getState().som
      for (const e of ev) {
        if (e.tipo === 'oxigenio') {
          if (tocar) tocarEfeito('oxigenio')
        } else if (e.tipo === 'batida') {
          tremor.current = 1
          setFlash(performance.now())
          avisar(MSG_BATIDA[e.obstaculo], 'ruim')
          if (tocar) tocarEfeito('batida')
        } else if (e.tipo === 'fase') {
          const f = FASES.find((x) => x.id === e.id)
          if (f) avisar(`${f.nome}: ${f.dica}`, 'info')
          if (tocar) tocarEfeito('fase')
        } else if (e.tipo === 'lado') {
          avisar(`${NOME_LADO[e.lado]}! Siga até um alvéolo.`, 'bom')
        } else if (e.tipo === 'venceu') {
          const j = sim.current
          setRecorde(registrar(j.pontos, j.estrelas()))
          if (tocar) tocarEfeito('vitoria')
        }
      }
      setHud(lerHud(sim.current))
    },
    [avisar, registrar],
  )

  const comecar = () => {
    liberarAudio()
    if (sim.current.status !== 'pronto') {
      const maxDt = sim.current.maxDt
      sim.current = new Simulacao()
      sim.current.maxDt = maxDt
      setPartida((p) => p + 1)
    }
    sim.current.iniciar()
    setRecorde(false)
    setHud(lerHud(sim.current))
    avisar(`${FASES[0].nome}: ${FASES[0].dica}`, 'info')
    area.current?.focus()
  }

  // mouse e toque: a posição do ponteiro na tela vira o alvo da partícula
  const mover = (e: PointerEvent) => {
    const r = area.current?.getBoundingClientRect()
    if (!r) return
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1)
    sim.current.mirar(nx * 1.25, ny * 1.25)
  }

  const j = sim.current
  const total = j.oxigenios.length

  return (
    <section className="jornada" aria-label="Jogo Jornada do ar">
      <div
        ref={area}
        className="jornada-area"
        tabIndex={0}
        onPointerMove={mover}
        onPointerDown={mover}
        aria-label="Área do jogo. Use o mouse, o dedo ou as setas para guiar a partícula de ar."
      >
        <Canvas key={partida} camera={{ fov: 70, near: 0.1, far: 400 }} dpr={[1, 1.75]} gl={{ antialias: !MODO_TESTE, preserveDrawingBuffer: true }}>
          <CenaJogo sim={sim} tremor={tremor} />
          <Motor sim={sim} onEventos={onEventos} />
        </Canvas>

        <div className="jornada-flash" key={flash} data-ativo={flash > 0} />

        {/* HUD */}
        <div className="hud-topo">
          <div className="hud-fase">
            <span className="hud-rotulo">Fase</span>
            <strong>{FASES.find((f) => f.id === hud.fase)?.nome}</strong>
            {hud.lado && <span className="hud-lado">{NOME_LADO[hud.lado]}</span>}
          </div>
          <div className="hud-dir">
            <div className="hud-vidas" aria-label={`${hud.vidas} de ${VIDAS} fôlegos`}>
              {Array.from({ length: VIDAS }, (_, i) => (
                <span key={i} className={i < hud.vidas ? 'cheio' : ''} />
              ))}
            </div>
            <div className="hud-pontos">
              <span className="hud-o2">
                <span className="hud-rotulo">O₂</span> {hud.o2}/{total}
                <span className="hud-sep">·</span>
              </span>
              <strong>{hud.pontos}</strong> pts
            </div>
            <button className="hud-som" onClick={() => setSom(!som)} aria-pressed={som} aria-label={som ? 'Desligar som' : 'Ligar som'}>
              {som ? '🔊' : '🔈'}
            </button>
          </div>
        </div>

        <div className="hud-mapa" aria-label={`Progresso: ${Math.round(hud.progresso * 100)}%`}>
          <div className="hud-trilha">
            <div className="hud-preenche" style={{ width: `${hud.progresso * 100}%` }} />
            {MARCOS.slice(1).map((m) => (
              <span key={m.id} className="hud-marco" style={{ left: `${m.fracao * 100}%` }} title={m.nome} />
            ))}
            <span className="hud-eu" style={{ left: `${hud.progresso * 100}%` }} />
          </div>
          <div className="hud-legenda">
            <span>Nariz</span>
            <span>Traqueia</span>
            <span>Alvéolo</span>
          </div>
        </div>

        {aviso && hud.status === 'jogando' && (
          <div key={aviso.id} className={`hud-aviso ${aviso.tipo}`} role="status">
            {aviso.texto}
          </div>
        )}

        {/* telas de início e fim */}
        {hud.status === 'pronto' && (
          <div className="jornada-cartao">
            <p className="sobretitulo">Jogo</p>
            <h2>Jornada do ar</h2>
            <p>
              Você é uma molécula de <b>oxigênio</b>. Entre pelo nariz e chegue até um <b>alvéolo</b>, onde o oxigênio passa para o
              sangue.
            </p>
            <ul className="jornada-regras">
              <li>
                <b>Guie</b> com o mouse, o dedo ou as setas do teclado
              </li>
              <li>
                <b>Pegue</b> as bolinhas de O₂ brilhantes
              </li>
              <li>
                <b>Desvie</b> de pelos, poeira, pólen, vírus e da epiglote
              </li>
              <li>
                Você tem <b>3 fôlegos</b>
              </li>
            </ul>
            <div className="acoes centro">
              <button className="btn btn-primario grande" onClick={comecar}>
                Começar a jornada
              </button>
            </div>
            {melhor > 0 && <p className="nota">Seu recorde: {melhor} pontos</p>}
          </div>
        )}

        {hud.status === 'venceu' && (
          <div className="jornada-cartao vitoria">
            <p className="sobretitulo">Você chegou ao alvéolo!</p>
            <Estrelas n={j.estrelas()} />
            <h2>{hud.pontos} pontos</h2>
            {recorde && <p className="selo-recorde">Novo recorde!</p>}
            <p>
              Você levou o oxigênio até o fim do caminho. Aqui ele atravessa a parede finíssima do alvéolo e entra no sangue, enquanto o
              gás carbônico faz o caminho contrário para ser expirado.
            </p>
            <p className="nota">
              O₂ coletado: {hud.o2} de {total} · Fôlegos restantes: {hud.vidas}
            </p>
            <div className="acoes centro">
              <button className="btn btn-primario" onClick={comecar}>
                Jogar de novo
              </button>
              <button className="btn btn-secundario" onClick={() => irPara('respirar')}>
                Agora, respire comigo
              </button>
            </div>
          </div>
        )}

        {hud.status === 'perdeu' && (
          <div className="jornada-cartao derrota">
            <p className="sobretitulo">Acabou o fôlego</p>
            <h2>A partícula ficou presa</h2>
            <p>Boa notícia: é exatamente isso que o corpo faz com a sujeira! Pelos, muco e cílios seguram o que não deve chegar ao pulmão.</p>
            <p className="nota">Você chegou a {Math.round(hud.progresso * 100)}% do caminho, com {hud.pontos} pontos.</p>
            <div className="acoes centro">
              <button className="btn btn-primario" onClick={comecar}>
                Tentar de novo
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
