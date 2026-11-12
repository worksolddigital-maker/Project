/**
 * Transições cinematográficas entre páginas internas (MPA).
 * A cortina cobre a tela, a navegação acontece e a nova página a recolhe.
 */
import { gsap } from '../lib/gsap';
import { qs, root } from '../lib/env';
import { scrollToTarget } from '../lib/scroll';

function isInternalPageLink(a: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download') || a.dataset.noTransition !== undefined) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  if (!/^https?:$/.test(url.protocol)) return false;
  return url;
}

function leave(url: URL) {
  const curtain = qs('[data-curtain]');
  if (!curtain) {
    location.href = url.href;
    return;
  }
  try {
    sessionStorage.setItem('lo:transition', '1');
  } catch {
    /* ignora */
  }
  const panel = qs('[data-curtain-panel]', curtain);
  const mark = qs('[data-curtain-mark]', curtain);
  root.classList.add('cursor-hidden');
  gsap.set(curtain, { visibility: 'visible' });
  gsap
    .timeline({ defaults: { ease: 'loInOut' }, onComplete: () => location.assign(url.href) })
    .fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85 })
    .fromTo(mark, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'lo' }, 0.45);
}

export function initTransitions({ animate }: { animate: boolean }) {
  document.addEventListener('click', (event) => {
    const a = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const url = isInternalPageLink(a, event);
    if (!url) return;

    const samePage = url.pathname === location.pathname && url.search === location.search;

    // Âncora na mesma página → rolagem suave com deslocamento correto.
    if (samePage && url.hash) {
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      const go = () => {
        scrollToTarget(target);
        if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      };
      if (root.classList.contains('menu-open')) {
        window.dispatchEvent(new CustomEvent('lo:menu-close', { detail: { then: go } }));
      } else {
        go();
      }
      history.replaceState(null, '', url.hash);
      return;
    }
    if (samePage) return;

    if (!animate) return; // movimento reduzido: navegação nativa
    event.preventDefault();
    leave(url);
  });

  // Voltar pelo histórico (bfcache): a página volta com a cortina recolhida.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const curtain = qs('[data-curtain]');
    if (curtain) {
      gsap.set(curtain, { visibility: 'hidden' });
      gsap.set(qs('[data-curtain-panel]', curtain), { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(qs('[data-curtain-mark]', curtain), { autoAlpha: 0 });
    }
    try {
      sessionStorage.removeItem('lo:transition');
    } catch {
      /* ignora */
    }
    root.classList.remove('is-entering', 'is-loading', 'cursor-hidden');
  });
}

/** Ao chegar com #âncora (ex.: /#procedimentos vindo de outra página). */
export function scrollToInitialHash() {
  if (!location.hash) return;
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) scrollToTarget(target, { immediate: true });
}
