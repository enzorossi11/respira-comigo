/** Ligado só com ?teste no endereço (gravação automática de prints e vídeo). */
export const MODO_TESTE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('teste')
