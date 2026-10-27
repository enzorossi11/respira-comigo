#!/bin/sh
# Compressão final: meshopt (EXT_meshopt_compression + KHR_mesh_quantization), mantendo nomes, morphs e texturas WebP.
# (gltfpack gera arquivo menor, mas tira o nome das malhas e cria nós-pai — por isso usamos gltf-transform)
set -e
cd "$(dirname "$0")"
mkdir -p saida
npx gltf-transform meshopt build/corpo_mh_bruto.glb saida/corpo_mh.glb --level high --quantization-volume scene \
  --quantize-normal 8 --quantize-position 14 --quantize-texcoord 12
cp build/pele_clara.webp build/pele_medio.webp build/pele_escura.webp build/pele_neutra_tingir.webp build/marcos.json saida/
ls -la saida
