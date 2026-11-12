#!/usr/bin/env node
/**
 * Importa fotos e vídeos do Instagram (export oficial) para o site.
 *
 * Como obter o export (feito pela própria profissional, na conta dela):
 *   Instagram → Configurações → Central de Contas → Suas informações e
 *   permissões → Baixar suas informações → selecionar a conta →
 *   "Algumas das suas informações" → Conteúdo → Formato JSON, qualidade ALTA.
 *
 * Uso:
 *   npm run media:import -- caminho/para/instagram-export.zip
 *   npm run media:import -- caminho/para/pasta-com-fotos-e-videos
 *
 * Opções:
 *   --stories    inclui stories (por padrão só posts e reels)
 *   --limit=N    importa no máximo N itens mais recentes (padrão: 40)
 *
 * Resultado:
 *   src/assets/images/instagram/   imagens otimizadas (e posters dos vídeos)
 *   public/media/instagram/        vídeos convertidos para web (MP4 H.264)
 *   src/data/instagram.generated.ts lista usada pela faixa do Instagram
 *   media-raw/curadoria.html       folha de curadoria para escolher as fotos
 *                                  de cada seção (hero, sobre, procedimentos)
 *
 * Nada aqui edita fotos de antes e depois: essas entram manualmente,
 * sem tratamento, conforme src/data/resultados.ts.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const withStories = args.includes('--stories');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 40);

if (!input) {
  console.error('Informe o arquivo .zip do export ou uma pasta. Ex.: npm run media:import -- ~/Downloads/instagram.zip');
  process.exit(1);
}

const IMG = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VID = new Set(['.mp4', '.mov', '.m4v']);

const paths = {
  raw: join(root, 'media-raw'),
  extract: join(root, 'media-raw/instagram-export'),
  images: join(root, 'src/assets/images/instagram'),
  videos: join(root, 'public/media/instagram'),
  data: join(root, 'src/data/instagram.generated.ts'),
  sheet: join(root, 'media-raw/curadoria.html'),
};

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'pipe' });
  return r.status === 0;
}

/** Export do Instagram codifica UTF-8 como latin-1 ("Ã©" em vez de "é"). */
function fixEncoding(text = '') {
  try {
    const fixed = Buffer.from(text, 'latin1').toString('utf8');
    return fixed.includes('�') ? text : fixed;
  } catch {
    return text;
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Varre os JSON do export e associa cada mídia à legenda e à data. */
function readMetadata(dir) {
  const meta = new Map();
  const visit = (node, inherited = {}) => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, inherited));
    if (!node || typeof node !== 'object') return;
    // Legenda vazia no item herda a do post (carrosséis guardam no pai).
    const ctx = {
      title: node.title || inherited.title,
      ts: node.creation_timestamp ?? inherited.ts,
    };
    if (typeof node.uri === 'string' && /\.(jpe?g|png|webp|mp4|mov|m4v)$/i.test(node.uri)) {
      meta.set(basename(node.uri), {
        caption: fixEncoding(node.title || ctx.title || ''),
        ts: node.creation_timestamp ?? ctx.ts ?? null,
        uri: node.uri,
      });
    }
    for (const value of Object.values(node)) visit(value, ctx);
  };
  for (const file of walk(dir).filter((f) => f.endsWith('.json'))) {
    try {
      visit(JSON.parse(readFileSync(file, 'utf8')));
    } catch {
      /* JSON irrelevante */
    }
  }
  return meta;
}

