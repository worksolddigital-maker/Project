// Gera dist-standalone/banco-inter.html: JS, CSS e favicon embutidos em um único arquivo,
// para visualizar o projeto com duplo clique, sem servidor.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist-standalone'
let html = readFileSync(join(dir, 'index.html'), 'utf8')

html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/g, (_, file) => {
  // impede que um "</script" dentro do código feche a tag antes da hora
  const js = readFileSync(join(dir, file), 'utf8').replace(/<\/script/gi, '<\\/script')
  return `<script type="module">${js}</script>`
})
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/g, (_, file) => {
  return `<style>${readFileSync(join(dir, file), 'utf8')}</style>`
})
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '')
const favicon = 'public/favicon.svg'
if (existsSync(favicon)) {
  const data = Buffer.from(readFileSync(favicon)).toString('base64')
  html = html.replace(/href="\.\/favicon\.svg"/, `href="data:image/svg+xml;base64,${data}"`)
}

const leftovers = html.match(/(src|href)="\.\/assets\/[^"]+"/g)
if (leftovers) {
  console.error('Referências não embutidas:', leftovers)
  process.exit(1)
}
const out = join(dir, 'banco-inter.html')
writeFileSync(out, html)
console.log(`✓ ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`)
