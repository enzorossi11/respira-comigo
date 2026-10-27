import { Sparkles } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import {
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Vector3,
} from 'three'
import { anguloEpiglote, posVirus, type Obstaculo } from './obstaculos'
import { CAMINHOS, paraMundo, quadroEm, raioEm, S, S_BIFURCACAO, type Caminho, type Lado } from './percurso'
import type { Simulacao } from './simulacao'
import { texturaParede, texturaPele } from './texturas'
import { anel, geometriaTunel } from './tunel'

type SimRef = MutableRefObject<Simulacao>

/** Só desenha o que está perto da partícula (e só o ramo escolhido) — deixa o jogo leve. */
function perto(sim: SimRef, s: number, c: Caminho): boolean {
  const j = sim.current
  if (s >= S_BIFURCACAO && j.lado && CAMINHOS[j.lado] !== c) return false
  return s > j.s - 6 && s < j.s + 75
}

const CEU = new Color('#bfe6f5')
const DENTRO = new Color('#5a1e2c')

/* ------------------------------------------------------------------ túnel */

/** Material da parede; nos brônquios recorta a parte que fica dentro do outro ramo (forma o "Y"). */
function useMaterialParede(recorte?: { a: Vector3; b: Vector3; ra: number; rb: number }) {
  return useMemo(() => {
    const m = new MeshStandardMaterial({
      map: texturaParede(),
      vertexColors: true,
      roughness: 0.62,
      metalness: 0,
      side: DoubleSide,
      emissive: new Color('#3a0d18'),
      emissiveIntensity: 0.35,
    })
    if (recorte) {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uA = { value: recorte.a }
        sh.uniforms.uB = { value: recorte.b }
        sh.uniforms.uRa = { value: recorte.ra }
        sh.uniforms.uRb = { value: recorte.rb }
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;')
        sh.fragmentShader = sh.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vMundo;\nuniform vec3 uA;\nuniform vec3 uB;\nuniform float uRa;\nuniform float uRb;',
          )
          .replace(
            'void main() {',
            `void main() {
  vec3 ab = uB - uA;
  float h = clamp(dot(vMundo - uA, ab) / dot(ab, ab), 0.0, 1.0);
  if (length(vMundo - (uA + ab * h)) < mix(uRa, uRb, h) * 0.97) discard;`,
          )
      }
    }
    return m
  }, [recorte])
}

function Tunel({ c, s0, s1, outro }: { c: Caminho; s0: number; s1: number; outro?: Caminho }) {
  const geo = useMemo(() => geometriaTunel(c, s0, s1), [c, s0, s1])
  const recorte = useMemo(() => {
    if (!outro) return undefined
    const sb = S.carina + 18
    return { a: paraMundo(outro, S.carina, 0, 0), b: paraMundo(outro, sb, 0, 0), ra: raioEm(S.carina) * 1.02, rb: raioEm(sb) }
  }, [outro])
  const mat = useMaterialParede(recorte)
  return <mesh geometry={geo} material={mat} />
}

/* --------------------------------------------------------------- lá fora */

