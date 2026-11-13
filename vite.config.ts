import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // vendors em chunks estáveis (melhor cache entre deploys)
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/](three|three-stdlib|@react-three|maath|troika|camera-controls|meshline|stats-gl|suspend-react|zustand|its-fine)[\\/]/.test(id)) return 'vendor-3d'
          if (/[\\/](gsap|@gsap|lenis)[\\/]/.test(id)) return 'vendor-gsap'
          if (/[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-motion'
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
