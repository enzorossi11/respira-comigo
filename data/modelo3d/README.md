# Modelo anatômico 3D

O personagem do app vem do **Z-Anatomy** (Gauthier Kervyn e Marcin Zielinski, derivado do BodyParts3D/DBCLS),
licença [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). O arquivo adaptado,
`app/public/modelos/corpo.glb`, é distribuído sob a mesma licença.

## O que o script faz

`exportar_modelo.py` roda dentro do Blender (ou com o módulo `bpy`), sem interface:

1. Abre o `Startup.blend` do Z-Anatomy.
2. Junta as regiões da pele em três peças (cabeça, tronco e membros), sem a região do períneo, e cola a costura do meio do corpo.
3. Separa cabelo, olhos e os órgãos do sistema respiratório: cavidade nasal, faringe, laringe, traqueia, brônquios, pulmões e diafragma. Malhas muito pesadas são simplificadas.
4. Gera uma bermuda moldada no corpo, lançando raios em anéis em volta do quadril e das pernas.
5. Acabamento do rosto: fecha as narinas, calcula a sombra de oclusão (raios em volta de cada vértice), pinta lábios, bochechas, nariz e pálpebras e desenha a íris (pupila, fibras e borda). Tudo vai como cor de vértice, sem textura.
6. Exporta `corpo_v2.glb`.

## Como gerar de novo

```bash
# 1. baixar o Z-Anatomy
git clone --depth 1 https://github.com/Z-Anatomy/Models-of-human-anatomy
unzip Models-of-human-anatomy/Z-Anatomy.zip -d extr

# 2. Blender como módulo Python (ou rode o script pelo Blender 4+)
python3 -m venv venv && ./venv/bin/pip install bpy
./venv/bin/python exportar_modelo.py

# 3. comprimir (meshopt + quantização), mantendo os nomes das peças
npx gltfpack -i corpo_v2.glb -o corpo.glb -cc -kn -km
cp corpo.glb ../../app/public/modelos/corpo.glb
```