function Rosto() {
  const q = useMemo(() => quadroEm(CAMINHOS.direito, S.narina), [])
  const pele = useMemo(() => texturaPele(), [])
  // o plano do rosto fica de frente para quem chega de fora
  const alvo = useMemo(() => q.ponto.clone().sub(q.tangente), [q])
  const ref = useRef<Group>(null)
  const alvoAnel = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    ref.current?.lookAt(alvo)
    if (alvoAnel.current) {
      const k = 1 + ((clock.elapsedTime * 0.8) % 1) * 0.6
      alvoAnel.current.scale.setScalar(k)
      ;(alvoAnel.current.material as MeshStandardMaterial).opacity = 1 - ((clock.elapsedTime * 0.8) % 1)
    }
  })
  const R = raioEm(S.narina)
  return (
    <group ref={ref} position={q.ponto}>
      <mesh>
        <ringGeometry args={[R * 0.98, 400, 96, 1]} />
        <meshStandardMaterial map={pele} color="#ffffff" roughness={0.85} side={DoubleSide} />
      </mesh>
      {/* borda da narina */}
      <mesh>
        <torusGeometry args={[R * 1.02, 0.55, 16, 64]} />
        <meshStandardMaterial color="#e9a184" roughness={0.7} />
      </mesh>
      {/* alvo pulsando: "entre aqui" */}
      <mesh ref={alvoAnel} position={[0, 0, 0.3]}>
        <torusGeometry args={[R * 1.05, 0.18, 12, 64]} />
        <meshStandardMaterial color="#9ff4ff" emissive="#3fe0d0" emissiveIntensity={1.5} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {/* a outra narina */}
      <mesh position={[R * 3.1, 0, 0.05]}>
        <circleGeometry args={[R * 0.95, 48]} />
        <meshBasicMaterial color="#5a1e2c" />
      </mesh>
      <mesh position={[R * 3.1, 0, 0]}>
        <torusGeometry args={[R * 1.0, 0.55, 16, 64]} />
        <meshStandardMaterial color="#e9a184" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ----------------------------------------------------------- obstáculos */

function Pelo({ c, o, sim }: { c: Caminho; o: Extract<Obstaculo, { tipo: 'pelo' }>; sim: SimRef }) {
  const ref = useRef<Mesh>(null)
  useFrame(() => {
    if (ref.current) ref.current.visible = perto(sim, o.s, c)
  })
  const { pos, quat, comp } = useMemo(() => {
    const R = raioEm(o.s)
    const base = paraMundo(c, o.s, Math.cos(o.ang) * R * 1.05, Math.sin(o.ang) * R * 1.05)
    const ponta = paraMundo(c, o.s + 0.3, Math.cos(o.ang) * (R - o.comp), Math.sin(o.ang) * (R - o.comp))
    const meio = base.clone().add(ponta).multiplyScalar(0.5)
    const d = ponta.clone().sub(base)
    const obj = new Object3D()
    obj.position.copy(meio)
    obj.lookAt(ponta)
    obj.rotateX(Math.PI / 2)
    return { pos: meio, quat: obj.quaternion.clone(), comp: d.length() }
  }, [c, o])
  return (
    <mesh ref={ref} position={pos} quaternion={quat}>
      <cylinderGeometry args={[0.05, 0.13, comp, 8]} />
      <meshStandardMaterial color="#5b3a2a" roughness={0.6} />
    </mesh>
  )
}

function Poeira({ c, o, sim }: { c: Caminho; o: Extract<Obstaculo, { tipo: 'poeira' | 'polen' }>; sim: SimRef }) {
  const ref = useRef<Mesh>(null)
  const pos = useMemo(() => paraMundo(c, o.s, o.x, o.y), [c, o])
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.visible = perto(sim, o.s, c)
      ref.current.rotation.x += dt * 0.6
      ref.current.rotation.y += dt * 0.9
    }
  })
  const polen = o.tipo === 'polen'
  return (
    <mesh ref={ref} position={pos} scale={o.r}>
      {polen ? <icosahedronGeometry args={[1, 1]} /> : <dodecahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial
        color={polen ? '#ffd23f' : '#8a7a6a'}
        emissive={polen ? '#7a5a00' : '#000000'}
        emissiveIntensity={polen ? 0.4 : 0}
        roughness={0.95}
        flatShading
      />
    </mesh>
  )
}

const ESPINHOS = (() => {
  const out: Vector3[] = []
  const g = (1 + Math.sqrt(5)) / 2
  for (const [a, b] of [[1, g], [-1, g], [1, -g], [-1, -g]])
    out.push(new Vector3(0, a, b), new Vector3(a, b, 0), new Vector3(b, 0, a))
  return out.map((v) => v.normalize())
})()

function Virus({ c, o, sim }: { c: Caminho; o: Extract<Obstaculo, { tipo: 'virus' }>; sim: SimRef }) {
  const ref = useRef<Group>(null)
  const tmp = useMemo(() => new Vector3(), [])
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.visible = perto(sim, o.s, c)
    if (!g.visible) return
    const [x, y] = posVirus(o, sim.current.t)
    paraMundo(c, o.s, x, y, tmp)
    g.position.copy(tmp)
    g.rotation.y = clock.elapsedTime * 0.8
    g.rotation.x = clock.elapsedTime * 0.5
  })
  return (
    <group ref={ref} scale={o.r}>
      <mesh>
        <sphereGeometry args={[0.78, 24, 24]} />
        <meshStandardMaterial color="#7fd36b" emissive="#2f6b1f" emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      {ESPINHOS.map((d, i) => (
        <group key={i} position={d.clone().multiplyScalar(0.85)} quaternion={new Object3D().quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d)}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.3, 6]} />
            <meshStandardMaterial color="#5aa84a" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#c86bd8" emissive="#6b1f7a" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      {/* olhinhos bravos: deixa claro que é "do mal" sem assustar */}
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.15, 0.72]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial color="#1f2547" />
        </mesh>
      ))}
    </group>
  )
}

