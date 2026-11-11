import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativo: o e-book funciona em qualquer subpasta (GitHub Pages, Netlify, pasta local servida).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
})
