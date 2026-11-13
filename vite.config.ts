import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Vendors em chunks estáveis (melhor cache entre deploys). */
function manualChunks(id: string) {
  if (!id.includes('node_modules')) return undefined
  if (/[\\/](three|three-stdlib|@react-three|maath|troika|camera-controls|meshline|stats-gl|suspend-react|zustand|its-fine)[\\/]/.test(id)) return 'vendor-3d'
  if (/[\\/](gsap|@gsap|lenis)[\\/]/.test(id)) return 'vendor-gsap'
  if (/[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-motion'
  if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
  return undefined
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `vite build --mode standalone`: um único arquivo HTML que abre direto do disco
  // (rotas por hash, JS/CSS embutidos — ver scripts/inline-standalone.mjs)
  const standalone = mode === 'standalone'
  return {
    base: standalone ? './' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: standalone ? 4000 : 1200,
      outDir: standalone ? 'dist-standalone' : 'dist',
      copyPublicDir: !standalone,
      rollupOptions: {
        output: standalone ? { inlineDynamicImports: true } : { manualChunks },
      },
    },
  }
})
