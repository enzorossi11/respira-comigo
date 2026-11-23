import { useApp } from '../store'
import { PERFIL_PADRAO, type Perfil } from './perfil'

/** Há quanto tempo (s) aconteceu a última reação, e qual foi. */
export function reacaoAtual(): { tipo: 'feliz' | 'uau' | 'ops'; idade: number } | null {
  const r = useApp.getState().reacao
  if (!r) return null
  const idade = (performance.now() - r.em) / 1000
  return idade < 1.6 ? { tipo: r.tipo, idade } : null
}

/** Pulinho de comemoração (aplicado ao personagem inteiro) */
export function alturaPulo(): number {
  const r = reacaoAtual()
  if (!r || r.tipo === 'ops') return 0
  return Math.max(0, Math.sin(Math.min(1, r.idade / 0.55) * Math.PI)) * 0.22
}

/** Balanço de "ops" (rotação em z, em radianos) */
export function balancoOps(): number {
  const r = reacaoAtual()
  if (!r || r.tipo !== 'ops' || r.idade > 0.9) return 0
  return Math.sin(r.idade * 22) * 0.05 * (1 - r.idade / 0.9)
}

/** Perfil mostrado agora: o rascunho na tela de personalização, senão o perfil salvo. */
export function usePerfilAtual(): Perfil {
  const tela = useApp((s) => s.tela)
  const rascunho = useApp((s) => s.rascunho)
  const perfil = useApp((s) => s.perfil)
  return tela === 'perfil' ? rascunho : (perfil ?? PERFIL_PADRAO)
}
