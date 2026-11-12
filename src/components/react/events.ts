/**
 * Ponte entre as ilhas React (Motion) e a camada de rolagem (Lenis/GSAP).
 * As ilhas nunca manipulam elementos controlados pelo GSAP — apenas avisam.
 */

/** Pede ao app que pause/retome a rolagem suave (ex.: lightbox aberto). */
export function lockScroll(lock: boolean) {
  window.dispatchEvent(new CustomEvent('lo:lock', { detail: lock }));
}

/** Avisa que a altura da página mudou (ex.: acordeão abriu). */
export function requestRefresh() {
  window.dispatchEvent(new CustomEvent('lo:refresh'));
}

export const EASE = [0.16, 1, 0.3, 1] as const;
