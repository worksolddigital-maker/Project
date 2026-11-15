/**
 * Converte os casos de antes e depois em dados prontos para a galeria
 * (imagens otimizadas no build, em WebP, sem alterar o conteúdo).
 */
import { getImage } from 'astro:assets';
import type { ResultEntry } from '../components/react/ResultsGallery';
import type { ResultItem } from './resultados';

export async function buildResultEntries(list: ResultItem[]): Promise<ResultEntry[]> {
  return Promise.all(
    list
      .filter((r) => r.authorized === true)
      .map(async (r) => {
        const [b, a, bl, al] = await Promise.all([
          getImage({ src: r.before, width: Math.min(900, r.before.width), format: 'webp', quality: 84 }),
          getImage({ src: r.after, width: Math.min(900, r.after.width), format: 'webp', quality: 84 }),
          getImage({ src: r.before, width: Math.min(1800, r.before.width), format: 'webp', quality: 88 }),
          getImage({ src: r.after, width: Math.min(1800, r.after.width), format: 'webp', quality: 88 }),
        ]);
        return {
          id: r.id,
          alt: r.alt,
          treatment: r.treatment ?? null,
          note: r.note ?? null,
          before: { src: b.src, large: bl.src, width: r.before.width, height: r.before.height },
          after: { src: a.src, large: al.src, width: r.after.width, height: r.after.height },
        };
      }),
  );
}
