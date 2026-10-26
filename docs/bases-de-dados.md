# Bases de dados públicas

Todas as bases abaixo são públicas, oficiais e de acesso gratuito. No MVP elas são tratadas em Python (pasta `data/`) e convertidas em arquivos JSON pequenos que o app lê sem precisar de servidor.

---

## 1. PeNSE – Pesquisa Nacional de Saúde do Escolar (IBGE)

- **Edições:** 2019 e 2024
- **Quem responde:** estudantes de 13 a 17 anos de escolas públicas e privadas de todo o Brasil (amostra representativa; a edição 2024 entrevistou mais de 118 mil estudantes)
- **Link:** https://www.ibge.gov.br/estatisticas/sociais/saude/9134-pesquisa-nacional-de-saude-do-escolar.html
- **Formato:** tabelas prontas (SIDRA) e microdados

**Variáveis que vamos usar**

| Variável | Para quê |
|---|---|
| Sentir-se muito preocupado com coisas comuns do dia a dia | Mostrar o tamanho do problema |
| Sentir-se irritado, nervoso ou mal-humorado | Mostrar o tamanho do problema |
| Sentir-se triste na maioria das vezes | Contexto de bem-estar |
| Escola com profissional de saúde mental | Mostrar a falta de apoio na escola |
| Recortes por sexo, idade, rede (pública/privada) e região | Painel “Por que isso importa” |

---

## 2. SIH/SUS – Sistema de Informações Hospitalares (DATASUS)

- **Responsável:** Ministério da Saúde
- **Link:** https://datasus.saude.gov.br/informacoes-de-saude-tabnet/
- **Acesso via código:** consulta automática ao TabNet pelo script `data/scripts/baixar_sih.py`

**Recorte**

- Internações por **doenças do aparelho respiratório** (CID-10, capítulo X: J00–J99), com destaque para **asma (J45)** e **pneumonia (J12–J18)**
- Faixas etárias de **5 a 19 anos**
- Por UF e ano (série recente)

**Para quê:** mostrar que conhecer e cuidar do sistema respiratório também é uma questão de saúde pública para crianças e adolescentes — e dar contexto real ao conteúdo das 3 etapas.

---

## 3. OMS – Global Health Estimates (saúde mental)

- **Documento:** *Depression and Other Common Mental Disorders: Global Health Estimates* (2017)
- **Link:** https://www.who.int/publications/i/item/depression-global-health-estimates
- **Dado usado:** prevalência de transtornos de ansiedade no Brasil (9,3%) em comparação com a média mundial (3,6%)

---

## 4. PNS 2019 – Pesquisa Nacional de Saúde (IBGE)

- **Link:** https://www.ibge.gov.br/estatisticas/sociais/saude/9160-pesquisa-nacional-de-saude.html
- **Dados usados:** diagnóstico autorreferido de asma e de depressão na população, para complementar os números da PeNSE com a população geral

---

## 5. BodyParts3D (modelos 3D anatômicos)

- **Responsável:** Database Center for Life Science (DBCLS), Japão
- **Link:** https://lifesciencedb.jp/bp3d/
- **Licença:** Creative Commons BY-SA
- **Uso:** referência anatômica para traqueia, brônquios e pulmões do personagem (no protótipo, o personagem é modelado direto em código com Three.js; o BodyParts3D fica como referência)

---

## Fluxo de tratamento

```
PeNSE (planilhas IBGE)  ──┐
SIH/SUS (TabNet) ─────────┼──►  scripts em data/scripts  ──►  data/processed/indicadores.json  ──►  painel no app (Recharts)
OMS (valor publicado) ────┘
```

Cada número exibido no app terá a fonte e o ano indicados logo abaixo do gráfico.

Os números exatos, tabela por tabela, e como gerar tudo de novo estão em [`data/README.md`](../data/README.md).
