#!/usr/bin/env node
/**
 * Gera a versão "HTML independente" do site em standalone/:
 * um arquivo .html por página, com estilos, scripts, fontes e imagens
 * embutidos — abre com dois cliques, sem servidor e sem internet
 * (exceto mapa e links externos).
 *
 * Uso:  npm run build && npm run standalone
 *
 * É uma versão de PRÉ-VISUALIZAÇÃO (arquivos grandes, sem imagens
 * responsivas). Para publicar, use a pasta dist/.
 */
import { rolldown } from 'rolldown';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const out = join(root, 'standalone');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('Rode "npm run build" antes.');
  process.exit(1);
}

// ---------------------------------------------------------------- 1) script
const bundle = await rolldown({
  input: join(root, 'scripts/standalone-entry.tsx'),
  platform: 'browser',
  transform: {
    jsx: 'react-jsx',
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.DEV': 'false',
      'import.meta.env.PROD': 'true',
    },
  },
  plugins: [
    {
      name: 'css-stub', // o CSS já está embutido no HTML gerado pelo Astro
      load(id) {
        if (id.endsWith('.css')) return { code: 'export default ""', moduleType: 'js' };
      },
    },
  ],
});
const { output } = await bundle.generate({ format: 'iife', minify: true, codeSplitting: false });
await bundle.close();
const script = output[0].code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ------------------------------------------------------------- 2) páginas
const procedures = readdirSync(join(dist, 'procedimentos'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(dist, 'procedimentos', d.name, 'index.html')))
  .map((d) => d.name);
const pages = [
  { src: 'index.html', file: 'index.html', path: '/' },
  { src: 'procedimentos/index.html', file: 'procedimentos.html', path: '/procedimentos/' },
  ...procedures.map((slug) => ({
    src: `procedimentos/${slug}/index.html`,
    file: `procedimento-${slug}.html`,
    path: `/procedimentos/${slug}/`,
  })),
];
const fileFor = new Map(pages.map((p) => [p.path, p.file]));

const MIME = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const dataCache = new Map();
function dataUri(publicPath) {
  if (dataCache.has(publicPath)) return dataCache.get(publicPath);
  const file = join(dist, publicPath.replace(/^\//, ''));
  if (!existsSync(file)) return publicPath;
  const uri = `data:${MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`;
  dataCache.set(publicPath, uri);
  return uri;
}

/** Escolhe uma única variante WebP (≤ 1000 px) para cada <picture>. */
function flattenPictures(html) {
  return html.replace(/<picture([^>]*)>([\s\S]*?)<\/picture>/g, (_, attrs, inner) => {
    const webp = inner.match(/<source[^>]*srcset="([^"]+)"[^>]*type="image\/webp"[^>]*>/);
    const img = inner.match(/<img[^>]*>/)?.[0] ?? '';
    const candidates = (webp?.[1] ?? img.match(/srcset="([^"]+)"/)?.[1] ?? '')
      .split(',')
      .map((s) => s.trim().split(/\s+/))
      .filter(([u]) => u)
      .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 }))
      .sort((a, b) => a.w - b.w);
    const pick = [...candidates].reverse().find((c) => c.w <= 1000) ?? candidates[0];
    const src = pick ? dataUri(pick.u) : img.match(/src="([^"]+)"/)?.[1];
    const newImg = img
      .replace(/\s(srcset|sizes)="[^"]*"/g, '')
      .replace(/\ssrc="[^"]*"/, ` src="${src}"`);
    return `<picture${attrs}>${newImg}</picture>`;
  });
}

function rewriteLinks(html, page) {
  return html.replace(/href="(\/(?!\/)[^"]*)"/g, (match, href) => {
    const [path, hash = ''] = href.split('#');
    const target = fileFor.get(path);
    if (!target) return match; // ícones e outros recursos são tratados abaixo
    if (target === page.file && hash) return `href="#${hash}"`;
    return `href="${target}${hash ? `#${hash}` : ''}"`;
  });
}

mkdirSync(out, { recursive: true });
const report = [];
for (const page of pages) {
  let html = readFileSync(join(dist, page.src), 'utf8');

  // Scripts do Astro (módulos externos e runtime das ilhas) saem; o pacote único entra.
  html = html
    .replace(/<script type="module" src="[^"]*"><\/script>/g, '')
    .replace(/<script>([\s\S]*?)<\/script>/g, (m, code) =>
      /astro-island|self\.Astro|Astro\|\|/.test(code) ? '' : m,
    )
    .replace(/<link rel="(preload|manifest|sitemap|apple-touch-icon)"[^>]*>/g, '')
    .replace(/<link rel="icon" href="\/favicon-32\.png"[^>]*>/g, '')
    .replace(/href="\/favicon\.svg"/, `href="${dataUri('/favicon.svg')}"`);

  // Fontes: apenas o subconjunto latino (cobre o português).
  html = html.replace(/@font-face\{[^}]*\}/g, (block) =>
    /cyrillic|vietnamese|greek|latin-ext/.test(block) ? '' : block,
  );

  // As ilhas são ativadas pelo pacote único: as URLs dos módulos saem.
  html = html.replace(/\s(component-url|renderer-url|before-hydration-url)="[^"]*"/g, '');

  html = flattenPictures(html);
  html = rewriteLinks(html, page);
  html = html.replace(/\/_astro\/[A-Za-z0-9._-]+\.(?:webp|avif|jpe?g|png|svg|woff2)/g, (p) => dataUri(p));

  // Função de substituição: o JS minificado contém "$`" e "$'", que em uma
  // string de substituição repetiriam trechos do documento.
  html = html.replace('</body>', () => `<script>${script}</script></body>`);
  const target = join(out, page.file);
  writeFileSync(target, html);
  const leftovers = (html.match(/["(]\/_astro\//g) ?? []).length;
  report.push(`${page.file.padEnd(48)} ${(statSync(target).size / 1048576).toFixed(1)} MB${leftovers ? `  ⚠ ${leftovers} refs /_astro` : ''}`);
}

console.log(report.join('\n'));
console.log(`\n✓ ${pages.length} páginas em standalone/ — abra standalone/index.html`);
