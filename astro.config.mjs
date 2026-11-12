// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

/**
 * Domínio definitivo do site.
 * TODO: confirmar o domínio com a cliente antes de publicar
 * (usado em URLs canônicas, Open Graph e sitemap).
 * Pode ser sobrescrito na hospedagem com a variável SITE_URL.
 */
const SITE_URL = process.env.SITE_URL ?? 'https://www.leticiaorlandin.com.br';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // CSS embutido no HTML: sem requisição bloqueante antes da primeira pintura.
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  image: {
    responsiveStyles: false,
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'monthly',
    }),
  ],
});
