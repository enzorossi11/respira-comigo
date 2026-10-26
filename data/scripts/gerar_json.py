"""Lê as tabelas oficiais baixadas (PeNSE/IBGE e SIH/SUS) e gera:
    data/processed/pense_extraido.csv  todos os valores extraídos, com IC 95%
    data/processed/indicadores.json    arquivo consumido pelo app

Uso (a partir da raiz do repositório, depois de baixar_pense.py e baixar_sih.py):
    python3 -I data/scripts/gerar_json.py

Regras:
  - Nenhum número é digitado à mão, exceto o valor da OMS (ansiedade), que é
    um dado de literatura documentado no README.
  - Por decisão do projeto, NÃO são lidos indicadores sobre automutilação,
    ideação suicida ou "a vida não vale a pena" (as tabelas 12.6 e 12.8 da
    PeNSE nunca são abertas).
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent.parent
RAW = DATA / "raw"
PROC = DATA / "processed"

BASE = "https://ftp.ibge.gov.br/pense"
FONTES = {
    2024: {
        "12": (RAW / "pense2024/Tema_12_Saude_Mental_XLSX_20260525",
               f"{BASE}/2024/xlsx/Tema_12_Saude_Mental_XLSX_20260525.zip"),
        "19": (RAW / "pense2024/Tema_19_Politicas_de_Saude_da_Escola_XLSX_20260525",
               f"{BASE}/2024/xlsx/Tema_19_Politicas_de_Saude_da_Escola_XLSX_20260525.zip"),
    },
    2019: {
        "12": (RAW / "pense2019/Tema_12_Saude_Mental_20260615.xls",
               f"{BASE}/2019/xls/Tema_12_Saude_Mental_20260615.xls"),
        "19": (RAW / "pense2019/Tema_19_Politicas_de_Saude_da_Escola_20260615.xls",
               f"{BASE}/2019/xls/Tema_19_Politicas_de_Saude_da_Escola_20260615.xls"),
    },
}

# Tabelas da PeNSE lidas (lista fechada: nada fora daqui é aberto).
TABELAS = {
    "12.2": ("preocupacao", "Muito preocupados com coisas do dia a dia"),
    "12.3": ("tristeza", "Sentiram-se tristes na maioria das vezes ou sempre"),
    "12.5": ("irritacao", "Irritados, nervosos ou mal-humorados na maioria das vezes ou sempre"),
    "12.7": ("saude_mental_negativa", "Autoavaliação de saúde mental negativa"),
}
TABELA_SUPORTE = "19.13"
URL_SIH = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sih/cnv/nrbr.def"
PUBLICO = "Estudantes de 13 a 17 anos"


def abrir_planilha(ano: int, tema: str, tabela: str) -> pd.DataFrame:
    """Abre a aba '<tabela>.1' (recorte: grupos de idade e Grandes Regiões)."""
    caminho, _ = FONTES[ano][tema]
    aba = f"{tabela}.1"
    if ano == 2024:  # um .xlsx por tabela dentro do zip
        caminho = caminho / f"Tabelas {tabela}.xlsx"
    return pd.read_excel(caminho, sheet_name=aba, header=None)


def num(x) -> float:
    return float(str(x).replace(",", "."))


def linha_brasil_13_17(df: pd.DataFrame) -> int:
    """Índice da linha 'Brasil' logo abaixo do bloco '13 a 17 anos'."""
    col0 = df[0].astype(str).str.strip()
    ini = col0[col0 == "13 a 17 anos"].index[0]
    return col0[(col0 == "Brasil") & (col0.index > ini)].index[0]


def colunas_por_rotulo(df: pd.DataFrame, rotulos: list[str]) -> dict[str, int]:
    """Procura no cabeçalho (primeiras 12 linhas) a 1ª coluna de cada rótulo."""
    achados = {}
    for i in range(12):
        for j, v in enumerate(df.iloc[i].tolist()):
            v = str(v).strip()
            if v in rotulos and v not in achados:
                achados[v] = j
    faltam = set(rotulos) - set(achados)
    if faltam:
        raise ValueError(f"Rótulos não encontrados no cabeçalho: {faltam}")
    return achados


def extrair(ano: int, tabela: str) -> dict:
    df = abrir_planilha(ano, "12", tabela)
    titulo_oficial = str(df.iloc[0, 0]).strip()
    i = linha_brasil_13_17(df)
    cols = {"Total": 1}
    cols.update(colunas_por_rotulo(df, ["Homem", "Mulher", "Pública", "Privada"]))
    out = {"titulo_oficial": titulo_oficial, "linha": i}
    for nome, j in cols.items():
        out[nome] = (num(df.iloc[i, j]), num(df.iloc[i, j + 1]), num(df.iloc[i, j + 2]))
    return out


def extrair_suporte(ano: int) -> dict | None:
    """Tabela 19.13.1: só o 1º bloco (suporte para alunos, professores e funcionários)."""
    try:
        df = abrir_planilha(ano, "19", TABELA_SUPORTE)
    except (ValueError, FileNotFoundError):
        return None
    titulo = str(df.iloc[0, 0]).strip()
    if "suporte psicológico" not in titulo:
        return None
    i = linha_brasil_13_17(df)
    out = {"titulo_oficial": titulo, "linha": i}
    for nome, j in {"Total": 1, "Pública": 4, "Privada": 7}.items():
        out[nome] = (num(df.iloc[i, j]), num(df.iloc[i, j + 1]), num(df.iloc[i, j + 2]))
    return out


def extrair_profissional_quadro(ano: int) -> tuple[float, float, float] | None:
    """Tabela 19.14.1, coluna 'A escola possui em seu quadro de funcionários
    profissional de saúde psicológica/mental' – linha Brasil do bloco Total."""
    try:
        df = abrir_planilha(ano, "19", "19.14")
    except (ValueError, FileNotFoundError):
        return None
    cabecalho = " ".join(str(v) for v in df.iloc[:10, 1].tolist())
    if "quadro de funcionários" not in cabecalho:
        return None
    col0 = df[0].astype(str).str.strip()
    i = col0[col0 == "Brasil"].index[0]  # 1ª linha Brasil = bloco Total
    return num(df.iloc[i, 1]), num(df.iloc[i, 2]), num(df.iloc[i, 3])


