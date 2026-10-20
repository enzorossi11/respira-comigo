# Roteiro do projeto – o que foi feito e o que falta

Guia rápido para quem chega no repositório (professor, mentor ou integrante novo): o que já está pronto, onde ver cada coisa e quais são os próximos passos.

**Situação atual:** Checkpoint 1 concluído · próximo marco: Checkpoint 2 (09 a 13/11)

---

## 1. O que está pronto

### README (página principal)

O [README](../README.md) é o documento central do Checkpoint 1. De cima para baixo, ele traz:

| Seção | O que tem |
|---|---|
| Topo | Logo, slogan e selos (etapa, ODS 3, status) |
| 1. Sobre o projeto | Título, tema e o MVP em uma linha |
| 2. Descrição do problema | Problema, tabela de dados (OMS, PeNSE, DATASUS), público, delimitação e as 5 bases públicas com links |
| 3. Proposta de solução | Fluxo Aprender → Praticar → Entender, as 3 etapas do caminho do ar, respiração guiada, tecnologias e justificativas |
| 4. Identidade visual | Logo nas 3 versões, paleta e tipografia |
| 5. Pitch inicial | Parágrafo de relevância e diferencial |
| 6 a 9 | Cronograma, estrutura de pastas, equipe e referências |

### Arquivos e pastas

| Caminho | O que tem | Como ver |
|---|---|---|
| [`assets/logo/`](../assets/logo) | Logo horizontal, vertical, ícone, versão para fundo escuro e monocromática (SVG e PNG) | Clique no arquivo: o GitHub abre como imagem |
| [`assets/paleta.png`](../assets/paleta.png) | Folha com as 5 cores da marca | Imagem |
| [`assets/tipografia.png`](../assets/tipografia.png) | Folha com as fontes Nunito e Inter | Imagem |
| [`docs/bases-de-dados.md`](bases-de-dados.md) | Cada base pública: link, variáveis usadas e fluxo de tratamento | Texto formatado |
| [`docs/identidade-visual.md`](identidade-visual.md) | Guia de marca: conceito do logo, regras de uso, cores (HEX/RGB), tokens CSS, fontes e tom de voz | Texto formatado |
| [`docs/pitch.md`](pitch.md) | Pitch inicial e esqueleto minuto a minuto do pitch final de 5 min | Texto formatado |
| `data/` | Vazia – reservada para notebooks e JSON (Checkpoint 2) | – |
| `app/` | Vazia – reservada para o código da aplicação (Checkpoint 2) | – |

### Histórico de commits

1. Adiciona identidade visual: logo, paleta e tipografia
2. Adiciona documentação: bases de dados, guia de marca e pitch
3. Adiciona README do Checkpoint 1
4. Adiciona roteiro do projeto (este arquivo)

---

## 2. Checklist do Checkpoint 1

| Item pedido | Status | Onde está |
|---|---|---|
| Problema de Saúde e Bem-Estar | ✅ | README, seção 2.1 |
| Público ou contexto afetado | ✅ | README, seção 2.3 |
| Bases de dados públicas e reais | ✅ | README, seção 2.5 · `docs/bases-de-dados.md` |
| Título do projeto | ✅ | README, seção 1 |
| Como a solução ataca o problema | ✅ | README, seção 3.1 |
| Tecnologias | ✅ | README, seção 3.2 |
| Justificativa das escolhas técnicas | ✅ | README, seção 3.3 |
| Logo | ✅ | `assets/logo/` |
| Paleta de cores | ✅ | `assets/paleta.png` · `docs/identidade-visual.md` |
| Tipografia | ✅ | `assets/tipografia.png` · `docs/identidade-visual.md` |
| Pitch: relevância | ✅ | README, seção 5 · `docs/pitch.md` |
| Pitch: diferencial | ✅ | README, seção 5 · `docs/pitch.md` |
| Repositório público | ⚠️ Pendente | Hoje está privado |
| Participação visível de todos | ⚠️ Pendente | Falta commit dos demais integrantes |

---

## 3. O que falta antes de entregar o Checkpoint 1

- [ ] Tornar o repositório **público** (Settings → Danger Zone → Change visibility)
- [ ] Preencher a tabela **Equipe** do README com nomes e @ do GitHub
- [ ] Convidar os integrantes como colaboradores (Settings → Collaborators)
- [ ] Cada integrante fazer **pelo menos um commit** pela própria conta

---

## 4. Próximos passos – Checkpoint 2 (09 a 13/11)

| Entrega | O que fazer | Pasta |
|---|---|---|
| Protótipo funcional | Cena 3D com as 3 etapas do caminho do ar + tela de respiração com ritmo ajustável (dados podem ser mockados) | `app/` |
| Dados | Notebooks tratando PeNSE e SIH/SUS e gerando JSON para o painel | `data/` |
| GitHub atualizado | README com instruções de execução, prints e tecnologias usadas | raiz |
| Vídeo de demonstração | Gravação do fluxo principal funcionando | link no README |

## 5. Apresentação final (07 e 08/12)

- Personagem 3D final e painel com dados reais
- Ajustes pedidos pelo Professor Mentor
- Deploy público (GitHub Pages ou Vercel)
- Vídeo de até 3 min e pitch de 5 min (roteiro em [`docs/pitch.md`](pitch.md))
