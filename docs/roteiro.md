# Roteiro do projeto – o que foi feito e o que falta

Guia rápido para quem chega no repositório (professor, mentor ou integrante novo): o que já está pronto, onde ver cada coisa e quais são os próximos passos.

**Situação atual:** Checkpoint 1 ✅ · Checkpoint 2 ✅ (protótipo, dados reais, prints e vídeo) · próximo marco: **Apresentação final (07 e 08/12)**

---

## 1. Onde ver cada coisa

| O quê | Onde |
|---|---|
| Visão geral do projeto | [README](../README.md) |
| App funcionando | https://enzorossi11.github.io/respira-comigo/ (ou `npm run dev` dentro de `app/`) |
| Vídeo de demonstração (1min40) | [`docs/demo.mp4`](demo.mp4) |
| Prints de todas as telas | [`docs/prints/`](prints) |
| Código do app | [`app/src/`](../app/src) |
| Dados e de onde vem cada número | [`data/README.md`](../data/README.md) |
| Identidade visual | [`docs/identidade-visual.md`](identidade-visual.md) · [`assets/`](../assets) |
| Pitch inicial e roteiro do pitch final | [`docs/pitch.md`](pitch.md) |

---

## 2. Checklist do Checkpoint 1 (19 a 23/10)

| Item pedido | Status | Onde está |
|---|---|---|
| Problema, público e título | ✅ | README, seções 1 e 2 |
| Bases de dados públicas e reais | ✅ | README 2.5 · `data/README.md` |
| Solução, tecnologias e justificativas | ✅ | README, seções 3 e 6 |
| Logo, paleta e tipografia | ✅ | `assets/` · `docs/identidade-visual.md` |
| Pitch (relevância e diferencial) | ✅ | README 8 · `docs/pitch.md` |
| Repositório público | ✅ | github.com/enzorossi11/respira-comigo |
| Participação visível de todos | ⚠️ Pendente | Falta commit dos demais integrantes |

## 3. Checklist do Checkpoint 2 (09 a 13/11)

| Item pedido | Status | Onde está |
|---|---|---|
| Solução rodando, com fluxo principal navegável | ✅ | `app/` · 4 telas: Início → Caminho do ar → Respirar → Por que importa |
| Estrutura funcional (não só telas estáticas) | ✅ | Estado, lógica de respiração testada, 3D animado, dados lidos de arquivo |
| Dados (podiam ser mockados) | ✅ Reais | PeNSE 2019/2024 e SIH/SUS, gerados por `data/scripts/` |
| README com detalhes do projeto | ✅ | README |
| Instruções de como executar | ✅ | README, seção 5 |
| Prints do protótipo | ✅ | README, seção 4 · `docs/prints/` |
| Tecnologias utilizadas | ✅ | README, seção 6 |
| Vídeo com o fluxo principal | ✅ | `docs/demo.mp4` |
| Evolução desde o Checkpoint 1 | ✅ | README, seção 9 |
| Qualidade técnica | ✅ | 19 testes, lint sem erros, publicação automática com testes |

---

## 4. O que falta fazer (pelo grupo)

- [x] Tornar o repositório **público**
- [x] Ativar o site no GitHub Pages
- [ ] Preencher a tabela **Equipe** do README com nomes e @ do GitHub.
- [ ] Convidar os integrantes como colaboradores (Settings → Collaborators).
- [ ] Cada integrante fazer **commits pela própria conta**. Vale nota nos três momentos.
- [ ] Gravar uma **narração** por cima do vídeo, se o professor quiser o vídeo falado (o atual tem legendas na tela).

---

## 5. Apresentação final (07 e 08/12)

| Entrega | Situação |
|---|---|
| Pitch de 5 minutos | Roteiro pronto, minuto a minuto, em [`docs/pitch.md`](pitch.md), com plano B e perguntas prováveis. Falta ensaiar. |
| Projeto funcionando ao vivo | App pronto. Testar no computador da sala antes. |
| Repositório final | Público. Falta ter commits de todos. |
| Vídeo de até 3 min | O atual tem 1min40. Dá para reaproveitar ou regravar com narração. |
| Retornos do Professor Mentor | Incorporar depois do Checkpoint 2. |

**Ideias para depois do mentor:** modo professor (para projetar em sala), narração em áudio das etapas, mais exercícios de respiração, testes com alunos.

---

## 6. Histórico de commits

1. Adiciona identidade visual: logo, paleta e tipografia
2. Adiciona documentação: bases de dados, guia de marca e pitch
3. Adiciona README do Checkpoint 1
4. Adiciona roteiro do projeto
5. Adiciona protótipo do app: personagem 3D, caminho do ar e respiração guiada
6. Adiciona scripts de download dos dados
7. Adiciona dados reais, prints, vídeo e documentação do Checkpoint 2
