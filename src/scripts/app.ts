/**
 * Orquestração da experiência.
 *
 *  GSAP + ScrollTrigger + SplitText → sequências cinematográficas e rolagem
 *  Lenis                            → rolagem suave (desativada com movimento reduzido)
 *  Motion (React)                   → interações internas das ilhas React
 *
 * Regra: nenhum elemento é controlado por GSAP e Motion ao mesmo tempo.
 * As ilhas React se comunicam por eventos (lo:lock, lo:refresh).
 *
 * Desempenho: primeiro o essencial (abertura, navegação, transições);
 * as coreografias das seções abaixo da dobra são criadas em seguida, em
 * blocos pequenos e no tempo ocioso do navegador (sem tarefas longas).
 */
import { gsap, ScrollTrigger } from './lib/gsap';
import { debounce, fontsReady, mq, prefersReduced, root } from './lib/env';
import { initLenis, lockScroll } from './lib/scroll';
import { playIntro, skipIntro } from './modules/intro';
import { initTransitions, scrollToInitialHash } from './modules/transitions';
import { initHeader } from './modules/header';
import { initMenu } from './modules/menu';
import { initCursor, initMagnetic, initTilt } from './modules/pointer';
import { initReveals } from './modules/reveals';
import {
  initFooter,
  initHeroScroll,
  initManifesto,
  initMappingLines,
  initMarquee,
  initMetodo,
  initProcedureNav,
  initProcess,
} from './modules/sections';
import { initFloatingWhatsApp, initInViewVideos, initMap } from './modules/ui';

const animate = !prefersReduced();

/** Cede a vez ao navegador entre blocos de trabalho. */
const yieldToMain = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));
const whenIdle = () =>
  new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 900 });
    else window.setTimeout(resolve, 120);
  });

// Se a pessoa já começou a rolar, não a reposicionamos na âncora.
let userScrolled = false;
const markScrolled = () => (userScrolled = true);
['wheel', 'touchmove', 'keydown'].forEach((type) =>
  window.addEventListener(type, markScrolled, { once: true, passive: true }),
);

function initPointer() {
  gsap.matchMedia().add(mq.fine, () => {
    const cleanCursor = initCursor();
    const cleanMagnetic = initMagnetic();
    const cleanTilt = initTilt();
    return () => {
      cleanCursor();
      cleanMagnetic();
      cleanTilt();
    };
  });
}

async function boot() {
  // 1) Essencial — antes da primeira revelação.
  if (animate) {
    root.classList.add('motion');
    initLenis();
  }
  initTransitions({ animate });
  initMenu({ animate });
  window.addEventListener('lo:lock', (event) => lockScroll(Boolean((event as CustomEvent<boolean>).detail)));
  window.addEventListener('lo:refresh', debounce(() => ScrollTrigger.refresh(), 180));

  await fontsReady();

  // A seção fixada vem antes de qualquer gatilho abaixo dela.
  if (animate) initProcess();
  initHeader();
  scrollToInitialHash();
  if (animate) playIntro();
  else skipIntro();

  // 2) Coreografias e utilidades — em blocos, no tempo ocioso.
  await whenIdle();
  const deferred: (() => unknown)[] = [
    initProcedureNav,
    initFloatingWhatsApp,
    initMap,
    () => initInViewVideos({ animate }),
  ];
  if (animate) {
    deferred.push(
      initHeroScroll,
      initReveals,
      initManifesto,
      initMappingLines,
      initMetodo,
      initMarquee,
      initFooter,
      initPointer,
    );
  }
  for (const task of deferred) {
    await task();
    await yieldToMain();
  }

  // 3) Posições finais: ordena pela posição na página e recalcula.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  if (!userScrolled) scrollToInitialHash();
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

boot();
