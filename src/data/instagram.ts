/**
 * Mídias do Instagram exibidas no site.
 *
 * A lista é gerada automaticamente por `npm run media:import` a partir do
 * export oficial do Instagram (arquivo instagram.generated.ts). Revise a
 * seleção antes de publicar: remova o que não deve aparecer no site.
 */
import type { ImageMetadata } from 'astro';
import { generatedMedia } from './instagram.generated';

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

export const instagramMedia: InstagramMedia[] = generatedMedia.slice(
  0,
  INSTAGRAM_LIMIT,
);
