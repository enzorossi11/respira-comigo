# O que mudou

Versões do Respira Comigo depois do Checkpoint 2. As mais novas ficam em cima.

## V2 — personagem personalizável (27/10/2026)

**Crie seu personagem**
- No primeiro acesso, o aluno monta o personagem: **corpo** (feminino ou masculino), **idade** (12 a 25+), **tom de pele** (5 tons) e **cabelo** (curto ou comprido, 5 cores). O boneco muda ao vivo enquanto ele mexe.
- O biotipo fica sempre no padrão saudável, de propósito: o app não pede peso e não cria motivo de comparação de corpo.
- As escolhas ficam só no navegador (localStorage). Nada é enviado.
- Na tela inicial, um ícone sem texto ao lado do boneco (silhueta de pessoa com seta circular) volta para a personalização, com as escolhas anteriores preenchidas.

**Personagem**
- Corpo novo do **MakeHuman** (assets CC0): pele com textura realista, olhos, sobrancelhas, cílios, cabelo curto ou comprido e roupa (bermuda, e top no corpo feminino). O corpo tem *morph targets* de sexo e idade.
- Os órgãos continuam sendo os do **Z-Anatomy** (CC BY-SA 4.0), agora num arquivo separado (`orgaos.glb`).
- **Órgãos ligados ao boneco:** `app/src/3d/ajuste.ts` mede a fúrcula, a cintura e a largura e profundidade do peito de cada corpo e encaixa pulmões, traqueia, brônquios, diafragma e o caminho do ar dentro dele. O trecho do nariz e da faringe é puxado até a narina do personagem.
- Corpos de qualquer altura aparecem do mesmo tamanho na tela, para a câmera de cada etapa continuar certa.

**Jogo (Jornada do ar)**
- O gigante do começo é o personagem que o aluno criou, e a partícula entra pela narina dele.
- Toda mensagem (dica de cada região, batida, pulmão escolhido) pausa o jogo por **2 s**, com uma barra de contagem logo acima do centro da tela.
- Na bifurcação, o jogo para por **3 s** e a tela se divide em duas zonas; o lado em que o jogador estiver segurando quando a contagem acabar é o pulmão escolhido. A zona da **direita** da tela é o **pulmão direito**.

**Qualidade**
- 48 testes (novos: encaixe dos órgãos, perfil do personagem, pausas e escolha do pulmão).
- Corrigido um aviso de chaves repetidas do React na tela do jogo.
- Vídeo de demonstração, prints, README, pitch e roteiro atualizados.

**Peso:** corpo 1,4 MB + órgãos 0,2 MB; as texturas de pele clara e escura (0,1 a 0,2 MB) só baixam se forem escolhidas.

## V1 — personagem anatômico (27/10/2026)

- Personagem modelado em código trocado pelo modelo anatômico do **Z-Anatomy**: pele "de vidro" no tronco e órgãos reais do sistema respiratório por dentro (cavidade nasal, faringe, laringe, traqueia, brônquios, pulmões e diafragma).
- Pulmões enchem, peito expande e diafragma desce no ritmo da respiração.
- No caminho do ar, a cabeça fica transparente e o órgão de cada etapa acende.
- No jogo, o gigante do começo passou a ser o mesmo modelo.
- Rosto mais detalhado: íris com pupila, córnea que reflete a luz, sombras e tons de pele gravados como cor de vértice.

## Antes da V1 — gamificação (depois do Checkpoint 2)

- Jogo **Jornada do ar** e **Desafio de ritmo**, com pontos, combo, estrelas e recordes.
- Cena com céu em degradê, partículas de ar e anel no chão que pulsa com a respiração.
