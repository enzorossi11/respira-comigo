import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// base './' permite publicar no GitHub Pages em qualquer subpasta
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // permite importar os dados tratados em ../data/processed
    fs: { allow: ['..'] },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
  },
})
