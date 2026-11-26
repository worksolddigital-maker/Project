"use client";

/**
 * Full document navigation. Used after login/logout/account deletion so that
 * every client cache (React Query, in-memory state) starts clean.
 */
export function hardNavigate(path: string) {
  window.location.assign(new URL(path, window.location.origin).toString());
}
