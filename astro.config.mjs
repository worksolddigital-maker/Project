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
    // Qualidade de compressão mais alta: pele e cabelo sem borrões.
    // (padrão do sharp: AVIF 50, WebP 80, JPEG 80)
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        avif: { quality: 68, effort: 5 },
        webp: { quality: 86, effort: 5 },
        jpeg: { quality: 86, mozjpeg: true },
      },
    },
  },
  integrations: [
    {
      // client:calm — hidratação fora dos gestos de rolagem (src/directives/calm.ts)
      name: 'lo-client-directives',
      hooks: {
        'astro:config:setup': ({ addClientDirective }) => {
          addClientDirective({ name: 'calm', entrypoint: './src/directives/calm.ts' });
        },
      },
    },
    react(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'monthly',
    }),
  ],
});
