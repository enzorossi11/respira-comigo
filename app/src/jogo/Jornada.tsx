import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from 'react'
import { BotaoOuvir } from '../componentes/BotaoOuvir'
import { IconeRepetir, IlustraDedo, IlustraOxigenio, IlustraParte, IlustraRespirar } from '../componentes/Icones'
import { falar } from '../lib/fala'
import { liberarAudio, tocarEfeito } from '../lib/som'
import { MODO_TESTE } from '../lib/teste'
import { useApp } from '../store'
import { CenaJogo } from './CenaJogo'
import { colide } from './obstaculos'
import { FASES, LADO_POR_SINAL, raioEm, S_ESCOLHA, type Lado } from './percurso'
import { Simulacao, type Evento, type Pausa, type Status } from './simulacao'

/**
 * Nome mostrado para cada lado da bifurcação. Usa o lado da TELA (direita = "Pulmão
 * direito"), que é mais fácil de entender do que o lado do corpo visto por dentro.
 */
const NOME_LADO: Record<Lado, string> = {
  [LADO_POR_SINAL.positivo]: 'Pulmão direito',
  [LADO_POR_SINAL.negativo]: 'Pulmão esquerdo',
} as Record<Lado, string>

const FALA_REGRAS = 'Viagem do ar. Você é o ar. Mexa o dedo para guiar o ar pelo corpo, do nariz até o pulmão. Toque em Começar.'

interface Hud {
  status: Status
  progresso: number
  fase: string
  pausa: Pick<Pausa, 'tipo' | 'dur' | 'id'> | null
  /** lado que a partícula escolheria agora (durante a escolha do pulmão) */
  ladoAgora: Lado
}

