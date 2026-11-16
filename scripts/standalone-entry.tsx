/**
 * Ponto de entrada da versão "HTML independente" (npm run standalone).
 * Reúne a camada de movimento e as ilhas React num único script, sem
 * depender dos arquivos em /_astro. Usado apenas para pré-visualização.
 */
import '../src/scripts/app';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { hydrateRoot } from 'react-dom/client';
import FaqAccordion from '../src/components/react/FaqAccordion';
import ResultsGallery from '../src/components/react/ResultsGallery';
import TestimonialsCarousel from '../src/components/react/TestimonialsCarousel';
import WhatsAppForm from '../src/components/react/WhatsAppForm';

const components: Record<string, ComponentType<any>> = {
  FaqAccordion,
  ResultsGallery,
  TestimonialsCarousel,
  WhatsAppForm,
};

// Mesmo formato de serialização de props usado pelas ilhas do Astro.
type Tuple = [number, unknown];
const reviveArray = (raw: Tuple[]): unknown[] => raw.map(reviveTuple);
const reviveObject = (raw: unknown): unknown => {
  if (typeof raw !== 'object' || raw === null) return raw;
  return Object.fromEntries(Object.entries(raw as Record<string, Tuple>).map(([k, v]) => [k, reviveTuple(v)]));
};
const propTypes: Record<number, (v: any) => unknown> = {
  0: (v) => reviveObject(v),
  1: (v) => reviveArray(v),
  2: (v) => new RegExp(v),
  3: (v) => new Date(v),
  4: (v) => new Map(reviveArray(v) as [unknown, unknown][]),
  5: (v) => new Set(reviveArray(v)),
  6: (v) => BigInt(v),
  7: (v) => new URL(v),
  8: (v) => new Uint8Array(v),
  9: (v) => new Uint16Array(v),
  10: (v) => new Uint32Array(v),
  11: (v) => Infinity * v,
};
function reviveTuple(raw: Tuple): unknown {
  const [type, value] = raw;
  return type in propTypes ? propTypes[type](value) : undefined;
}

function hydrate(island: Element) {
  const opts = JSON.parse(island.getAttribute('opts') || '{}') as { name?: string };
  const Component = opts.name ? components[opts.name] : undefined;
  if (!Component) return;
  const props = reviveObject(JSON.parse(island.getAttribute('props') || '{}')) as Record<string, unknown>;
  hydrateRoot(island, createElement(Component, props), {
    identifierPrefix: island.getAttribute('prefix') ?? undefined,
  });
}

// Equivalente a client:calm (src/directives/calm.ts): ativa as ilhas depois
// da abertura, com o navegador ocioso e sem rolagem — uma por vez.
const islands = Array.from(document.querySelectorAll('astro-island'));
const done = new WeakSet<Element>();
const hydrateOnce = (island: Element) => {
  if (done.has(island)) return;
  done.add(island);
  hydrate(island);
};
const idle = (cb: () => void) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 2000 }) : window.setTimeout(cb, 50);

let timer = 0;
const queue = () => {
  const next = islands.find((el) => !done.has(el));
  if (!next) {
    window.removeEventListener('scroll', onScroll);
    return;
  }
  idle(() => {
    hydrateOnce(next);
    schedule(120);
  });
};
const schedule = (delay: number) => {
  window.clearTimeout(timer);
  timer = window.setTimeout(queue, delay);
};
const onScroll = () => schedule(300);

for (const island of islands) {
  const now = () => hydrateOnce(island);
  island.addEventListener('pointerover', now, { once: true });
  island.addEventListener('focusin', now, { once: true });
  island.addEventListener('touchstart', now, { once: true, passive: true });
}
const start = () => {
  window.addEventListener('scroll', onScroll, { passive: true });
  schedule(500);
};
if ((window as Window & { __loReady?: boolean }).__loReady) start();
else {
  window.addEventListener('lo:ready', start, { once: true });
  window.setTimeout(start, 6000);
}
