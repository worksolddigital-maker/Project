// Renderiza a cena quadro a quadro no Chromium headless (WebGL via SwiftShader).
// Uso: node tools/render.js frames <fps> <inicio> <fim> <pastaSaida>
//      node tools/render.js stills <pastaSaida> t1 t2 ...
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.css': 'text/css' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/scene/index.html${process.env.QS || ''}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(url);
  await page.evaluate(() => window.__ready);
  const stage = await page.$('#stage');
  const shot = async (t, file) => {
    await page.evaluate(t => window.renderFrame(t), t);
    await stage.screenshot({ path: file, type: 'png' });
  };
  if (mode === 'stills') {
    const [out, ...ts] = args; fs.mkdirSync(out, { recursive: true });
    for (const t of ts.map(Number)) { const t0 = Date.now(); await shot(t, path.join(out, `still_${t.toFixed(2)}.png`)); console.log('still', t, Date.now() - t0, 'ms'); }
  } else {
    const fps = Number(args[0]), a = Number(args[1]), b = Number(args[2]), out = args[3];
    fs.mkdirSync(out, { recursive: true });
    const t0 = Date.now();
    for (let f = a; f < b; f++) {
      await shot(f / fps, path.join(out, `f_${String(f).padStart(5, '0')}.png`));
      if ((f - a) % 50 === 0) console.log(`frame ${f}/${b} ${((Date.now() - t0) / (f - a + 1)).toFixed(0)} ms/frame`);
    }
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