def r1(x: float) -> float:
    return round(x + 0.0, 1)


def fonte(ano: int, tabela: str) -> str:
    return f"IBGE – PeNSE {ano}, Tabela {tabela}.1"


def main() -> int:
    PROC.mkdir(parents=True, exist_ok=True)
    dados = {}  # (ano, tabela) -> dict
    for ano in (2024, 2019):
        for t in TABELAS:
            dados[(ano, t)] = extrair(ano, t)
    suporte = {ano: extrair_suporte(ano) for ano in (2024, 2019)}

    # CSV completo com intervalos de confiança (para auditoria).
    with (PROC / "pense_extraido.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ano", "tabela", "indicador", "recorte", "percentual",
                    "ic95_inferior", "ic95_superior", "url", "titulo_oficial"])
        for (ano, t), d in sorted(dados.items()):
            for rec in ("Total", "Homem", "Mulher", "Pública", "Privada"):
                p, li, ls = d[rec]
                w.writerow([ano, f"{t}.1", TABELAS[t][0], rec, round(p, 4), round(li, 4),
                            round(ls, 4), FONTES[ano]["12"][1], d["titulo_oficial"]])
        for ano, d in sorted(suporte.items()):
            if d is None:
                continue
            for rec in ("Total", "Pública", "Privada"):
                p, li, ls = d[rec]
                w.writerow([ano, f"{TABELA_SUPORTE}.1", "suporte_psicologico_escola", rec,
                            round(p, 4), round(li, 4), round(ls, 4),
                            FONTES[ano]["19"][1], d["titulo_oficial"]])

    # ---- indicadores (cards) ----
    indicadores = []
    for t, (ind_id, titulo) in TABELAS.items():
        d = dados[(2024, t)]
        p, li, ls = d["Total"]
        indicadores.append({
            "id": f"{ind_id}_2024", "titulo": titulo, "valor": r1(p), "unidade": "%",
            "publico": PUBLICO, "ano": 2024, "fonte": fonte(2024, t),
            "url": FONTES[2024]["12"][1],
        })
        print(f"{ind_id}_2024: {p:.2f}% (IC95% {li:.2f}–{ls:.2f})")
    prof = extrair_profissional_quadro(2024)
    if prof:
        indicadores.append({
            "id": "profissional_saude_mental_2024",
            "titulo": "Em escolas com profissional de saúde mental no quadro de funcionários",
            "valor": r1(prof[0]), "unidade": "%", "publico": PUBLICO, "ano": 2024,
            "fonte": "IBGE – PeNSE 2024, Tabela 19.14.1",
            "url": FONTES[2024]["19"][1],
        })
        print(f"profissional_saude_mental_2024: {prof[0]:.2f}% (IC95% {prof[1]:.2f}–{prof[2]:.2f})")
    indicadores.append({
        "id": "ansiedade_oms", "titulo": "População com transtorno de ansiedade",
        "valor": 9.3, "unidade": "%", "publico": "População brasileira", "ano": 2015,
        "fonte": "OMS – Depression and Other Common Mental Disorders: Global Health Estimates (2017)",
        "url": "https://www.who.int/publications/i/item/depression-global-health-estimates",
    })

    # ---- gráficos ----
    graficos = []
    neg = {ano: dados[(ano, "12.7")] for ano in (2019, 2024)}
    graficos.append({
        "id": "saude_mental_por_sexo",
        "titulo": "Autoavaliação de saúde mental negativa, por sexo",
        "descricao": ("Percentual de escolares de 13 a 17 anos cuja autoavaliação em saúde "
                      "mental foi negativa nos 30 dias anteriores à pesquisa (Brasil). "
                      "No IBGE, 'Homem' e 'Mulher' correspondem a Meninos e Meninas."),
        "tipo": "barra", "unidade": "%",
        "fonte": "IBGE – PeNSE 2019 e 2024, Tabela 12.7.1",
        "url": FONTES[2024]["12"][1],
        "categorias": ["Meninos", "Meninas"],
        "series": [{"nome": str(ano), "valores": [r1(neg[ano]["Homem"][0]), r1(neg[ano]["Mulher"][0])]}
                   for ano in (2019, 2024)],
    })
    pre = {ano: dados[(ano, "12.2")] for ano in (2019, 2024)}
    graficos.append({
        "id": "preocupacao_publica_privada",
        "titulo": "Muito preocupados com coisas do dia a dia: escola pública x privada",
        "descricao": ("Percentual de escolares de 13 a 17 anos que se sentiram muito "
                      "preocupados com as coisas comuns do dia a dia na maioria das vezes "
                      "ou sempre, nos 30 dias anteriores à pesquisa, por dependência "
                      "administrativa da escola (Brasil)."),
        "tipo": "barra", "unidade": "%",
        "fonte": "IBGE – PeNSE 2019 e 2024, Tabela 12.2.1",
        "url": FONTES[2024]["12"][1],
        "categorias": ["Escola pública", "Escola privada"],
        "series": [{"nome": str(ano), "valores": [r1(pre[ano]["Pública"][0]), r1(pre[ano]["Privada"][0])]}
                   for ano in (2019, 2024)],
    })

    sih_csv = PROC / "sih_respiratorio.csv"
    if sih_csv.exists():
        sih = pd.read_csv(sih_csv)
        faixas = [c for c in sih.columns if c != "ano_atendimento"]
        graficos.append({
            "id": "internacoes_respiratorias",
            "titulo": "Internações por doenças do aparelho respiratório no SUS",
            "descricao": ("Internações hospitalares no SUS por Doenças do aparelho "
                          "respiratório (CID-10, capítulo X), Brasil, por ano de "
                          "atendimento e faixa etária, segundo local de residência."),
            "tipo": "linha", "unidade": "internações",
            "fonte": "Ministério da Saúde – SIH/SUS (DATASUS/TabNet), Morbidade Hospitalar do SUS por local de residência",
            "url": URL_SIH,
            "categorias": [str(a) for a in sih["ano_atendimento"]],
            "series": [{"nome": fx, "valores": [int(v) for v in sih[fx]]} for fx in faixas],
        })
    else:
        print("AVISO: sih_respiratorio.csv não encontrado; gráfico do SIH omitido.")

    saida = {"gerado_em": date.today().isoformat(), "indicadores": indicadores, "graficos": graficos}
    (PROC / "indicadores.json").write_text(
        json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Gerado:", PROC / "indicadores.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
