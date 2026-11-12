/**
 * Entrada cinematográfica de cada página:
 *  - Abertura (preloader) na primeira visita da sessão à página inicial;
 *  - Cortina que se recolhe ao chegar de uma transição interna;
 *  - Revelação do hero (máscaras de linha, clip-path e escala suave da imagem).
 */
import { gsap, SplitText } from '../lib/gsap';
import { fontsReady, qs, qsa, root } from '../lib/env';
import { lockScroll } from '../lib/scroll';

type Timeline = gsap.core.Timeline;

function clearLoading() {
  const w = window as Window & { __loFailsafe?: number };
  if (w.__loFailsafe) window.clearTimeout(w.__loFailsafe);
}

/** Revelação do cabeçalho — comum a todas as páginas. */
function headerIn(tl: Timeline, at: number) {
  const parts = qsa('.header [data-intro-hide]');
  if (parts.length) tl.from(parts, { y: -24, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, at);
}

function splitLines(el: Element | null) {
  if (!el) return [] as Element[];
  const isHeading = /^H[1-6]$/.test(el.tagName);
  const split = SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    aria: isHeading ? 'auto' : 'none',
  });
  return split.lines;
}

/** Hero da página inicial. */
function homeHero(tl: Timeline) {
  const hero = qs('[data-hero]');
  if (!hero) return false;

  const titleLines = qsa('.hero__line', hero).flatMap((line) => splitLines(line));
  const subLines = splitLines(qs('[data-hero-sub]', hero));
  const media = qs('[data-hero-media]', hero);
  const picture = qs('[data-hero-img] picture', hero);
  // Na abertura, a foto já está sob a cortina: a própria saída a revela.
  const underPreloader = root.classList.contains('is-intro');

  tl.addLabel('hero', 0);
  if (media && !underPreloader) {
    tl.fromTo(
      media,
      { clipPath: 'inset(100% 0% 0% 0% round 28px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.7, ease: 'loInOut' },
      'hero',
    );
  }
  if (picture) {
    tl.from(picture, { scale: underPreloader ? 1.14 : 1.32, duration: underPreloader ? 2.6 : 2.4, ease: 'lo' }, 'hero');
  }
  tl.from(qs('[data-hero-frame]', hero), { autoAlpha: 0, x: 22, y: -22, duration: 1.6 }, 'hero+=0.7');
  tl.from(qs('[data-hero-eyebrow]', hero), { autoAlpha: 0, y: 14, duration: 1 }, 'hero+=0.2');
  tl.from(
    titleLines,
    { yPercent: 135, rotate: 2.5, transformOrigin: '0% 100%', duration: 1.55, stagger: 0.13 },
    'hero+=0.25',
  );
  tl.from(subLines, { yPercent: 105, duration: 1.2, stagger: 0.08 }, 'hero+=0.65');
  tl.from(qsa('[data-hero-actions] > *', hero), { autoAlpha: 0, y: 22, duration: 1.1, stagger: 0.1 }, 'hero+=0.85');
  tl.from([qs('[data-hero-caption]', hero), qs('[data-hero-foot]', hero)], { autoAlpha: 0, y: 12, duration: 1, stagger: 0.12 }, 'hero+=1.15');
  // Itens já tratados pelas máscaras ficam visíveis imediatamente.
  gsap.set([qs('[data-hero-title]', hero), qs('[data-hero-sub]', hero), qs('[data-hero-actions]', hero)], {
    visibility: 'visible',
  });
  headerIn(tl, 0.35);
  return true;
}

/** Hero das páginas de procedimento. */
function procedureHero(tl: Timeline) {
  const hero = qs('[data-phero]');
  if (!hero) return false;
  const titleLines = splitLines(qs('[data-phero-title]', hero));
  const media = qs('[data-phero-media]', hero);
  const picture = qs('[data-phero-media] picture', hero);

  tl.addLabel('hero', 0);
  if (media) {
    tl.fromTo(
      media,
      { clipPath: 'inset(0% 0% 100% 0% round 28px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.6, ease: 'loInOut' },
      'hero',
    );
  }
  if (picture) tl.from(picture, { scale: 1.25, duration: 2.2 }, 'hero');
  tl.from(titleLines, { yPercent: 135, duration: 1.4, stagger: 0.1 }, 'hero+=0.2');
  tl.from(qsa('[data-phero-fade]', hero), { autoAlpha: 0, y: 18, duration: 1.1, stagger: 0.09 }, 'hero+=0.45');
  gsap.set(qs('[data-phero-title]', hero), { visibility: 'visible' });
  headerIn(tl, 0.25);
  return true;
}

function genericPage(tl: Timeline) {
  const fades = qsa('[data-intro-hide]:not(.header [data-intro-hide])');
  if (fades.length) tl.from(fades, { autoAlpha: 0, y: 20, duration: 1.1, stagger: 0.08 }, 0.15);
  headerIn(tl, 0.1);
}

function buildPageTimeline() {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'lo' } });
  if (!homeHero(tl) && !procedureHero(tl)) genericPage(tl);
  return tl;
}

