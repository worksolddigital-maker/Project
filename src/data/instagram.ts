/**
 * Mídias do Instagram exibidas na faixa "@leticiaorlandin.estetica".
 *
 * `curatedMedia`: publicações enviadas pela profissional e escolhidas à mão.
 * `generatedMedia`: o que for importado por `npm run media:import` a partir
 * do export oficial do Instagram (arquivo instagram.generated.ts).
 */
import type { ImageMetadata } from 'astro';
import { generatedMedia } from './instagram.generated';
import sobreMim from '../assets/images/instagram/sobre-mim.jpg';
import retrato from '../assets/images/site/sobre-retrato.jpg';
import kit from '../assets/images/linha/kit.jpg';
import luce from '../assets/images/linha/luce.jpg';
import glossUso from '../assets/images/linha/gloss-uso.jpg';
import aurora from '../assets/images/linha/aurora.jpg';

export interface InstagramMedia {
  id: string;
  type: 'image' | 'video';
  /** Imagem (ou poster do vídeo), otimizada no build. */
  image: ImageMetadata;
  /** Caminho público do vídeo (em /public), quando type === 'video'. */
  video?: string;
  alt: string;
  caption?: string;
  date?: string;
}

/** Quantidade máxima exibida na faixa do Instagram. */
export const INSTAGRAM_LIMIT = 10;

export const curatedMedia: InstagramMedia[] = [
  {
    id: 'sobre-mim',
    type: 'image',
    image: sobreMim,
    alt: 'Publicação “Sobre mim”: Letícia Orlandin sentada em poltrona clara, de camisa branca e jeans',
  },
  {
    id: 'consultorio',
    type: 'image',
    image: retrato,
    alt: 'Letícia Orlandin no consultório, diante da frase “A sua essência, em sua melhor forma.”',
  },
  {
    id: 'aurora',
    type: 'image',
    image: aurora,
    alt: 'Aurora Sérum Vitamina C da linha Letícia Orlandin',
    caption: 'Luz, viço e cuidado em um só ritual.',
  },
  {
    id: 'gloss',
    type: 'image',
    image: glossUso,
    alt: 'Aplicação do gloss labial Letícia Orlandin',
    caption: 'Lábios nutridos, protegidos e visivelmente renovados.',
  },
  {
    id: 'luce',
    type: 'image',
    image: luce,
    alt: 'Aplicação do Sérum Regenerador Luce com conta-gotas',
    caption: 'O Sérum Regenerador LUCE foi formulado para devolver a luz própria do rosto.',
  },
  {
    id: 'kit',
    type: 'image',
    image: kit,
    alt: 'Nécessaire com os produtos Essenza, Luce, Elevare e o gloss Letícia Orlandin',
  },
];

export const instagramMedia: InstagramMedia[] = [...curatedMedia, ...generatedMedia].slice(
  0,
  INSTAGRAM_LIMIT,
);