function cleanCaption(caption) {
  return caption
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/@[\w.]+/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function altFrom(caption, date, type) {
  const text = cleanCaption(caption).split(/(?<=[.!?])\s/)[0]?.slice(0, 120) ?? '';
  const base = type === 'video' ? 'Vídeo do Instagram de Letícia Orlandin' : 'Publicação do Instagram de Letícia Orlandin';
  return text ? `${base}: ${text}` : `${base}${date ? ` (${date})` : ''}`;
}

// 1) Origem: zip → extrai; pasta → usa direto
let source = resolve(input);
if (!existsSync(source)) {
  console.error('Caminho não encontrado:', source);
  process.exit(1);
}
if (source.toLowerCase().endsWith('.zip')) {
  rmSync(paths.extract, { recursive: true, force: true });
  mkdirSync(paths.extract, { recursive: true });
  console.log('Extraindo', basename(source), '…');
  const ok = run('unzip', ['-q', '-o', source, '-d', paths.extract]) || run('tar', ['-xf', source, '-C', paths.extract]);
  if (!ok) {
    console.error('Não foi possível extrair o .zip. Extraia manualmente e informe a pasta.');
    process.exit(1);
  }
  source = paths.extract;
}

const hasFfmpeg = run('ffmpeg', ['-version']);
const meta = readMetadata(source);

// 2) Seleção dos arquivos
let files = walk(source).filter((f) => {
  const ext = extname(f).toLowerCase();
  if (!IMG.has(ext) && !VID.has(ext)) return false;
  const rel = relative(source, f).toLowerCase();
  if (!withStories && rel.includes('stories')) return false;
  if (rel.includes('profile')) return false; // foto de perfil
  return true;
});

files = files
  .map((f) => {
    const m = meta.get(basename(f));
    const ts = m?.ts ?? Math.floor(statSync(f).mtimeMs / 1000);
    return { file: f, ts, caption: m?.caption ?? '', type: VID.has(extname(f).toLowerCase()) ? 'video' : 'image' };
  })
  .sort((a, b) => b.ts - a.ts)
  .slice(0, limit);

if (!files.length) {
  console.error('Nenhuma foto ou vídeo encontrado.');
  process.exit(1);
}

mkdirSync(paths.images, { recursive: true });
mkdirSync(paths.videos, { recursive: true });

// 3) Processamento
const entries = [];
const counter = new Map();
for (const item of files) {
  const d = new Date(item.ts * 1000);
  const day = d.toISOString().slice(0, 10);
  const n = (counter.get(day) ?? 0) + 1;
  counter.set(day, n);
  const id = `ig-${day.replaceAll('-', '')}-${String(n).padStart(2, '0')}`;

  if (item.type === 'image') {
    const out = join(paths.images, `${id}.jpg`);
    await sharp(item.file)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(out);
    entries.push({ id, type: 'image', image: `${id}.jpg`, caption: item.caption, date: day, src: item.file });
    console.log('✓ imagem', id);
  } else {
    if (!hasFfmpeg) {
      console.warn('⚠ ffmpeg não encontrado — vídeo ignorado:', basename(item.file));
      continue;
    }
    const video = join(paths.videos, `${id}.mp4`);
    const poster = join(paths.images, `${id}-poster.jpg`);
    const okVideo = run('ffmpeg', [
      '-y', '-i', item.file,
      '-vf', "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-an', video,
    ]);
    const okPoster = run('ffmpeg', ['-y', '-ss', '0.8', '-i', item.file, '-frames:v', '1', '-q:v', '3', poster]);
    if (!okVideo || !okPoster) {
      console.warn('⚠ falha ao converter:', basename(item.file));
      continue;
    }
    entries.push({ id, type: 'video', image: `${id}-poster.jpg`, video: `/media/instagram/${id}.mp4`, caption: item.caption, date: day, src: item.file });
    console.log('✓ vídeo', id);
  }
}

// 4) Lista para o site
const ident = (id) => id.replace(/[^a-zA-Z0-9]/g, '_');
const lines = [
  '// Arquivo gerado por scripts/media-import.mjs — revise antes de publicar.',
  '// Remova as linhas das mídias que não devem aparecer no site.',
  "import type { InstagramMedia } from './instagram';",
  ...entries.map((e) => `import ${ident(e.id)} from '../assets/images/instagram/${e.image}';`),
  '',
  'export const generatedMedia: InstagramMedia[] = [',
  ...entries.map((e) =>
    `  { id: ${JSON.stringify(e.id)}, type: ${JSON.stringify(e.type)}, image: ${ident(e.id)},${e.video ? ` video: ${JSON.stringify(e.video)},` : ''} alt: ${JSON.stringify(altFrom(e.caption, e.date, e.type))}, caption: ${JSON.stringify(cleanCaption(e.caption).slice(0, 280))}, date: ${JSON.stringify(e.date)} },`,
  ),
  '];',
  '',
];
writeFileSync(paths.data, lines.join('\n'));

// 5) Folha de curadoria
mkdirSync(paths.raw, { recursive: true });
const cards = entries
  .map((e) => {
    const thumb = relative(paths.raw, join(paths.images, e.image)).replaceAll('\\', '/');
    return `<figure><img src="${thumb}" loading="lazy"><figcaption><b>${e.id}</b> · ${e.type === 'video' ? 'vídeo' : 'foto'} · ${e.date}<br><small>${cleanCaption(e.caption).slice(0, 220).replace(/</g, '&lt;')}</small></figcaption></figure>`;
  })
  .join('\n');
writeFileSync(
  paths.sheet,
  `<!doctype html><meta charset="utf-8"><title>Curadoria de mídias</title><style>body{font:14px system-ui;margin:24px;background:#fbf9f1;color:#2f3e3c}h1{font-weight:500}div{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px -12px #0004}img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}figcaption{padding:10px 12px;line-height:1.4}small{color:#55635f}</style><h1>Curadoria — ${entries.length} mídias importadas</h1><p>Escolha as imagens de cada seção e copie com <code>npm run media:slot -- &lt;slot&gt; &lt;arquivo&gt;</code> (veja MIDIAS.md).</p><div>${cards}</div>`,
);

console.log(`\n${entries.length} mídias importadas.`);
console.log('• Lista do site:', relative(root, paths.data));
console.log('• Curadoria:', relative(root, paths.sheet));
if (!hasFfmpeg) console.log('• Instale o ffmpeg para importar vídeos.');
