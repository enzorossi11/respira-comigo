# Pitch – Respira Comigo

## Pitch inicial (Checkpoint 1)

O Brasil é o país com maior prevalência de ansiedade do mundo, e metade dos nossos estudantes de 13 a 17 anos diz se sentir muito preocupada com as coisas do dia a dia — mas só um terço deles tem um profissional de saúde mental na escola. A respiração é a ferramenta de autorregulação mais simples que existe, e mesmo assim a escola a ensina apenas como nomes de órgãos para decorar. O **Respira Comigo** muda isso: um personagem 3D mostra o caminho do ar do nariz aos alvéolos e, logo em seguida, respira junto com o aluno, no ritmo que ele escolher.

### Relevância

- Problema grande e medido: OMS (ansiedade 9,3% no Brasil) e IBGE/PeNSE (preocupação, irritação e tristeza entre estudantes).
- Lacuna clara: pouco apoio em saúde mental dentro das escolas.
- Alinhado ao **ODS 3 – Saúde e Bem-Estar**, em especial à promoção da saúde mental (meta 3.4).

### Diferencial

1. **Aprender + praticar na mesma experiência:** apps de respiração não ensinam anatomia; materiais de Ciências não ensinam a respirar. O Respira Comigo faz os dois em poucos minutos.
2. **Personagem 3D que respira com você:** o aluno vê o ar fazendo o caminho que acabou de aprender, no mesmo ritmo da própria respiração.
3. **Acesso imediato:** roda no navegador, sem instalação, sem cadastro e sem coletar dados de menores.
4. **Baseado em dados reais:** o painel mostra, com fonte, por que o tema importa para os estudantes brasileiros.

---

## Pitch final – 5 minutos (07 e 08/12)

**Formato:** 2 pessoas falando + 1 pessoa operando o app no projetor. O app já aberto na tela inicial, em tela cheia, com o som ligado.
**Ritmo de fala:** cerca de 130 palavras por minuto. O texto abaixo tem ~620 palavras, o que deixa folga para a demonstração.

### 0:00 – 0:40 · Gancho (fala 1)

> Antes de começar, eu queria pedir uma coisa para a banca: respirem com a gente por três ciclos.
>
> *(Operador clica em “Ir direto para a respiração” → preset Calma → Começar. Todos respiram 3 ciclos, cerca de 30 segundos.)*
>
> Obrigado. Isso que vocês acabaram de fazer — soltar o ar mais devagar do que puxaram — é uma das formas mais simples de o corpo desacelerar. E quase nenhum adolescente aprende isso na escola.

### 0:40 – 1:30 · Problema (fala 1)

> O Brasil é o país com a maior prevalência de transtornos de ansiedade do mundo, segundo a OMS: 9,3% da população.
>
> Entre os estudantes de 13 a 17 anos, a PeNSE 2024 do IBGE mostra que praticamente metade — 49,7% — se sente muito preocupada com as coisas do dia a dia. E só 34% estudam numa escola que tem um profissional de saúde mental no quadro.
>
> Ao mesmo tempo, o sistema respiratório está no currículo de Ciências — mas como lista de órgãos para decorar. O aluno aprende o nome “alvéolo”, mas não aprende a usar a própria respiração.

### 1:30 – 3:00 · Solução ao vivo (fala 2 + operador)

> O Respira Comigo junta as duas coisas.
>
> *(Operador: Início → “Começar pelo caminho do ar”.)*
>
> Na primeira parte, o personagem mostra o caminho do ar em três etapas. Primeiro, nariz, faringe e laringe — o ar é filtrado, aquecido e umedecido. *(Próxima etapa.)* Depois, traqueia e brônquios, a “árvore” que leva o ar para os dois pulmões. *(Próxima etapa.)* E por fim, os pulmões e os alvéolos, onde o oxigênio entra no sangue, com o diafragma descendo a cada inspiração.
>
> *(Operador: “Agora, respire comigo”.)*
>
> Na segunda parte, o aluno pratica. Ele escolhe um ritmo — ou ajusta cada fase no controle — e o personagem respira junto: o peito expande, o ar percorre o mesmo caminho que ele acabou de aprender, e o anel marca o tempo. Tem som suave opcional e a sessão termina sozinha.
>
> *(Operador: aba “Por que importa”.)*
>
> E na terceira, mostramos por que isso importa, com dados oficiais do IBGE e do DATASUS, cada número com a fonte embaixo.

### 3:00 – 3:45 · Diferencial (fala 1)

> O que diferencia o Respira Comigo:
> primeiro, ele une o conteúdo de Ciências com uma prática de bem-estar, na mesma experiência de poucos minutos;
> segundo, abre em qualquer navegador — computador da escola ou celular —, sem instalar nada e sem cadastro, então não coleta nenhum dado de menor de idade;
> terceiro, é construído sobre dados públicos e reais.

### 3:45 – 4:30 · Tecnologia e decisões (fala 2)

> Fizemos o app em React com TypeScript. O personagem e a anatomia são desenhados em 3D direto no navegador com Three.js, pelo React Three Fiber — por isso ele é leve e roda até em computador simples.
> A lógica da respiração é uma função pura, separada da interface e coberta por testes automáticos.
> Os dados foram baixados das bases do IBGE e do DATASUS e tratados com Python e pandas, gerando um arquivo leve que o app lê sem precisar de servidor.
> E a cada atualização no GitHub, os testes rodam e o site é publicado sozinho.

### 4:30 – 5:00 · Fechamento (fala 1)

> Nos próximos passos, queremos um modo professor para usar em sala e novos exercícios de respiração.
> O Respira Comigo não substitui um psicólogo — mas coloca, na mão de cada aluno, uma ferramenta que ele pode usar antes de uma prova, de uma apresentação… ou de um pitch.
> Obrigado. Respira comigo?

### Plano B (se algo falhar ao vivo)

- **Sem internet:** rodar a versão local (`npm run build` + `npm run preview`) no notebook antes da apresentação.
- **3D travando no computador da sala:** usar o vídeo de demonstração (`docs/demo.mp4`, baixado no notebook antes) a partir do trecho da respiração.
- **Tempo estourando:** cortar a etapa 2 do caminho do ar na demonstração (só citar).

### Perguntas prováveis da banca

| Pergunta | Resposta curta |
|---|---|
| Respiração lenta funciona mesmo? | Estudos de revisão associam a respiração lenta (cerca de 6 por minuto) a mais relaxamento e menos ansiedade (Zaccaro et al., 2018). O app é autocuidado, não tratamento. |
| Por que não um app de celular? | Web abre em qualquer aparelho da escola, sem instalação e sem loja. |
| E a privacidade? | Não há login nem servidor. As preferências ficam só no próprio navegador. |
| Os dados são reais? | Sim: PeNSE (IBGE) e SIH/SUS (DATASUS), baixados por scripts que estão no repositório e podem ser rodados de novo. |
| O que vocês fariam com mais tempo? | Modo professor, narração em áudio, mais exercícios e testes com alunos de verdade. |
