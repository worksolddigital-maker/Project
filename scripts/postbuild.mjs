// Copia index.html para 404.html para que hosts estáticos (ex.: GitHub Pages)
// sirvam o SPA em qualquer rota, mantendo o refresh funcionando.
import { copyFileSync, existsSync } from 'node:fs'

if (existsSync('dist/index.html')) {
  copyFileSync('dist/index.html', 'dist/404.html')
  console.log('✓ dist/404.html criado (fallback de rotas SPA)')
}