function lerHud(j: Simulacao): Hud {
  return {
    status: j.status,
    progresso: j.progresso,
    fase: j.fase,
    pausa: j.pausa && { tipo: j.pausa.tipo, dur: j.pausa.dur, id: j.pausa.id },
    ladoAgora: j.ladoPelaPosicao,
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

export function Jornada() {
  const sim = useRef(new Simulacao())
  const tremor = useRef(0)
  const area = useRef<HTMLDivElement>(null)
  const [hud, setHud] = useState<Hud>(() => lerHud(sim.current))
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null)
  const [partida, setPartida] = useState(0)
  const registrar = useApp((s) => s.registrarJornada)
  const irPara = useApp((s) => s.irPara)

  // gancho só para testes automáticos (prints e vídeo): /?teste
  useEffect(() => {
    if (new URLSearchParams(location.search).has('teste')) {
      Object.assign(window, { __jornada: sim, __colide: colide, __raioEm: raioEm, __sEscolha: S_ESCOLHA })
      sim.current.maxDt = 0.25
    }
  }, [])

  /** Mostra a mensagem (o jogo para por 2 s) e, com o som ligado, a voz lê. */
  const avisar = useCallback((texto: string) => {
    setAviso({ texto, id: performance.now() })
    if (useApp.getState().som) falar(texto, { rapido: true })
  }, [])

  // HUD atualiza ~10 vezes por segundo (o 3D roda a 60)
  useEffect(() => {
    const id = setInterval(() => setHud(lerHud(sim.current)), 100)
    return () => clearInterval(id)
  }, [partida])

  // na escolha do pulmão, o HUD acompanha o dedo/mouse mais de perto
  const escolhendo = hud.status === 'jogando' && hud.pausa?.tipo === 'escolha'
  useEffect(() => {
    if (!escolhendo) return
    if (useApp.getState().som) falar('Escolha um pulmão.', { rapido: true })
    const id = setInterval(() => setHud(lerHud(sim.current)), 50)
    return () => clearInterval(id)
  }, [escolhendo])

  const onEventos = useCallback(
    (ev: Evento[]) => {
      const tocar = useApp.getState().som
      for (const e of ev) {
        if (e.tipo === 'oxigenio') {
          if (tocar) tocarEfeito('oxigenio')
        } else if (e.tipo === 'fase') {
          const f = FASES.find((x) => x.id === e.id)
          if (f) avisar(`${f.nome}. ${f.dica}`)
          if (tocar) tocarEfeito('fase')
        } else if (e.tipo === 'lado') {
          avisar(`${NOME_LADO[e.lado]}!`)
          if (tocar) tocarEfeito('fase')
        } else if (e.tipo === 'escolha') {
          if (tocar) tocarEfeito('fase')
        } else if (e.tipo === 'venceu') {
          const j = sim.current
          registrar(j.pontos, j.estrelas())
          useApp.getState().reagir('uau')
          if (tocar) {
            tocarEfeito('vitoria')
            setTimeout(() => falar('Você chegou! O ar chegou ao pulmão e foi para o sangue.'), 700)
          }
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
    setHud(lerHud(sim.current))
    avisar(`${FASES[0].nome}. ${FASES[0].dica}`)
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

  const jogando = hud.status === 'jogando'
  const terminou = hud.status !== 'pronto' && !jogando

  return (
    <section className="jornada" aria-label="Jogo do ar">
      <div
        ref={area}
        className="jornada-area"
        tabIndex={0}
        onPointerMove={mover}
        onPointerDown={mover}
        aria-label="Área do jogo. Use o dedo, o mouse ou as setas para guiar o ar."
      >
        <Canvas key={`partida-${partida}`} camera={{ fov: 70, near: 0.1, far: 400 }} dpr={[1, 1.75]} gl={{ antialias: !MODO_TESTE, preserveDrawingBuffer: true }}>
          <CenaJogo sim={sim} tremor={tremor} />
          <Motor sim={sim} onEventos={onEventos} />
        </Canvas>

        {/* topo: onde o ar está agora */}
        {jogando && (
          <div className="hud-topo">
            <div className="hud-caixa">
              <span className="ponto-fase" />
              {FASES.find((f) => f.id === hud.fase)?.nome}
            </div>
          </div>
        )}

        {jogando && (
          <div className="hud-mapa" aria-label={`Caminho: ${Math.round(hud.progresso * 100)}%`}>
            <div className="hud-trilha">
              <div className="hud-preenche" style={{ width: `${hud.progresso * 100}%` }} />
              <span className="hud-eu" style={{ left: `${hud.progresso * 100}%` }} />
            </div>
            <div className="hud-legenda">
              <span>Nariz</span>
              <span>Pulmão</span>
            </div>
          </div>
        )}

        {/* mensagem com o jogo pausado: dá tempo de ler (e a voz lê junto) */}
        {aviso && jogando && hud.pausa?.tipo === 'aviso' && (
          <div key={hud.pausa.id} className="hud-pausa">
            <div className="hud-aviso" role="status">
              {aviso.texto}
              <div className="hud-contagem" aria-hidden="true">
                <span style={{ animationDuration: `${hud.pausa.dur}s` }} />
              </div>
            </div>
          </div>
        )}

        {/* escolha do pulmão: leve o dedo para um lado e espere */}
        {escolhendo && hud.pausa && (
          <div key={hud.pausa.id} className="hud-escolha">
            {(['negativo', 'positivo'] as const).map((sinal) => {
              const lado = LADO_POR_SINAL[sinal]
              return (
                <div key={sinal} className={`zona-escolha ${sinal === 'negativo' ? 'esq' : 'dir'}`} data-ativa={hud.ladoAgora === lado}>
                  <strong>{NOME_LADO[lado]}</strong>
                </div>
              )
            })}
            <div className="hud-aviso" role="status">
              Escolha um pulmão
              <small>Leve o dedo para um lado.</small>
              <div className="hud-contagem" aria-hidden="true">
                <span style={{ animationDuration: `${hud.pausa.dur}s` }} />
              </div>
            </div>
          </div>
        )}

        {/* antes de começar */}
        {hud.status === 'pronto' && (
          <div className="jornada-cartao">
            <h2>Viagem do ar</h2>
            <ul className="regras">
              <li>
                <IlustraOxigenio tamanho={52} />
                Você é o ar
              </li>
              <li>
                <IlustraDedo tamanho={52} />
                Mexa o dedo para guiar
              </li>
              <li>
                <IlustraParte parte="pulmoes" tamanho={52} />
                Vá do nariz até o pulmão
              </li>
            </ul>
            <BotaoOuvir texto={FALA_REGRAS} />
            <button className="btn btn-primario btn-enorme btn-largo" onClick={comecar}>
              Começar
            </button>
          </div>
        )}

        {/* chegada: toda viagem termina aqui */}
        {terminou && (
          <div className="jornada-cartao">
            <span className="ilustra-chegada">
              <IlustraParte parte="alveolos" tamanho={120} />
            </span>
            <h2>Você chegou!</h2>
            <p className="frase">O ar chegou ao pulmão e foi para o sangue.</p>
            <BotaoOuvir texto="Você chegou! O ar chegou ao pulmão e foi para o sangue." />
            <div className="cartao-botoes">
              <button className="btn btn-primario btn-enorme btn-largo" onClick={comecar}>
                <IconeRepetir tamanho={32} />
                Viajar de novo
              </button>
              <div data-area="respirar">
                <button className="btn btn-primario btn-largo" onClick={() => irPara('respirar')}>
                  <IlustraRespirar tamanho={44} />
                  Respirar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
