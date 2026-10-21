"""Baixa do TabNet/DATASUS (SIH/SUS) as internações por Doenças do aparelho
respiratório (CID-10 capítulo X), Brasil, por ano de atendimento e faixa etária
(5 a 9, 10 a 14 e 15 a 19 anos), e salva a resposta bruta e um CSV limpo.

Uso (a partir da raiz do repositório):
    python3 data/scripts/baixar_sih.py

Saídas:
    data/raw/sih/nrbr_form.html          formulário .def baixado (para conferência)
    data/raw/sih/tabnet_resposta.html    resposta bruta do TabNet
    data/processed/sih_respiratorio.csv  tabela ano x faixa etária
"""
import csv
import html
import re
import sys
from pathlib import Path

import requests

DATA = Path(__file__).resolve().parent.parent
RAW = DATA / "raw" / "sih"
PROC = DATA / "processed"

# nrbr.def = "Morbidade Hospitalar do SUS - por local de residência - Brasil".
# (Atenção: nibr.def é a versão "por local de internação".)
URL_DEF = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sih/cnv/nrbr.def"
URL_POST = URL_DEF  # o formulário faz POST para o mesmo endereço

ANO_INI, ANO_FIM = 2015, 2024  # anos completos de atendimento
FAIXAS = {"3": "5 a 9 anos", "4": "10 a 14 anos", "5": "15 a 19 anos"}
CAPITULO_X = "10"  # X. Doenças do aparelho respiratório


def arquivos_disponiveis(form_html: str) -> list[str]:
    """Lista os arquivos mensais (nrbrAAMM.dbf) oferecidos pelo formulário."""
    return re.findall(r'OPTION VALUE="(nrbr\d{4}\.dbf)"', form_html)


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    PROC.mkdir(parents=True, exist_ok=True)

    r = requests.get(URL_DEF, timeout=120)
    r.raise_for_status()
    (RAW / "nrbr_form.html").write_bytes(r.content)
    form = r.content.decode("latin-1")

    # Para contar por ANO DE ATENDIMENTO é preciso incluir todos os meses de
    # processamento desde jan/ANO_INI até o mais recente (AIHs de um ano podem
    # ser processadas meses depois).
    arqs = [a for a in arquivos_disponiveis(form) if int(a[4:6]) >= ANO_INI % 100]
    if not arqs:
        print("ERRO: nenhum arquivo nrbr*.dbf encontrado no formulário.")
        return 1

    campos = [
        ("Linha", "Ano_atendimento"),
        ("Coluna", "Faixa_Etária_1"),
        ("Incremento", "Internações"),
    ]
    campos += [("Arquivos", a) for a in arqs]
    # Filtros: todas as categorias, exceto capítulo CID-10 e faixa etária.
    for nome in ["SMunicípio", "SCapital", "SRegião_de_Saúde_(CIR)",
                 "SMacrorregião_de_Saúde", "SMicrorregião_IBGE",
                 "SRegião_Metropolitana_-_RIDE", "STerritório_da_Cidadania",
                 "SMesorregião_PNDR", "SAmazônia_Legal", "SSemiárido",
                 "SFaixa_de_Fronteira", "SZona_de_Fronteira",
                 "SMunicípio_de_extrema_pobreza", "SCaráter_atendimento",
                 "SRegime", "SLista_Morb__CID-10", "SFaixa_Etária_2",
                 "SSexo", "SCor/raça"]:
        campos.append((nome, "TODAS_AS_CATEGORIAS__"))
    campos.append(("SCapítulo_CID-10", CAPITULO_X))
    campos += [("SFaixa_Etária_1", k) for k in FAIXAS]
    campos += [("formato", "prn"), ("mostre", "Mostra")]

    # O TabNet espera o corpo codificado em latin-1.
    corpo = "&".join(
        f"{requests.utils.quote(k.encode('latin-1'))}={requests.utils.quote(v.encode('latin-1'))}"
        for k, v in campos
    )
    resp = requests.post(
        URL_POST, data=corpo, timeout=600,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    resp.raise_for_status()
    (RAW / "tabnet_resposta.html").write_bytes(resp.content)
    texto = resp.content.decode("latin-1")
    # Confere se o TabNet aplicou os filtros pedidos (título e capítulo).
    plano = html.unescape(re.sub(r"<[^>]+>", " ", texto))
    for esperado in ("por local de residência", "Doenças do aparelho respiratório",
                     "5 a 9 anos, 10 a 14 anos, 15 a 19 anos"):
        if esperado not in plano:
            print("ERRO: a resposta não contém:", esperado)
            return 1
    periodo = re.search(r"Período:\s*([^\n]+)", plano)
    if periodo:
        print("Período informado pelo TabNet:", periodo.group(1).strip())

    # O formato "prn" devolve as linhas separadas por ";" dentro de um <PRE>.
    m = re.search(r"<PRE>(.*?)</PRE>", texto, re.S | re.I)
    if not m:
        print("ERRO: resposta do TabNet sem bloco <PRE>; ver", RAW / "tabnet_resposta.html")
        return 1
    linhas = [html.unescape(l).strip() for l in m.group(1).splitlines() if ";" in l]
    cab = [c.strip().strip('"') for c in linhas[0].split(";")]
    tabela = {}
    for l in linhas[1:]:
        cols = [c.strip().strip('"') for c in l.split(";")]
        ano = cols[0]
        if not re.fullmatch(r"\d{4}", ano):
            continue
        tabela[int(ano)] = dict(zip(cab[1:], cols[1:]))

    saida = PROC / "sih_respiratorio.csv"
    with saida.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ano_atendimento"] + list(FAIXAS.values()))
        for ano in range(ANO_INI, ANO_FIM + 1):
            if ano not in tabela:
                print(f"AVISO: ano {ano} ausente na resposta")
                continue
            vals = []
            for faixa in FAIXAS.values():
                v = tabela[ano].get(faixa, "-")
                vals.append(0 if v in ("-", "") else int(v.replace(".", "")))
            w.writerow([ano] + vals)
    print("Arquivos de processamento usados:", arqs[-1], "a", arqs[0], f"({len(arqs)} meses)")
    print("Gerado:", saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