function preloaderTimeline(page: Timeline) {
  const pre = qs('[data-preloader]');
  if (!pre) return null;

  // A entrada já aconteceu em CSS desde o primeiro quadro. A saída começa
  // ~2,2 s após o início do carregamento (ou já, se o JS chegou tarde).
  const exitAt = Math.max(0.05, 1.9 - performance.now() / 1000);
  const inner = qs('[data-preloader-inner]', pre);
  const phrase = qs('[data-preloader-phrase]', pre);

  const tl = gsap.timeline({
    defaults: { ease: 'lo' },
    onComplete: () => {
      pre.remove();
      root.classList.remove('is-intro');
      lockScroll(false);
    },
  });
  lockScroll(true);
  tl.addLabel('exit', exitAt)
    .add(() => {
      // Congela o estado final das animações CSS antes de o GSAP assumir.
      gsap.set([inner, phrase, ...qsa('[data-preloader] p, [data-preloader] span', pre)], { animation: 'none' });
    }, 'exit')
    .to(inner, { yPercent: -30, autoAlpha: 0, duration: 0.85, ease: 'power3.in' }, 'exit')
    .to(phrase, { autoAlpha: 0, duration: 0.5 }, 'exit')
    .fromTo(
      pre,
      { clipPath: 'inset(0% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.25, ease: 'loInOut' },
      'exit+=0.4',
    )
    .add(() => {
      page.play();
    }, 'exit+=0.4');

  // Clique ou tecla pulam a abertura.
  const skip = () => {
    if (tl.time() < tl.labels.exit) tl.seek('exit');
  };
  pre.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });

  try {
    sessionStorage.setItem('lo:intro', '1');
  } catch {
    /* navegação privada */
  }
  return tl;
}

function curtainEnter(page: Timeline) {
  const curtain = qs('[data-curtain]');
  if (!curtain) return page.play();
  const panel = qs('[data-curtain-panel]', curtain);
  const mark = qs('[data-curtain-mark]', curtain);
  gsap.set(curtain, { visibility: 'visible' });
  gsap.set(panel, { clipPath: 'inset(0% 0% 0% 0%)' });
  gsap.set(mark, { autoAlpha: 1 });
  root.classList.remove('is-entering');
  gsap
    .timeline({ defaults: { ease: 'lo' }, onComplete: () => gsap.set(curtain, { visibility: 'hidden' }) })
    .to(mark, { autoAlpha: 0, y: -14, duration: 0.55 }, 0.05)
    .to(panel, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'loInOut' }, 0.15)
    .add(() => {
      page.play();
    }, 0.4);
}

export async function playIntro() {
  clearLoading();
  await fontsReady();

  const page = buildPageTimeline();
  const intro = root.classList.contains('is-intro');
  const entering = root.classList.contains('is-entering');

  // Estados iniciais já aplicados pelos from(): agora é seguro mostrar.
  root.classList.remove('is-loading');

  if (intro && qs('[data-preloader]')) {
    preloaderTimeline(page);
  } else if (entering) {
    root.classList.remove('is-intro');
    curtainEnter(page);
  } else {
    root.classList.remove('is-intro');
    page.play();
  }
  return page;
}

/** Sem animação: apenas garante que tudo esteja visível. */
export function skipIntro() {
  clearLoading();
  qs('[data-preloader]')?.remove();
  root.classList.remove('is-loading', 'is-intro', 'is-entering');
}