function Epiglote({ c, o, sim }: { c: Caminho; o: Extract<Obstaculo, { tipo: 'epiglote' }>; sim: SimRef }) {
  const ref = useRef<Group>(null)
  const q = useMemo(() => quadroEm(c, o.s), [c, o])
  const R = raioEm(o.s)
  useFrame(() => {
    if (!ref.current) return
    ref.current.visible = perto(sim, o.s, c)
    ref.current.rotation.z = anguloEpiglote(o, sim.current.t) - Math.PI / 2
  })
  // orienta o grupo: x local = binormal, y local = normal (o mesmo plano usado na colisão)
  const quat = useMemo(() => {
    const z = new Vector3().crossVectors(q.binormal, q.normal)
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(q.binormal, q.normal, z))
  }, [q])
  return (
    <group position={q.ponto} quaternion={quat}>
      <group ref={ref}>
        <mesh>
          <circleGeometry args={[R * 1.02, 48, 0, Math.PI]} />
          <meshStandardMaterial color="#c4566c" emissive="#5a0f22" emissiveIntensity={0.4} roughness={0.5} side={DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[R * 1.0, 0.12, 8, 48, Math.PI]} />
          <meshStandardMaterial color="#ffd0d8" emissive="#ff5577" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  )
}

function Obstaculos({ sim }: { sim: SimRef }) {
  const lista = sim.current.obstaculos
  const desenhar = (c: Caminho, filtro: (o: Obstaculo) => boolean, prefixo: string) =>
    lista.filter(filtro).map((o, i) => {
      const key = `${prefixo}${i}`
      switch (o.tipo) {
        case 'pelo':
          return <Pelo key={key} c={c} o={o} sim={sim} />
        case 'poeira':
        case 'polen':
          return <Poeira key={key} c={c} o={o} sim={sim} />
        case 'virus':
          return <Virus key={key} c={c} o={o} sim={sim} />
        case 'epiglote':
          return <Epiglote key={key} c={c} o={o} sim={sim} />
      }
    })
  const antes = (o: Obstaculo) => o.s < S_BIFURCACAO
  const depois = (o: Obstaculo) => o.s >= S_BIFURCACAO
  return (
    <>
      {desenhar(CAMINHOS.direito, antes, 'a')}
      {desenhar(CAMINHOS.direito, depois, 'd')}
      {desenhar(CAMINHOS.esquerdo, depois, 'e')}
    </>
  )
}

/* ------------------------------------------------------------- oxigênio */

