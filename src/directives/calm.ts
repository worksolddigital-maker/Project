import type { ClientDirective } from 'astro';

/**
 * client:calm — ativa a ilha React sem disputar quadros com a animação.
 *
 * Espera a abertura terminar (evento "lo:ready"), o navegador ficar ocioso
 * e a rolagem parar; assim a hidratação acontece antes de a seção chegar
 * à tela e nunca no meio de um gesto de rolagem (60fps no celular).
 * Se a pessoa interagir com o componente antes disso, ativa na hora.
 */
const calm: ClientDirective = (load, _opts, el) => {
  let done = false;
  let timer = 0;

  const run = async () => {
    if (done) return;
    done = true;
    cleanup();
    const hydrate = await load();
    await hydrate();
  };

  const schedule = (delay: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => run(), { timeout: 2000 });
      else run();
    }, delay);
  };

  const onScroll = () => schedule(300);
  const onInteract = () => run();
  const cleanup = () => {
    window.clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('lo:ready', onReady);
    el.removeEventListener('pointerover', onInteract);
    el.removeEventListener('focusin', onInteract);
    el.removeEventListener('touchstart', onInteract);
  };
  const onReady = () => {
    window.addEventListener('scroll', onScroll, { passive: true });
    schedule(500);
  };

  el.addEventListener('pointerover', onInteract, { once: true });
  el.addEventListener('focusin', onInteract, { once: true });
  el.addEventListener('touchstart', onInteract, { once: true, passive: true });

  if ((window as Window & { __loReady?: boolean }).__loReady) onReady();
  else {
    window.addEventListener('lo:ready', onReady, { once: true });
    // Segurança: se o evento não vier, ativa mesmo assim.
    window.setTimeout(() => !done && onReady(), 6000);
  }
};

export default calm;
