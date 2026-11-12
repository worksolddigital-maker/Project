/** Navegação animada: fundo ao rolar, ocultar ao descer, progresso e seção ativa. */
import { gsap, ScrollTrigger } from '../lib/gsap';
import { qs, qsa, root } from '../lib/env';

export function initHeader() {
  const header = qs('[data-header]');
  if (!header) return;
  const progress = qs('[data-progress]', header);
  const setProgress = progress ? gsap.quickSetter(progress, 'scaleX') : null;

  let hidden = false;
  const setHidden = (value: boolean) => {
    if (value === hidden) return;
    hidden = value;
    header.classList.toggle('is-hidden', value);
    root.classList.toggle('header-hidden', value);
  };

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      header.classList.toggle('is-scrolled', y > 40);
      setProgress?.(self.progress);
      if (root.classList.contains('menu-open')) return;
      if (y < 320) setHidden(false);
      else if (self.direction === 1 && self.getVelocity() > 40) setHidden(true);
      else if (self.direction === -1) setHidden(false);
    },
  });

  // Foco por teclado sempre revela o cabeçalho.
  header.addEventListener('focusin', () => setHidden(false));

  // Link ativo conforme a seção visível (apenas na página inicial).
  const links = qsa<HTMLAnchorElement>('[data-nav-link]', header);
  if (location.pathname !== '/') return;
  links.forEach((link) => {
    const id = new URL(link.href).hash.slice(1);
    const section = id ? document.getElementById(id) : null;
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (self.isActive) {
          links.forEach((l) => l.classList.remove('is-active'));
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      },
    });
  });
}
