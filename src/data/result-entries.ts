/**
 * Converte os casos de antes e depois em dados prontos para a galeria
 * (imagens otimizadas no build, em WebP, sem alterar o conteúdo).
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { ResultEntry, ResultImage } from '../components/react/ResultsGallery';
import type { ResultItem } from './resultados';
import { getProcedure } from './procedimentos';

async function variants(src: ImageMetadata): Promise<ResultImage> {
  const [card, large] = await Promise.all([
    getImage({ src, width: Math.min(900, src.width), format: 'webp', quality: 84 }),
    getImage({ src, width: Math.min(1800, src.width), format: 'webp', quality: 88 }),
  ]);
  return { src: card.src, large: large.src, width: src.width, height: src.height };
}

export async function buildResultEntries(list: ResultItem[]): Promise<ResultEntry[]> {
  return Promise.all(
    list
      .filter((r) => r.authorized === true && r.views.length > 0)
      .map(async (r) => {
        const procedure = r.procedure ? getProcedure(r.procedure) : undefined;
        return {
          id: r.id,
          treatment: r.treatment ?? null,
          note: r.note ?? null,
          quote: r.quote ?? null,
          story: r.story ?? [],
          link: procedure
            ? {
                href: `/procedimentos/${procedure.slug}/`,
                label:
                  procedure.category === 'metodo'
                    ? `Conhecer o ${procedure.name}`
                    : `Saiba mais sobre ${procedure.name.toLowerCase()}`,
              }
            : null,
          views: await Promise.all(
            r.views.map(async (v) => ({
              id: v.id,
              label: v.label,
              alt: v.alt,
              focus: v.focus ?? null,
              before: await variants(v.before),
              after: await variants(v.after),
            })),
          ),
        };
      }),
  );
}
