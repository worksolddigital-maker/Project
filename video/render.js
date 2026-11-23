// Renderiza a composição quadro a quadro (seek determinístico) e monta o MP4 com a narração.
// Uso:
//   node render.js preview 3.4 12.9 20.5     -> PNGs de conferência em out/preview/
//   node render.js full [fps] [workers]      -> todos os quadros + encode (master e entrega)
//   node render.js frames <de> <até> [fps]   -> re-renderiza só um intervalo de quadros
//   node render.js encode [fps]              -> só codifica os quadros existentes
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
const FDIR = path.join(OUT, 'frames');
const WAV = path.join(ROOT, 'audio', 'narracao-90s.wav');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.json': 'application/json' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const errs = await page.evaluate(() => window.__errors);
  if (errs.length) throw new Error('Erros na página:\n' + errs.join('\n'));
  return page;
}

// avança só a timeline (sem WebGL) de forma monotônica até t, como no render contínuo;
// o orbe é recalculado a partir do estado da timeline em cada quadro
const warmup = (page, t) => page.evaluate((t) => { for (let x = 0; x < t; x += 0.25) window.__advance(x); }, t);
const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });

async function renderFrames(port, from, to, fps, workers) {
  fs.mkdirSync(FDIR, { recursive: true });
  const n = to - from;
  const chunk = Math.ceil(n / workers);
  const t0 = Date.now();
  let done = 0;
  // cada worker tem o próprio navegador (processo de GPU isolado)
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = from + w * chunk, b = Math.min(to, a + chunk);
    if (a >= b) return;
    let browser = await launch();
    let page = null;
    const fresh = async (f) => {
      if (page) await page.close().catch(() => {});
      page = await openPage(browser, port);
      await warmup(page, f / fps);
    };
    await fresh(a);
    for (let f = a; f < b; f++) {
      for (let attempt = 1; ; attempt++) {
        try {
          await page.evaluate((t) => window.__seek(t), f / fps);
          await page.screenshot({ path: path.join(FDIR, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95, timeout: 90000 });
          break;
        } catch (e) {
          if (attempt >= 3) throw e;
          console.error(`worker ${w}: quadro ${f} falhou (${e.name}), tentando de novo…`);
          await browser.close().catch(() => {});
          browser = await launch(); page = null;
          await fresh(f);
        }
      }
      if (++done % 300 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${n} quadros · ${el.toFixed(0)}s · ETA ${((n - done) * el / done).toFixed(0)}s`);
      }
    }
    await browser.close();
  }));
  console.log(`quadros prontos em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg falhou');
}

function encode(fps) {
  const input = ['-framerate', String(fps), '-i', path.join(FDIR, 'f%05d.jpg')];
  const color = ['-pix_fmt', 'yuv420p', '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
  const audio = ['-i', WAV, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest'];
  console.log('codificando master (CRF 18)…');
  ffmpeg([...input, ...audio.slice(0, 2), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', ...color, ...audio.slice(2),
    path.join(OUT, 'worksold-convite-master.mp4')]);
  // versão de entrega (~70 MB) em duas passadas: cabe no GitHub e em mensageiros
  console.log('codificando versão de entrega (2 passadas, 6 Mbps)…');
  const log = path.join(OUT, 'x264-2pass');
  const v = ['-c:v', 'libx264', '-preset', 'slow', '-b:v', '6M', '-maxrate', '9M', '-bufsize', '12M', '-x264-params', 'aq-mode=3', ...color];
  ffmpeg([...input, ...v, '-pass', '1', '-passlogfile', log, '-an', '-f', 'null', '/dev/null']);
  ffmpeg([...input, ...audio.slice(0, 2), ...v, '-pass', '2', '-passlogfile', log, ...audio.slice(2), path.join(OUT, 'worksold-convite.mp4')]);
  for (const f of fs.readdirSync(OUT)) if (f.startsWith('x264-2pass')) fs.rmSync(path.join(OUT, f));
  console.log(path.join(OUT, 'worksold-convite.mp4'));
}

async function main() {
  const [mode = 'preview', ...args] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  if (mode === 'encode') return encode(parseInt(args[0] || '60', 10));

  const srv = await serve();
  const port = srv.address().port;
  const browser = await launch();
  try {
    if (mode === 'preview') {
      const dir = path.join(OUT, 'preview');
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, port);
      for (const a of args) {
        const t = parseFloat(a);
        await warmup(page, t);
        await page.evaluate((t) => window.__seek(t), t);
        const f = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
        await page.screenshot({ path: f });
        console.log(f);
      }
    } else if (mode === 'frames') {
      const fps = parseInt(args[2] || '60', 10);
      await renderFrames(port, parseInt(args[0], 10), parseInt(args[1], 10), fps, 2);
    } else if (mode === 'full') {
      const fps = parseInt(args[0] || '60', 10);
      const workers = parseInt(args[1] || '4', 10);
      const page = await openPage(browser, port);
      const total = await page.evaluate(() => window.__duration);
      await page.close();
      fs.rmSync(FDIR, { recursive: true, force: true });
      await renderFrames(port, 0, Math.round(total * fps), fps, workers);
      await browser.close();
      encode(fps);
    } else {
      throw new Error(`modo desconhecido: ${mode}`);
    }
  } finally {
    await browser.close().catch(() => {});
    srv.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