function Oxigenios({ sim }: { sim: SimRef }) {
  const ref = useRef<InstancedMesh>(null)
  const lista = sim.current.oxigenios
  const tmp = useMemo(() => new Object3D(), [])
  const p = useMemo(() => new Vector3(), [])
  const q = useMemo(() => new Vector3(), [])
  const N = lista.length * 2

  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const j = sim.current
    const c = CAMINHOS[j.ladoAtual]
    lista.forEach((o, i) => {
      const pego = j.coletados.has(o.id)
      const longe = o.s < j.s - 8 || o.s > j.s + 90 || j.status === 'venceu'
      const caminho = o.s >= S_BIFURCACAO ? c : CAMINHOS.direito
      const bob = Math.sin(clock.elapsedTime * 3 + o.id) * 0.12
      paraMundo(caminho, o.s, o.x, o.y + bob, p)
      const giro = clock.elapsedTime * 2 + o.id
      const qd = quadroEm(caminho, o.s)
      q.copy(qd.binormal).multiplyScalar(Math.cos(giro) * 0.2).addScaledVector(qd.tangente, Math.sin(giro) * 0.2)
      for (const [k, sinal] of [[0, 1], [1, -1]] as const) {
        tmp.position.copy(p).addScaledVector(q, sinal)
        tmp.scale.setScalar(pego || longe ? 0.0001 : 0.26)
        tmp.updateMatrix()
        m.setMatrixAt(i * 2 + k, tmp.matrix)
      }
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#9ff4ff" emissive="#3fe0d0" emissiveIntensity={1.4} roughness={0.2} toneMapped={false} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------- cílios e anéis */

function Cilios() {
  const ref = useRef<InstancedMesh>(null)
  const base = useMemo(() => {
    const out: { s: number; th: number }[] = []
    for (let s = S.traqueia + 2; s < S.carina - 4; s += 0.55)
      for (let k = 0; k < 14; k++) out.push({ s: s + (k % 2) * 0.27, th: (k / 14) * Math.PI * 2 + s * 0.3 })
    return out
  }, [])
  const tmp = useMemo(() => new Object3D(), [])
  const p = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const c = CAMINHOS.direito
    base.forEach((b, i) => {
      const q = quadroEm(c, b.s)
      const R = raioEm(b.s) * (1 - 0.07 * anel(b.s))
      dir.copy(q.binormal).multiplyScalar(Math.cos(b.th)).addScaledVector(q.normal, Math.sin(b.th))
      p.copy(q.ponto).addScaledVector(dir, R - 0.11)
      // onda: todos os cílios balançam "para cima", como se varressem o muco
      const onda = Math.sin(clock.elapsedTime * 5 - b.s * 0.9) * 0.6
      tmp.position.copy(p)
      tmp.lookAt(p.clone().sub(dir).addScaledVector(q.tangente, onda))
      tmp.rotateX(Math.PI / 2)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, base.length]} frustumCulled={false}>
      <capsuleGeometry args={[0.022, 0.18, 3, 6]} />
      <meshStandardMaterial color="#ffe1e6" emissive="#ff9fb5" emissiveIntensity={0.25} roughness={0.5} />
    </instancedMesh>
  )
}

/* -------------------------------------------------------------- alvéolo */

function Alveolo({ lado, sim }: { lado: Lado; sim: SimRef }) {
  const c = CAMINHOS[lado]
  const q = useMemo(() => quadroEm(c, S.fim), [c])
  const centro = useMemo(() => q.ponto.clone().addScaledVector(q.tangente, 3.2), [q])
  const hemacias = useRef<InstancedMesh>(null)
  const tmp = useMemo(() => new Object3D(), [])
  const N = 26
  useFrame(({ clock }) => {
    const m = hemacias.current
    if (!m) return
    const ganhou = sim.current.status === 'venceu'
    for (let i = 0; i < N; i++) {
      // hemácias passando num vaso que dá a volta no alvéolo
      const a = ((i / N) * Math.PI * 2 + clock.elapsedTime * (ganhou ? 0.9 : 0.35)) % (Math.PI * 2)
      tmp.position
        .copy(centro)
        .addScaledVector(q.binormal, Math.cos(a) * 4.6)
        .addScaledVector(q.tangente, Math.sin(a) * 4.6)
        .addScaledVector(q.normal, Math.sin(a * 3) * 0.6)
      tmp.rotation.set(a, a * 0.5, 0)
      tmp.scale.setScalar(0.42)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh position={centro}>
        <sphereGeometry args={[3.9, 40, 40]} />
        <meshStandardMaterial
          map={texturaParede()}
          color="#ffc7d2"
          emissive="#8a2a44"
          emissiveIntensity={0.25}
          transparent
          opacity={0.55}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={hemacias} args={[undefined, undefined, N]} frustumCulled={false}>
        <torusGeometry args={[0.7, 0.38, 12, 24]} />
        <meshStandardMaterial color="#d6283f" emissive="#6b0010" emissiveIntensity={0.4} roughness={0.4} />
      </instancedMesh>
      {/* vaso sanguíneo (capilar) em volta */}
      <mesh position={centro} quaternion={useMemo(() => new Object3D().quaternion.setFromUnitVectors(new Vector3(0, 0, 1), q.normal), [q])}>
        <torusGeometry args={[4.6, 0.75, 16, 64]} />
        <meshStandardMaterial color="#b0203a" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- jogador */

function Jogador({ sim }: { sim: SimRef }) {
  const ref = useRef<Group>(null)
  const luz = useRef<PointLight>(null)
  const tmp = useMemo(() => new Vector3(), [])
  useFrame(({ clock }) => {
    const j = sim.current
    const g = ref.current
    if (!g) return
    paraMundo(CAMINHOS[j.ladoAtual], j.s, j.x, j.y, tmp)
    g.position.copy(tmp)
    g.rotation.z = clock.elapsedTime * 2.5
    g.rotation.y = clock.elapsedTime * 1.3
    // pisca enquanto está protegido depois de uma batida; na vitória, "entra no sangue"
    g.visible = j.status !== 'venceu' && (!j.invulneravel || Math.floor(clock.elapsedTime * 12) % 2 === 0)
    if (luz.current) luz.current.position.copy(tmp)
  })
  return (
    <>
      <pointLight ref={luz} intensity={22} distance={16} decay={1.6} color="#d8fbff" />
      <group ref={ref}>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.27, 24, 24]} />
            <meshStandardMaterial color="#e6fdff" emissive="#5ff0ff" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))}
        {/* halo */}
        <mesh>
          <sphereGeometry args={[0.62, 24, 24]} />
          <meshBasicMaterial color="#7ff6ff" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}

/* -------------------------------------------------------------- câmera */

function Camera({ sim, tremor }: { sim: SimRef; tremor: MutableRefObject<number> }) {
  const { camera, scene } = useThree()
  const pos = useMemo(() => new Vector3(), [])
  const alvo = useMemo(() => new Vector3(), [])
  const olhar = useRef(new Vector3())
  const iniciou = useRef(false)
  const fundo = useMemo(() => new Color(), [])
  useEffect(() => {
    scene.fog = new Fog(CEU.clone(), 20, 120)
    return () => {
      scene.fog = null
    }
  }, [scene])

  useFrame(({ clock, size }, dt) => {
    // em tela "em pé" (celular), abre um pouco mais o campo de visão
    const fov = size.width < size.height ? 84 : 70
    const pc = camera as PerspectiveCamera
    if (pc.fov !== fov) {
      pc.fov = fov
      pc.updateProjectionMatrix()
    }
    const j = sim.current
    const c = CAMINHOS[j.ladoAtual]
    const q = quadroEm(c, Math.max(0, j.s - 6))
    const venceu = j.status === 'venceu'
    // atrás e um pouco acima da partícula; no fim, entra no alvéolo
    const atras = venceu ? 4.5 : 6
    paraMundo(c, Math.max(0, j.s - atras), j.x * 0.55, j.y * 0.55 + (venceu ? 0 : 0.7), pos)
    paraMundo(c, Math.min(c.comprimento, j.s + (venceu ? 3 : 7)), j.x * 0.25, j.y * 0.25, alvo)
    if (j.status === 'pronto') pos.addScaledVector(q.normal, Math.sin(clock.elapsedTime * 0.6) * 0.4)

    // tremidinha ao bater
    if (tremor.current > 0) {
      tremor.current = Math.max(0, tremor.current - dt * 2.5)
      const a = tremor.current * 0.35
      pos.x += (Math.random() - 0.5) * a
      pos.y += (Math.random() - 0.5) * a
    }

    const k = iniciou.current ? 1 - Math.exp(-dt * 6) : 1
    iniciou.current = true
    camera.position.lerp(pos, k)
    olhar.current.lerp(alvo, k)
    camera.up.lerp(q.normal, k).normalize()
    camera.lookAt(olhar.current)

    // céu lá fora → interior do corpo
    const dentro = Math.min(1, Math.max(0, (j.s - (S.narina - 6)) / 10))
    fundo.copy(CEU).lerp(DENTRO, dentro)
    scene.background = fundo
    const fog = scene.fog as Fog
    fog.color.copy(fundo)
    fog.near = 60 - dentro * 54
    fog.far = 260 - dentro * 215
  })
  return null
}

/* ---------------------------------------------------------------- cena */

export function CenaJogo({ sim, tremor }: { sim: SimRef; tremor: MutableRefObject<number> }) {
  const D = CAMINHOS.direito
  const E = CAMINHOS.esquerdo
  const ar = useRef<Group>(null)
  const sol = useRef<DirectionalLight>(null)
  useFrame(() => {
    // pontinhos de ar/muco que acompanham a partícula
    const j = sim.current
    // a luz "do sol" só existe lá fora; dentro do corpo, quem ilumina é a partícula
    if (sol.current) sol.current.intensity = 1.4 * (1 - Math.min(1, Math.max(0, (j.s - S.narina + 4) / 8)))
    if (ar.current) paraMundo(CAMINHOS[j.ladoAtual], j.s + 8, 0, 0, ar.current.position)
  })
  return (
    <>
      <hemisphereLight args={['#ffffff', '#7a2a3a', 0.9]} />
      <directionalLight ref={sol} position={[10, 30, 60]} intensity={1.4} />
      <Camera sim={sim} tremor={tremor} />

      <Rosto />
      <Tunel c={D} s0={S.narina - 0.5} s1={S.carina} />
      <Tunel c={D} s0={S.carina} s1={S.fim + 0.6} outro={E} />
      <Tunel c={E} s0={S.carina} s1={S.fim + 0.6} outro={D} />
      <Alveolo lado="direito" sim={sim} />
      <Alveolo lado="esquerdo" sim={sim} />
      <Cilios />

      <Obstaculos sim={sim} />
      <Oxigenios sim={sim} />
      <Jogador sim={sim} />

      <group ref={ar}>
        <Sparkles count={70} scale={[7, 7, 16]} size={3} speed={0.35} opacity={0.6} color="#fff3f5" />
      </group>
    </>
  )
}
