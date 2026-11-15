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

// Equivalente a client:visible — ativa cada ilha ao se aproximar da tela.
// <astro-island> usa display: contents (não tem caixa própria), então
// observamos os filhos, como faz o próprio Astro.
const islands = Array.from(document.querySelectorAll('astro-island'));
const done = new WeakSet<Element>();
if ('IntersectionObserver' in window) {
  const owner = new Map<Element, Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const island = owner.get(entry.target);
        if (!island || done.has(island)) continue;
        done.add(island);
        for (const child of Array.from(island.children)) io.unobserve(child);
        hydrate(island);
      }
    },
    { rootMargin: '300px 0px' },
  );
  for (const island of islands) {
    const children = Array.from(island.children);
    if (!children.length) {
      hydrate(island);
      continue;
    }
    for (const child of children) {
      owner.set(child, island);
      io.observe(child);
    }
  }
} else {
  islands.forEach(hydrate);
}
