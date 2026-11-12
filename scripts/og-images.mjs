/**
 * Gera as imagens de compartilhamento (Open Graph, 1200×630) em public/og/.
 *
 * Uso: node scripts/og-images.mjs
 * Requer o Playwright com Chromium (npx playwright install chromium).
 * Rode novamente sempre que trocar as fotos em src/assets/images/site/.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolução CommonJS: encontra o Playwright local ou global (NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright');

const root = resolve(import.meta.dirname, '..');
const img = (name) => pathToFileURL(join(root, 'src/assets/images/site', name)).href;
const font = (file) =>
  pathToFileURL(join(root, 'node_modules/@fontsource-variable', file)).href;

const pages = [
  { out: 'og-default', kicker: 'Estética avançada · Bento Gonçalves/RS', title: 'Refinar, <em>não transformar.</em>', image: 'hero.jpg', pos: '58% 40%' },
  { out: 'toxina-botulinica', kicker: 'Estética facial', title: 'Toxina <em>botulínica</em>', image: 'toxina-botulinica.jpg', pos: '38% 30%' },
  { out: 'preenchimentos', kicker: 'Estética facial', title: '<em>Preenchimentos</em>', image: 'preenchimentos.jpg', pos: '58% 50%' },
  { out: 'avaliacao-e-mapeamento-facial', kicker: 'Estética facial · Studio Face', title: 'Avaliação e <em>mapeamento facial</em>', image: 'mapeamento-facial.jpg', pos: '45% 32%' },
  { out: 'protocolos-faciais', kicker: 'Estética facial', title: 'Protocolos faciais <em>personalizados</em>', image: 'protocolos-faciais.jpg', pos: '66% 40%' },
  { out: 'metodo-ser', kicker: 'Planejamento por etapas', title: 'Método <em>SER</em>', image: 'metodo-ser.jpg', pos: '50% 30%' },
  { out: 'remocao-de-tatuagem', kicker: 'Remoção de tatuagem', title: 'Remoção de <em>tatuagem</em>', image: 'remocao-de-tatuagem.jpg', pos: '50% 84%' },
  { out: 'tratamentos-capilares', kicker: 'Tratamentos capilares', title: 'Tratamentos <em>capilares</em>', image: 'tratamentos-capilares.jpg', pos: '50% 55%' },
];

const html = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:C;src:url(${font('cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2')});font-weight:300 700}
@font-face{font-family:C;font-style:italic;src:url(${font('cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2')});font-weight:300 700}
@font-face{font-family:M;src:url(${font('manrope/files/manrope-latin-wght-normal.woff2')});font-weight:200 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#FBF9F1;color:#2F3E3C;font-family:M;display:grid;grid-template-columns:1fr 470px;overflow:hidden;position:relative}
body:before{content:'';position:absolute;right:250px;top:-180px;width:620px;height:620px;border-radius:50%;background:radial-gradient(closest-side,rgba(199,231,236,.8),rgba(189,219,209,.3) 55%,transparent 72%)}
.l{position:relative;padding:64px 40px 56px 72px;display:flex;flex-direction:column;justify-content:space-between}
.k{font-size:15px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;display:flex;align-items:center;gap:14px}
.k:before{content:'';width:36px;height:1px;background:#2F3E3C;opacity:.6}
h1{font-family:C;font-weight:360;font-size:${p.title.length > 40 ? 82 : 98}px;line-height:.95;letter-spacing:-.03em;max-width:9.5em}
h1 em{font-style:italic;font-weight:330}
.f{display:flex;align-items:flex-end;justify-content:space-between}
.w{font-family:C;font-size:34px;font-weight:450;letter-spacing:-.01em;line-height:1}
.w small{display:block;font-family:M;font-size:11px;font-weight:600;letter-spacing:.42em;text-transform:uppercase;margin-top:8px}
.c{font-size:14px;color:#55635f}
.r{position:relative;padding:28px 28px 28px 0}
.r div{width:100%;height:100%;border-radius:26px;background:url(${img(p.image)}) ${p.pos}/cover no-repeat}
</style></head><body>
<div class="l"><p class="k">${p.kicker}</p><h1>${p.title}</h1>
<div class="f"><p class="w">Letícia Orlandin<small>Estética Avançada</small></p><p class="c">Bento Gonçalves · RS</p></div></div>
<div class="r"><div></div></div>
</body></html>`;

const outDir = join(root, 'public/og');
mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'og-'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const p of pages) {
  const file = join(tmp, `${p.out}.html`);
  writeFileSync(file, html(p));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(outDir, `${p.out}.jpg`), type: 'jpeg', quality: 86 });
  console.log('✓', p.out);
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
