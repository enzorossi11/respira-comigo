<p align="center">
  <img src="assets/logo/logo-horizontal.png" alt="Respira Comigo" width="440">
</p>

<p align="center"><b>Aprenda o caminho do ar. Respire no seu ritmo.</b></p>

<p align="center">
  <img alt="Checkpoint" src="https://img.shields.io/badge/etapa-Checkpoint%201%20·%20Idea%C3%A7%C3%A3o-7C6FE0">
  <img alt="ODS 3" src="https://img.shields.io/badge/ODS%203-Sa%C3%BAde%20e%20Bem--Estar-2BB5A8">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-FFB38A">
</p>

---

## Sumário

1. [Sobre o projeto](#1-sobre-o-projeto)
2. [Descrição do problema](#2-descrição-do-problema)
3. [Proposta de solução tecnológica](#3-proposta-de-solução-tecnológica)
4. [Identidade visual](#4-identidade-visual)
5. [Pitch inicial](#5-pitch-inicial)
6. [Cronograma](#6-cronograma)
7. [Estrutura do repositório](#7-estrutura-do-repositório)
8. [Equipe](#8-equipe)
9. [Referências](#9-referências)

---

## 1. Sobre o projeto

**Título:** Respira Comigo
**Tema:** Sistema respiratório · Saúde e Bem-Estar (ODS 3)

O **Respira Comigo** é uma aplicação web em que um **personagem 3D** mostra, de forma animada, o **caminho que o ar percorre** no corpo — do nariz até os alvéolos — e, em seguida, **conduz o usuário em uma respiração guiada**, com o peito do personagem se expandindo e contraindo no ritmo escolhido.

> **MVP:** caminho do ar em 3 etapas + respiração guiada com ritmo ajustável.

---

## 2. Descrição do problema

### 2.1 O problema

Adolescentes brasileiros convivem com níveis altos de **ansiedade, preocupação e irritabilidade**, e têm pouco acesso a apoio dentro da escola. Ao mesmo tempo, a **respiração** — uma das ferramentas mais simples e acessíveis de autorregulação — costuma ser ensinada só como conteúdo de prova (nomes de órgãos para decorar), sem ligação com o próprio bem-estar.

Resultado: o aluno estuda o sistema respiratório, mas não aprende a **usar a própria respiração** a seu favor.

### 2.2 Por que importa (dados)

| Indicador | Dado | Fonte |
|---|---|---|
| Ansiedade na população | O Brasil tem a maior prevalência de transtornos de ansiedade do mundo: **9,3%** da população (≈18,6 milhões de pessoas) | OMS, *Depression and Other Common Mental Disorders* (2017) |
| Preocupação no dia a dia | **50,6%** dos estudantes de 13 a 17 anos se sentiam muito preocupados com coisas comuns do cotidiano | IBGE, PeNSE 2019 |
| Irritação e nervosismo | **42,9%** dos estudantes de 13 a 17 anos dizem se sentir irritados, nervosos ou mal-humorados por qualquer coisa | IBGE, PeNSE 2024 |
| Tristeza frequente | **3 em cada 10** estudantes de 13 a 17 anos se sentem tristes sempre ou na maioria das vezes | IBGE, PeNSE 2024 |
| Apoio na escola | Só **34,1%** dos estudantes estudam em escolas com profissional de saúde mental no quadro | IBGE, PeNSE 2024 |
| Saúde respiratória | As doenças do aparelho respiratório (como asma e pneumonia) estão entre as **principais causas de internação de crianças** no SUS | DATASUS, SIH/SUS |

### 2.3 Público e contexto

- **Público principal:** estudantes de **11 a 17 anos** (anos finais do Ensino Fundamental e Ensino Médio), faixa em que o sistema respiratório é conteúdo escolar e em que a PeNSE mostra sinais de sofrimento emocional.
- **Público secundário:** **professores de Ciências/Biologia** (usam o app em aula) e **orientadores/psicólogos escolares** (usam a respiração guiada em momentos de acolhimento).
- **Contexto de uso:** sala de aula, laboratório de informática, celular do aluno antes de provas e apresentações, ou em casa.

### 2.4 Delimitação

O Respira Comigo **não é tratamento** e **não substitui atendimento** de saúde mental. Ele atua em **educação em saúde e autocuidado**: ensinar como a respiração funciona e oferecer uma prática simples de respiração lenta. O app exibe, de forma discreta, onde buscar ajuda (UBS, CAPS, CVV 188).

### 2.5 Bases de dados públicas e reais

| Base | Responsável | O que usaremos | Acesso |
|---|---|---|---|
| **PeNSE 2019 e 2024** – Pesquisa Nacional de Saúde do Escolar | IBGE | Indicadores de saúde mental dos estudantes (preocupação, irritação, tristeza, apoio na escola), por sexo, idade e região | [ibge.gov.br](https://www.ibge.gov.br/estatisticas/sociais/saude/9134-pesquisa-nacional-de-saude-do-escolar.html) – microdados públicos |
| **SIH/SUS** – Sistema de Informações Hospitalares | DATASUS / Ministério da Saúde | Internações por doenças do aparelho respiratório (CID-10, cap. X) por faixa etária e UF | [TabNet DATASUS](https://datasus.saude.gov.br/informacoes-de-saude-tabnet/) ou biblioteca Python **PySUS** |
| **Global Health Estimates** – saúde mental | OMS | Prevalência de ansiedade no Brasil vs. mundo | [who.int](https://www.who.int/publications/i/item/depression-global-health-estimates) |
| **PNS 2019** – Pesquisa Nacional de Saúde | IBGE | Diagnóstico autorreferido de asma e de depressão na população | [ibge.gov.br](https://www.ibge.gov.br/estatisticas/sociais/saude/9160-pesquisa-nacional-de-saude.html) |
| **BodyParts3D** | DBCLS (Japão) | Modelos 3D anatômicos abertos (traqueia, brônquios, pulmões) como base do modelo | [lifesciencedb.jp/bp3d](https://lifesciencedb.jp/bp3d/) – licença CC BY-SA |

Detalhes de cada base, variáveis e como serão tratadas: [`docs/bases-de-dados.md`](docs/bases-de-dados.md).

---

## 3. Proposta de solução tecnológica

### 3.1 Como a solução ataca o problema

O app une **aprender** e **praticar** em uma única experiência curta (3 a 5 minutos):

```
 1. APRENDER                        2. PRATICAR                       3. ENTENDER
 Caminho do ar em 3 etapas   ──►    Respiração guiada            ──►  Por que isso importa
 (personagem 3D animado)            (ritmo ajustável)                 (painel com dados reais)
```

**Fluxo principal (MVP)**

1. **Etapa 1 – Vias aéreas superiores:** o ar entra pelo nariz, é filtrado, aquecido e umedecido, passa pela faringe e laringe.
2. **Etapa 2 – Traqueia e brônquios:** o ar desce pela traqueia e se divide nos brônquios direito e esquerdo.
3. **Etapa 3 – Pulmões e alvéolos:** o ar chega aos alvéolos, onde acontece a troca de oxigênio e gás carbônico; o diafragma desce e os pulmões se expandem.
4. **Respiração guiada:** o personagem convida o usuário a respirar junto. O usuário ajusta **inspirar / segurar / expirar** (em segundos) ou escolhe um ritmo pronto (ex.: 4-4-6). Partículas de ar percorrem o mesmo caminho aprendido, o peito do personagem expande e contrai em sincronia, com um sinal sonoro suave opcional.

**Por que respiração lenta:** estudos de revisão mostram que a respiração lenta e controlada (≈6 ciclos por minuto) está associada a mais relaxamento e menos ansiedade (Zaccaro et al., 2018). O app usa esse princípio como prática de autocuidado, sem prometer efeito clínico.

### 3.2 Tecnologias

| Camada | Tecnologia | Uso no projeto |
|---|---|---|
| Interface | **React + Vite + TypeScript** | Telas, fluxo de etapas, controles de ritmo |
| 3D | **Three.js** via **React Three Fiber** + **drei** | Renderizar o personagem e o sistema respiratório no navegador |
| Modelo 3D | **Blender** (+ base do **BodyParts3D**), exportado em **glTF/GLB** | Personagem estilizado com pulmões visíveis e animação de respiração |
| Animação | **GSAP** + `useFrame` do R3F | Sincronizar câmera, partículas de ar e expansão do peito com o ritmo |
| Som | **Web Audio API** | Sinais sonoros suaves de inspirar/expirar (opcional) |
| Estado | **Zustand** | Etapa atual, ritmo escolhido, preferências |
| Dados | **Python + pandas + Jupyter** (+ **PySUS**) | Tratar PeNSE e SIH/SUS e gerar JSON leve para o app |
| Gráficos | **Recharts** | Painel “Por que isso importa” com os dados reais |
| Persistência | **localStorage** | Guardar ritmo preferido e nº de sessões, sem login e sem coletar dados pessoais |
| Entrega | **GitHub Pages** ou **Vercel** + GitHub Actions | Publicação gratuita a cada push na `main` |

### 3.3 Justificativa das escolhas técnicas

- **Web, e não app nativo:** abre em qualquer navegador — computador da escola, Chromebook ou celular —, sem instalação. Isso é decisivo para o uso em sala.
- **React Three Fiber em vez de Three.js puro:** permite escrever a cena 3D como componentes React, no mesmo padrão do resto da interface. Menos código, mais organização, e o grupo aprende uma só forma de trabalhar.
- **Personagem estilizado, não anatomia realista:** é mais acolhedor para adolescentes, mais leve para rodar em máquinas fracas e mais rápido de produzir no semestre. O BodyParts3D serve de referência anatômica para manter a correção do conteúdo.
- **glTF/GLB:** formato aberto e padrão da web para 3D, com animações embutidas e arquivo compacto.
- **Sem backend no MVP:** os dados públicos são pré-processados em Python e salvos como JSON estático. Isso elimina custo de servidor, reduz riscos e cabe no prazo. Não há cadastro nem coleta de dados de menores (alinhado à LGPD).
- **Python para dados:** é a ferramenta padrão para microdados do IBGE e do DATASUS (PySUS já baixa e lê os arquivos do SUS).
- **Viabilidade no semestre:** o MVP tem escopo fechado (3 etapas + 1 tela de respiração + 1 painel), com tecnologias gratuitas e bem documentadas. Recursos extras (modo professor, narração, novos exercícios) ficam como evolução.

### 3.4 Escopo por entrega

| Entrega | O que estará pronto |
|---|---|
| **Checkpoint 1** (19–23/10) | Problema, dados, solução, tecnologias, identidade visual e pitch (este README) |
| **Checkpoint 2** (09–13/11) | Protótipo navegável: 3 etapas do caminho do ar + respiração guiada com ritmo ajustável (dados podem estar mockados), README com instruções, prints e vídeo |
| **Apresentação final** (07–08/12) | Personagem 3D final, painel com dados reais da PeNSE/SIH, ajustes do Professor Mentor, deploy público e vídeo de até 3 min |

---

## 4. Identidade visual

Guia completo: [`docs/identidade-visual.md`](docs/identidade-visual.md)

### Logo

| Versão principal | Ícone | Fundo escuro |
|---|---|---|
| <img src="assets/logo/logo-horizontal.png" width="260"> | <img src="assets/logo/icone.png" width="90"> | <img src="assets/logo/logo-horizontal-negativo.png" width="260"> |

**Conceito:** dois pulmões com um rosto simpático (o personagem) dentro de um **anel de respiração**. A metade verde do anel é a **inspiração**, a metade lilás é a **expiração**, e o ponto pêssego marca o **ritmo** — o mesmo indicador que guia a respiração no app.

### Paleta de cores

<img src="assets/paleta.png" alt="Paleta de cores" width="720">

| Nome | HEX | Uso |
|---|---|---|
| Inspira | `#2BB5A8` | Inspiração, botões e ações principais |
| Inspira escuro | `#137A71` | Texto em verde sobre fundo claro (contraste acessível) |
| Expira | `#7C6FE0` | Expiração, destaques e estados ativos |
| Fôlego | `#FFB38A` | Personagem, pausas, marcador de ritmo |
| Noite | `#1F2547` | Textos e títulos; fundo do modo escuro |
| Névoa | `#F5F8FC` | Fundo da aplicação |

### Tipografia

<img src="assets/tipografia.png" alt="Tipografia" width="720">

- **Títulos:** [Nunito](https://fonts.google.com/specimen/Nunito) ExtraBold — cantos arredondados, amigável, combina com o personagem.
- **Textos e interface:** [Inter](https://fonts.google.com/specimen/Inter) Regular/SemiBold — muito legível em telas pequenas.

Ambas são gratuitas (Google Fonts, licença OFL).

---

## 5. Pitch inicial

Texto completo e roteiro: [`docs/pitch.md`](docs/pitch.md)

> O Brasil é o país com maior prevalência de ansiedade do mundo, e metade dos nossos estudantes de 13 a 17 anos diz se sentir muito preocupada com as coisas do dia a dia — mas só um terço deles tem um profissional de saúde mental na escola. A respiração é a ferramenta de autorregulação mais simples que existe, e mesmo assim a escola a ensina apenas como nomes de órgãos para decorar. O **Respira Comigo** muda isso: um personagem 3D mostra o caminho do ar do nariz aos alvéolos e, logo em seguida, respira junto com o aluno, no ritmo que ele escolher.
>
> **Diferencial:** une, em uma única experiência de poucos minutos, o **conteúdo de Ciências** e a **prática de bem-estar** — o aluno aprende como a respiração funciona e, na hora, sente isso no próprio corpo. Roda no navegador, sem instalação e sem cadastro, e é baseado em dados públicos reais sobre a saúde dos estudantes brasileiros.

---

## 6. Cronograma

| Período | Entrega | Foco |
|---|---|---|
| 19/10 a 23/10 | Checkpoint 1 | Ideação: problema, tecnologias, identidade visual e pitch inicial |
| 09/11 a 13/11 | Checkpoint 2 | Protótipo funcional, GitHub documentado e vídeo de demonstração |
| 07/12 e 08/12 | Apresentação final | Pitch de 5 minutos, projeto funcionando e repositório final |

---

## 7. Estrutura do repositório

```
respira-comigo/
├── README.md                 ← visão geral do projeto (você está aqui)
├── assets/
│   ├── logo/                 ← logo em SVG e PNG (horizontal, vertical, ícone, negativo, mono)
│   ├── paleta.png / .svg
│   └── tipografia.png / .svg
├── docs/
│   ├── bases-de-dados.md     ← detalhes das bases públicas e tratamento
│   ├── identidade-visual.md  ← guia de marca
│   └── pitch.md              ← pitch e roteiro
├── data/                     ← (CP2) notebooks e JSON tratados
└── app/                      ← (CP2) código da aplicação
```

---

## 8. Equipe

| Integrante | GitHub | Responsabilidade principal |
|---|---|---|
| Enzo Rossi | [@usuario](https://github.com/usuario) | Gestão do projeto, problema e dados |
| _Nome_ | [@usuario](https://github.com/usuario) | _Front-end e 3D_ |
| _Nome_ | [@usuario](https://github.com/usuario) | _Identidade visual e personagem_ |
| _Nome_ | [@usuario](https://github.com/usuario) | _Dados (PeNSE / DATASUS)_ |

> Cada integrante faz commits pela própria conta, em branch própria (`feat/nome-da-tarefa`), com Pull Request para a `main`.

---

## 9. Referências

- IBGE. **Pesquisa Nacional de Saúde do Escolar – PeNSE 2019** e **PeNSE 2024**. Rio de Janeiro: IBGE.
- IBGE. **Pesquisa Nacional de Saúde – PNS 2019**. Rio de Janeiro: IBGE, 2020.
- Ministério da Saúde. **DATASUS – Sistema de Informações Hospitalares do SUS (SIH/SUS)**.
- WORLD HEALTH ORGANIZATION. **Depression and Other Common Mental Disorders: Global Health Estimates**. Genebra: WHO, 2017.
- ZACCARO, A. et al. How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. **Frontiers in Human Neuroscience**, v. 12, 2018.
- DBCLS. **BodyParts3D**. Database Center for Life Science, Japão.
- ONU Brasil. **Objetivo de Desenvolvimento Sustentável 3 – Saúde e Bem-Estar**.

---

<sub>O Respira Comigo é um projeto acadêmico de educação em saúde. Não substitui avaliação ou tratamento profissional. Se precisar conversar, procure a UBS ou o CAPS da sua região, ou ligue para o CVV (188).</sub>
