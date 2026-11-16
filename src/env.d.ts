/// <reference types="astro/client" />

declare module 'astro' {
  interface AstroClientDirectives {
    /** Ativa a ilha quando o navegador está ocioso e sem rolagem (ver src/directives/calm.ts). */
    'client:calm'?: boolean;
  }
}

export {};
