/**
 * O caminho do ar contado para crianças: oito paradas, uma parte do corpo
 * por vez, com uma frase curta e literal em cada uma.
 *
 * Cada parada aponta para uma das 3 etapas (que definem a câmera e o trecho
 * das partículas no 3D) e para a parte que fica destacada no personagem.
 */
import type { Parte } from './etapas'

export interface Parada {
  parte: Parte
  /** índice em ETAPAS (0, 1 ou 2) */
  etapa: number
  nome: string
  frase: string
}

export const PARADAS: Parada[] = [
  { parte: 'nariz', etapa: 0, nome: 'Nariz', frase: 'O ar entra pelo nariz. Os pelinhos seguram a sujeira.' },
  { parte: 'faringe', etapa: 0, nome: 'Garganta', frase: 'Depois, o ar passa pela garganta.' },
  { parte: 'laringe', etapa: 0, nome: 'Laringe', frase: 'Aqui tem uma tampinha. Ela fecha quando você engole comida.' },
  { parte: 'traqueia', etapa: 1, nome: 'Traqueia', frase: 'O ar desce por um tubo firme. Esse tubo é a traqueia.' },
  { parte: 'bronquios', etapa: 1, nome: 'Brônquios', frase: 'O tubo se divide em dois, como os galhos de uma árvore.' },
  { parte: 'pulmoes', etapa: 2, nome: 'Pulmões', frase: 'Os dois pulmões enchem de ar, como balões.' },
  { parte: 'alveolos', etapa: 2, nome: 'Alvéolos', frase: 'No fim tem bolinhas bem pequenas. Ali o ar passa para o sangue.' },
  { parte: 'diafragma', etapa: 2, nome: 'Diafragma', frase: 'Embaixo dos pulmões tem um músculo. Ele ajuda o ar a entrar e sair.' },
]
