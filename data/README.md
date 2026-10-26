# Dados – Respira Comigo

Todos os números do painel **“Por que importa”** vêm de bases públicas oficiais, baixadas e tratadas pelos scripts desta pasta. Nenhum valor foi digitado à mão, exceto o da OMS (ver abaixo).

## Como gerar de novo

A partir da raiz do repositório:

```bash
pip install -r data/requirements.txt
python3 data/scripts/baixar_pense.py   # baixa as tabelas da PeNSE (IBGE)
python3 data/scripts/baixar_sih.py     # consulta o TabNet (DATASUS)
python3 data/scripts/gerar_json.py     # gera data/processed/indicadores.json
```

Os arquivos baixados ficam em `data/raw/`, que não vai para o GitHub (são grandes e podem ser recriados a qualquer momento).

## Arquivos gerados (`data/processed/`)

| Arquivo | Conteúdo |
|---|---|
| `indicadores.json` | Arquivo lido pelo app: cards e gráficos, cada um com fonte e link |
| `pense_extraido.csv` | Todos os valores extraídos da PeNSE, com intervalo de confiança de 95% (para conferência) |
| `sih_respiratorio.csv` | Internações por ano e faixa etária (SIH/SUS) |

## De onde vem cada número

### PeNSE – Pesquisa Nacional de Saúde do Escolar (IBGE)

Recorte usado em todos os casos: **escolares de 13 a 17 anos, Brasil**, aba `.1` de cada tabela (grupos de idade e Grandes Regiões).

| Indicador no app | Tabela | Arquivo baixado |
|---|---|---|
| Muito preocupados com coisas do dia a dia | 12.2.1 | [Tema 12 – Saúde Mental (2024)](https://ftp.ibge.gov.br/pense/2024/xlsx/Tema_12_Saude_Mental_XLSX_20260525.zip) · [2019](https://ftp.ibge.gov.br/pense/2019/xls/Tema_12_Saude_Mental_20260615.xls) |
| Tristes na maioria das vezes ou sempre | 12.3.1 | idem |
| Irritados, nervosos ou mal-humorados | 12.5.1 | idem |
| Autoavaliação de saúde mental negativa (total e por sexo) | 12.7.1 | idem |
| Preocupação: escola pública x privada | 12.2.1 | idem |
| Em escolas com profissional de saúde mental no quadro | 19.14.1 | [Tema 19 – Políticas de Saúde da Escola (2024)](https://ftp.ibge.gov.br/pense/2024/xlsx/Tema_19_Politicas_de_Saude_da_Escola_XLSX_20260525.zip) |

Por decisão do projeto, os indicadores sobre autolesão e ideação suicida (tabelas 12.6 e 12.8) **não são lidos nem exibidos**. O app é voltado a adolescentes e o foco é autocuidado.

### SIH/SUS – Sistema de Informações Hospitalares (DATASUS)

- **Consulta:** [TabNet – Morbidade Hospitalar do SUS, por local de residência (Brasil)](http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sih/cnv/nrbr.def)
- **Filtros:** Capítulo CID-10 **X. Doenças do aparelho respiratório**; faixas etárias **5 a 9, 10 a 14 e 15 a 19 anos**
- **Linhas:** ano de atendimento, **2015 a 2024** (anos completos)

### OMS (valor de publicação, não baixado)

- **9,3%** da população brasileira com transtorno de ansiedade (estimativa para 2015)
- Fonte: WHO, *Depression and Other Common Mental Disorders: Global Health Estimates* (2017): https://www.who.int/publications/i/item/depression-global-health-estimates
- É o único número do painel que está escrito diretamente no script, porque vem de um relatório em PDF e não de uma base de dados.

## Limitações

- Os dados da PeNSE são **autorreferidos** (o próprio estudante responde) e têm margem de erro. Os intervalos de confiança estão em `pense_extraido.csv`.
- 2020 e 2021 têm menos internações respiratórias por causa da pandemia (menos circulação de outros vírus e adiamento de atendimentos). O gráfico mostra essa queda sem correção.
- O SIH/SUS só registra internações no **SUS**, não as da rede privada.
