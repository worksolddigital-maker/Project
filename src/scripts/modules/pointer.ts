/**
 * Interações de ponteiro (apenas ponteiro fino, sem movimento reduzido):
 *  - cursor personalizado com quickTo (sem criar tweens a cada movimento);
 *  - botões magnéticos;
 *  - profundidade (tilt 3D) nos cards.
 */
import { gsap } from '../lib/gsap';
import { qs, qsa, root } from '../lib/env';

export function initCursor() {
  const el = qs('[data-cursor-el]');
  const ring = qs('[data-cursor-ring]');
  const label = qs('[data-cursor-label]');
  if (!el || !ring || !label) return () => {};

  const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
  let visible = false;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    // Alguns navegadores disparam um movimento sintético em (0,0) ao carregar.
    if (!visible && e.clientX === 0 && e.clientY === 0) return;
    if (!visible) {
      gsap.set(el, { x: e.clientX, y: e.clientY });
      root.classList.add('has-cursor');
      visible = true;
    }
    xTo(e.clientX);
    yTo(e.clientY);
  };

  const onOver = (e: PointerEvent) => {
    const target = e.target as Element | null;
    if (!target?.closest) return;
    const labelled = target.closest<HTMLElement>('[data-cursor]');
    const interactive = target.closest('a, button, input, select, textarea, label, [role="button"]');
    const dark = target.closest('.bg-petrol, .footer, .lightbox, .menu');
    root.classList.toggle('cursor-dark', Boolean(dark));
    if (labelled?.dataset.cursor) {
      label.textContent = labelled.dataset.cursor;
      root.classList.add('cursor-label');
      root.classList.remove('cursor-link');
    } else if (interactive) {
      root.classList.add('cursor-link');
      root.classList.remove('cursor-label');
    } else {
      root.classList.remove('cursor-link', 'cursor-label');
    }
  };

  const onLeave = () => root.classList.add('cursor-hidden');
  const onEnter = () => root.classList.remove('cursor-hidden');

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.documentElement.addEventListener('pointerenter', onEnter);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    document.documentElement.removeEventListener('pointerenter', onEnter);
    root.classList.remove('has-cursor', 'cursor-link', 'cursor-label', 'cursor-dark', 'cursor-hidden');
  };
}

export function initMagnetic() {
  const cleanups: (() => void)[] = [];
  qsa('[data-magnetic]').forEach((el) => {
    const inner = qs('[data-magnetic-inner]', el);
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3' }) : null;
    const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3' }) : null;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.28);
      yTo(dy * 0.38);
      ixTo?.(dx * 0.1);
      iyTo?.(dy * 0.14);
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)', overwrite: true });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)', overwrite: true });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set([el, inner].filter(Boolean), { clearProps: 'transform' });
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

export function initTilt() {
  const cleanups: (() => void)[] = [];
  qsa('[data-tilt]').forEach((card) => {
    const depth = qs('[data-tilt-depth]', card);
    const rxTo = gsap.quickTo(card, 'rotationX', { duration: 0.8, ease: 'power3' });
    const ryTo = gsap.quickTo(card, 'rotationY', { duration: 0.8, ease: 'power3' });
    const yTo = gsap.quickTo(card, 'y', { duration: 0.8, ease: 'power3' });
    const dxTo = depth ? gsap.quickTo(depth, 'x', { duration: 0.9, ease: 'power3' }) : null;
    const dyTo = depth ? gsap.quickTo(depth, 'y', { duration: 0.9, ease: 'power3' }) : null;
    gsap.set(card, { transformPerspective: 1400 });

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ryTo(px * 5);
      rxTo(-py * 4);
      yTo(-6);
      dxTo?.(px * -14);
      dyTo?.(py * -10);
    };
    const leave = () => {
      rxTo(0);
      ryTo(0);
      yTo(0);
      dxTo?.(0);
      dyTo?.(0);
    };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    cleanups.push(() => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
      gsap.set([card, depth].filter(Boolean), { clearProps: 'transform' });
    });
  });
  return () => cleanups.forEach((fn) => fn());
}
