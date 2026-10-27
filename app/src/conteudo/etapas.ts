/** Conteúdo das 3 etapas do caminho do ar. */

export type Parte =
  | 'nariz'
  | 'faringe'
  | 'laringe'
  | 'traqueia'
  | 'bronquios'
  | 'pulmoes'
  | 'alveolos'
  | 'diafragma'

export interface Etapa {
  numero: 1 | 2 | 3
  titulo: string
  resumo: string
  pontos: { termo: string; texto: string }[]
  curiosidade: string
  partes: Parte[]
  /** trecho do caminho do ar (0 = narina, 1 = fundo do pulmão) que esta etapa cobre */
  trecho: [number, number]
  camera: { posicao: [number, number, number]; alvo: [number, number, number] }
}

export const ETAPAS: Etapa[] = [
  {
    numero: 1,
    titulo: 'Nariz, faringe e laringe',
    resumo: 'O ar entra e é preparado antes de descer.',
    pontos: [
      {
        termo: 'Nariz',
        texto: 'Os pelos e o muco seguram poeira e microrganismos. Lá dentro o ar também é aquecido e umedecido.',
      },
      {
        termo: 'Faringe',
        texto: 'É o “cruzamento” no fundo da garganta: por ali passam tanto o ar quanto a comida.',
      },
      {
        termo: 'Laringe',
        texto: 'Tem as cordas vocais. A epiglote funciona como uma tampa que fecha quando você engole, para a comida não ir para o pulmão.',
      },
    ],
    curiosidade: 'Respirar pelo nariz é melhor do que pela boca: o ar chega aos pulmões mais limpo, quente e úmido.',
    partes: ['nariz', 'faringe', 'laringe'],
    trecho: [0, 0.49],
    camera: { posicao: [2.0, 2.2, 3.5], alvo: [0, 1.7, 0] },
  },
  {
    numero: 2,
    titulo: 'Traqueia e brônquios',
    resumo: 'Um tubo firme leva o ar para dentro do peito e se divide em dois.',
    pontos: [
      {
        termo: 'Traqueia',
        texto: 'Um tubo de cerca de 10 a 12 cm, reforçado por anéis de cartilagem que o mantêm sempre aberto.',
      },
      {
        termo: 'Cílios',
        texto: 'Pelinhos microscópicos que, junto com o muco, empurram a sujeira de volta para cima.',
      },
      {
        termo: 'Brônquios',
        texto: 'A traqueia se divide em dois brônquios, um para cada pulmão. Eles se ramificam em tubos cada vez mais finos, os bronquíolos, como os galhos de uma árvore.',
      },
    ],
    curiosidade: 'A asma acontece quando os brônquios inflamam e se estreitam, deixando menos espaço para o ar passar.',
    partes: ['traqueia', 'bronquios'],
    trecho: [0.49, 0.9],
    camera: { posicao: [-1.5, 1.25, 3.7], alvo: [0, 0.9, 0] },
  },
  {
    numero: 3,
    titulo: 'Pulmões e alvéolos',
    resumo: 'O ar chega ao fim do caminho e o oxigênio entra no sangue.',
    pontos: [
      {
        termo: 'Alvéolos',
        texto: 'Saquinhos minúsculos na ponta dos bronquíolos. São centenas de milhões em cada pessoa.',
      },
      {
        termo: 'Troca gasosa',
        texto: 'Nos alvéolos, o oxigênio passa para o sangue e o gás carbônico sai do sangue para ser expirado.',
      },
      {
        termo: 'Diafragma',
        texto: 'Músculo abaixo dos pulmões. Ao contrair, ele desce e o ar entra; ao relaxar, ele sobe e o ar sai.',
      },
    ],
    curiosidade: 'Soltar o ar devagar ajuda o corpo a desacelerar. É isso que você vai praticar no próximo passo.',
    partes: ['pulmoes', 'alveolos', 'diafragma'],
    trecho: [0.9, 1],
    camera: { posicao: [0.9, 0.7, 4.2], alvo: [0.3, 0.35, 0] },
  },
]

export const ROTULO_PARTE: Record<Parte, string> = {
  nariz: 'Nariz',
  faringe: 'Faringe',
  laringe: 'Laringe',
  traqueia: 'Traqueia',
  bronquios: 'Brônquios',
  pulmoes: 'Pulmões',
  alveolos: 'Alvéolos',
  diafragma: 'Diafragma',
}
