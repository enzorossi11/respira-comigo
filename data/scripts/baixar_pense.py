"""Baixa do servidor de arquivos do IBGE as tabelas da PeNSE (2019 e 2024)
usadas no projeto Respira Comigo e salva tudo em data/raw/ (não versionado).

Uso (a partir da raiz do repositório):
    python3 data/scripts/baixar_pense.py

Só baixa os temas necessários:
  - Tema 12 (Saúde Mental)
  - Tema 19 (Políticas de Saúde da Escola) - suporte psicológico na escola
  - Guia de tabelas de cada edição (lista oficial de títulos)
"""
import sys
import zipfile
from pathlib import Path

import requests

DATA = Path(__file__).resolve().parent.parent
RAW = DATA / "raw"

BASE = "https://ftp.ibge.gov.br/pense"
ARQUIVOS = {
    "pense2024": [
        f"{BASE}/2024/xlsx/Guia_Tabelas_PeNSE_2024_20260525.xlsx",
        f"{BASE}/2024/xlsx/Tema_12_Saude_Mental_XLSX_20260525.zip",
        f"{BASE}/2024/xlsx/Tema_19_Politicas_de_Saude_da_Escola_XLSX_20260525.zip",
    ],
    "pense2019": [
        f"{BASE}/2019/xls/Guia_Tabelas_PeNSE_2019_20260615.xls",
        f"{BASE}/2019/xls/Tema_12_Saude_Mental_20260615.xls",
        f"{BASE}/2019/xls/Tema_19_Politicas_de_Saude_da_Escola_20260615.xls",
    ],
}


def extrair_zip_seguro(caminho_zip: Path, destino: Path) -> None:
    """Extrai o .zip recusando caminhos absolutos ou com '..' (arquivo não confiável)."""
    destino.mkdir(parents=True, exist_ok=True)
    raiz = destino.resolve()
    with zipfile.ZipFile(caminho_zip) as z:
        for membro in z.infolist():
            alvo = (destino / membro.filename).resolve()
            if raiz not in alvo.parents and alvo != raiz:
                raise RuntimeError(f"Caminho suspeito no zip: {membro.filename}")
            if not membro.filename.lower().endswith((".xlsx", "/")):
                continue  # só nos interessam as planilhas
            z.extract(membro, destino)


def main() -> int:
    for pasta, urls in ARQUIVOS.items():
        d = RAW / pasta
        d.mkdir(parents=True, exist_ok=True)
        for url in urls:
            nome = url.rsplit("/", 1)[1]
            dest = d / nome
            print("Baixando", url)
            r = requests.get(url, timeout=300)
            r.raise_for_status()
            dest.write_bytes(r.content)
            if nome.endswith(".zip"):
                extrair_zip_seguro(dest, d / nome[:-4])
    print("Concluído. Arquivos em", RAW)
    return 0


if __name__ == "__main__":
    sys.exit(main())
