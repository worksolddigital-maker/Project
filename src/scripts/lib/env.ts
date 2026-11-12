export const root = document.documentElement;

export const mq = {
  reduced: '(prefers-reduced-motion: reduce)',
  motionOk: '(prefers-reduced-motion: no-preference)',
  fine: '(pointer: fine) and (hover: hover)',
  desktop: '(min-width: 1024px)',
  mobile: '(max-width: 767px)',
};

export const matches = (query: string) => window.matchMedia(query).matches;

export const prefersReduced = () => matches(mq.reduced);
export const hasFinePointer = () => matches(mq.fine);

export const qs = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  scope.querySelector<T>(sel);
export const qsa = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<T>(sel));

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 150) {
  let id = 0;
  return (...args: Parameters<T>) => {
    window.clearTimeout(id);
    id = window.setTimeout(() => fn(...args), ms);
  };
}

/** Fontes carregadas (com limite de espera para nunca travar a abertura). */
export function fontsReady(timeout = 1400) {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.ready) return Promise.resolve();
  return Promise.race([fonts.ready.then(() => undefined), wait(timeout)]);
}
