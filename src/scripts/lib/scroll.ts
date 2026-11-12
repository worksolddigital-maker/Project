import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { root } from './env';

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

/** Rolagem suave sincronizada com o ScrollTrigger (padrão oficial Lenis + GSAP). */
export function initLenis() {
  if (lenis) return lenis;
  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.09,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    anchors: false,
    stopInertiaOnNavigate: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function destroyLenis() {
  if (tick) gsap.ticker.remove(tick);
  lenis?.destroy();
  lenis = null;
  tick = null;
}

export const getLenis = () => lenis;

export function lockScroll(lock: boolean) {
  root.classList.toggle('scroll-locked', lock);
  if (!lenis) return;
  if (lock) lenis.stop();
  else lenis.start();
}

const easeInOutExpo = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

/** Deslocamento padrão para âncoras (navegação fixa de categorias). */
function offsetFor(el: Element | null) {
  if (!el) return 0;
  if (el.matches('[data-pcat]:not(.metodo)')) return -96;
  return 0;
}

export function scrollToTarget(target: Element | number, opts: { immediate?: boolean } = {}) {
  const offset = typeof target === 'number' ? 0 : offsetFor(target);
  if (lenis) {
    lenis.scrollTo(target as HTMLElement | number, {
      offset,
      immediate: opts.immediate,
      duration: 1.7,
      easing: easeInOutExpo,
      force: true,
    });
    return;
  }
  const top =
    typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: 'auto' });
}
