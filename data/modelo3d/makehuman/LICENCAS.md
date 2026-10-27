# Licenças dos assets usados em `saida/corpo_mh.glb`

Todos os assets são **CC0 1.0 (domínio público)**. Não exigem atribuição. Mesmo assim, ficam registrados abaixo a autoria e a origem.
Detentores do copyright antes da liberação como CC0 (setembro de 2020): Data Collection AB, Joel Palmius e Jonas Hauquier (equipe MakeHuman).
Cada arquivo traz no cabeçalho a frase "This asset was explicitly released as CC0 in september 2020". Isso foi conferido em cada arquivo listado.

| Asset | Uso no GLB | Autor | Licença | Origem (caminho local) |
|---|---|---|---|---|
| Malha base hm08 (`base.obj`) | PeleCabeca / PeleTronco / PeleMembros (geometria + UV) | MakeHuman team | CC0 (cabeçalho do arquivo + `LICENSE.ASSETS.md`) | `/home/claude/makehumancommunity/mpfb2/src/mpfb/data/3dobjs/base.obj` (github.com/makehumancommunity/mpfb2 @ 6ff1eb3) |
| Targets macro (`macrodetails/*.target.gz`: universal + african/asian/caucasian) | morph targets Feminino / Jovem / FemininoJovem / Magro / Largo e forma base | MakeHuman team | CC0 (`mpfb2/LICENSE.ASSETS.md`) | `.../mpfb2/src/mpfb/data/targets/macrodetails/` |
| Pesos do rig padrão (`weights.default.json`) | usado só na construção: pose dos braços e divisão das regiões da pele. Não vai no GLB. | MakeHuman team | CC0 (campo `license`) | `.../mpfb2/src/mpfb/data/rigs/standard/weights.default.json` |
| Grupos de vértices (`basemesh_vertex_groups.json`) | usado só na construção (juntas) | MakeHuman team | CC0 | `.../mpfb2/src/mpfb/data/mesh_metadata/` |
| Pele `young_caucasian_male` (`young_lightskinned_male_diffuse.png`) | textura `pele_clara`. Também é a base do tom `pele_medio` (embutido no GLB) e de `pele_neutra_tingir`. | makehuman_system | CC0 | `/home/claude/makehuman/assets_src/sys/skins/young_caucasian_male/` |
| Pele `young_african_male` (`young_darkskinned_male_diffuse.png`) | textura `pele_escura` (e a referência de cor do tom médio) | makehuman_system | CC0 | `assets_src/sys/skins/young_african_male/` |
| Olhos `high-poly` (obj + mhclo) | malha `Olhos` | makehuman_system | CC0 | `assets_src/sys/eyes/high-poly/` |
| Materiais de olho `brown` + `brownlight` | textura dos olhos (mistura 45/55) | makehuman_system | CC0 | `assets_src/sys/eyes/materials/` |
| Sobrancelha `eyebrow001` | malha `Sobrancelhas` | makehuman_system | CC0 | `assets_src/sys/eyebrows/eyebrow001/` |
| Cílios `eyelashes01` | malha `Cilios` | makehuman_system | CC0 | `assets_src/sys/eyelashes/eyelashes01/` |
| Cabelo `short02` | malha `Cabelo` (curto) | makehuman_system | CC0 | `assets_src/sys/hair/short02/` |
| Cabelo `ponytail01` | malha `CabeloLongo` (rabo de cavalo) | makehuman_system | CC0 | `assets_src/sys/hair/ponytail01/` |
| Roupa `female_sportsuit01` (top + legging, difusa + normal) | malhas `Top` e `Bermuda` (legging cortada acima do joelho) | makehuman_system | CC0 | `assets_src/sys/clothes/female_sportsuit01/` |

Pacote de origem dos assets em `assets_src/sys`: `makehuman_system_assets_cc0.zip`
(https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip).
O índice do pacote (`assets_src/sys/packs/makehuman_system_assets.json`) marca todos os itens com `"license": "CC0"`.

Observações:
- O código do MakeHuman e do MPFB (AGPL / GPL) **não** foi copiado. `construir_corpo.py` só reimplementa as fórmulas (pesos dos macros e ajuste das proxies `.mhclo`).
- As texturas da pele têm um selo "PUBLICDOMAIN MAKEHUMAN.ORG" num canto do atlas, fora das ilhas de UV. Ele não aparece no modelo.
- A malha base não tem genitais: o `helper-genital` é geometria auxiliar e foi descartado junto com todos os outros helpers.
