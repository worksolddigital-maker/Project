/**
 * Standalone replacement for `@/lib/navigation`: instead of reloading the
 * document, the demo shell switches screen and starts with fresh client caches.
 */
export function hardNavigate(path: string) {
  window.dispatchEvent(new CustomEvent("demo:hard-navigate", { detail: path }));
}
