/**
 * Revelações genéricas guiadas por atributos:
 *  [data-split]            títulos com máscara de linha (SplitText + ScrollTrigger)
 *  [data-reveal]           fade-up suave
 *  [data-reveal-children]  filhos em sequência (stagger)
 *  [data-clip-reveal]      imagem revelada por clip-path + escala
 *  [data-parallax-inner]   parallax interno da imagem dentro da moldura
 *  [data-depth="0.2"]      camadas em velocidades diferentes (profundidade)
 */
import { gsap, SplitText } from '../lib/gsap';
import { matches, mq, qs, qsa } from '../lib/env';

export function initReveals() {
  const isMobile = matches(mq.mobile);

  // Títulos: linhas sobem por trás de máscaras. autoSplit refaz a divisão
  // quando as fontes carregam ou a largura muda (o tween é recriado).
  qsa('[data-split]').forEach((el) => {
    // O hero é tratado pela abertura.
    if (el.closest('[data-hero], [data-phero]')) return;
    // aria-label só é permitido em títulos; em parágrafos o texto dividido
    // em linhas continua legível para leitores de tela.
    const isHeading = /^H[1-6]$/.test(el.tagName);
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      aria: isHeading ? 'auto' : 'none',
      autoSplit: true,
      onSplit(self) {
        const isDisplay = el.classList.contains('display');
        return gsap.from(self.lines, {
          yPercent: isDisplay ? 135 : 120,
          duration: 1.35,
          stagger: 0.09,
          ease: 'lo',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        });
      },
    });
  });

  qsa('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: isMobile ? 26 : 44 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.3,
        ease: 'lo',
        scrollTrigger: { trigger: el, start: 'top 89%', once: true },
      },
    );
  });

  qsa('[data-reveal-children]').forEach((parent) => {
    const children = Array.from(parent.children) as HTMLElement[];
    gsap.fromTo(
      children,
      { autoAlpha: 0, y: isMobile ? 24 : 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.09,
        ease: 'lo',
        scrollTrigger: { trigger: parent, start: 'top 88%', once: true },
      },
    );
  });

  qsa('[data-clip-reveal]').forEach((frame) => {
    const img = qs('picture, img', frame);
    const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 82%', once: true } });
    tl.fromTo(
      frame,
      { clipPath: 'inset(18% 12% 18% 12% round 28px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.8, ease: 'loInOut' },
    );
    if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2.2, ease: 'lo' }, 0);
  });

  qsa('[data-parallax-inner]').forEach((inner) => {
    gsap.fromTo(
      inner,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: inner.parentElement ?? inner, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  qsa('[data-depth]').forEach((el) => {
    const speed = Number(el.dataset.depth ?? 0.15) * (isMobile ? 0.5 : 1);
    gsap.fromTo(
      el,
      { yPercent: -speed * 100 },
      {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}
