#!/usr/bin/env node
/**
 * Converte um vídeo para uso na web (MP4 H.264, sem áudio, início rápido)
 * e gera um poster. Requer ffmpeg instalado.
 *
 * Uso:
 *   npm run media:video -- <arquivo> [nome] [--max=1280] [--audio]
 *
 * Saída:
 *   public/media/<nome>.mp4
 *   src/assets/images/videos/<nome>-poster.jpg
 */
import { mkdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const [file, nameArg] = args.filter((a) => !a.startsWith('--'));
const max = Number(args.find((a) => a.startsWith('--max='))?.split('=')[1] ?? 1280);
const keepAudio = args.includes('--audio');

if (!file) {
  console.log('Uso: npm run media:video -- <arquivo> [nome] [--max=1280] [--audio]');
  process.exit(0);
}

const name = (nameArg ?? basename(file, extname(file)))
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'public/media');
const posterDir = join(root, 'src/assets/images/videos');
mkdirSync(outDir, { recursive: true });
mkdirSync(posterDir, { recursive: true });

const video = join(outDir, `${name}.mp4`);
const poster = join(posterDir, `${name}-poster.jpg`);

const scale = `scale='if(gt(iw,ih),min(${max},iw),-2)':'if(gt(iw,ih),-2,min(${max},ih))'`;
const r1 = spawnSync(
  'ffmpeg',
  [
    '-y', '-i', resolve(file), '-vf', scale,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    ...(keepAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
    video,
  ],
  { stdio: 'inherit' },
);
if (r1.status !== 0) {
  console.error('Falha na conversão. O ffmpeg está instalado?');
  process.exit(1);
}
spawnSync('ffmpeg', ['-y', '-ss', '0.5', '-i', video, '-frames:v', '1', '-q:v', '3', poster], { stdio: 'ignore' });

console.log(`\n✓ ${join('public/media', `${name}.mp4`)}`);
console.log(`✓ ${join('src/assets/images/videos', `${name}-poster.jpg`)}`);
