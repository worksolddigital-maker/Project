/** Menu móvel em tela cheia com sequência GSAP, foco gerenciado e Esc. */
import { gsap } from '../lib/gsap';
import { qs, qsa, root } from '../lib/env';
import { lockScroll } from '../lib/scroll';

export function initMenu({ animate }: { animate: boolean }) {
  const toggle = qs<HTMLButtonElement>('[data-menu-toggle]');
  const menu = qs('[data-menu]');
  if (!toggle || !menu) return;

  const bg = qs('[data-menu-bg]', menu);
  const labels = qsa('.menu__label', menu);
  const nums = qsa('.menu__num', menu);
  const footer = qs('[data-menu-footer]', menu);
  const srLabel = qs('[data-menu-sr]', toggle);
  let isOpen = false;
  let tl: gsap.core.Timeline | null = null;

  const setA11y = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    if (srLabel) srLabel.textContent = open ? 'Fechar menu' : 'Abrir menu';
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    root.classList.add('menu-open');
    setA11y(true);
    lockScroll(true);
    tl?.kill();
    if (animate) {
      tl = gsap
        .timeline({ defaults: { ease: 'lo' } })
        .fromTo(bg, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'loInOut' })
        .fromTo(labels, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.06 }, 0.35)
        .fromTo(nums, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, stagger: 0.06 }, 0.5)
        .fromTo(footer, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.65);
    } else {
      gsap.set(bg, { clipPath: 'inset(0% 0% 0% 0%)' });
    }
    window.setTimeout(() => qs<HTMLAnchorElement>('[data-menu-link]', menu)?.focus({ preventScroll: true }), animate ? 450 : 0);
  };

  const close = (then?: () => void) => {
    if (!isOpen) {
      then?.();
      return;
    }
    isOpen = false;
    setA11y(false);
    tl?.kill();
    const finish = () => {
      menu.hidden = true;
      root.classList.remove('menu-open');
      lockScroll(false);
      then?.();
    };
    if (animate) {
      tl = gsap
        .timeline({ defaults: { ease: 'loInOut' }, onComplete: finish })
        .to([footer, ...nums], { autoAlpha: 0, duration: 0.35 }, 0)
        .to(labels, { yPercent: -110, duration: 0.55, stagger: 0.03, ease: 'power3.in' }, 0)
        .to(bg, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.75 }, 0.25);
    } else {
      finish();
    }
  };

  toggle.addEventListener('click', () => (isOpen ? close(() => toggle.focus()) : open()));

  window.addEventListener('lo:menu-close', (event) => {
    const detail = (event as CustomEvent<{ then?: () => void }>).detail;
    close(detail?.then);
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      close(() => toggle.focus());
      return;
    }
    if (event.key === 'Tab') {
      const focusables = [toggle, ...qsa<HTMLElement>('a[href], button', menu)];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Ao ampliar para desktop com o menu aberto, fecha sem animação.
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => {
    if (e.matches && isOpen) {
      tl?.kill();
      isOpen = false;
      setA11y(false);
      menu.hidden = true;
      root.classList.remove('menu-open');
      lockScroll(false);
    }
  });
}
