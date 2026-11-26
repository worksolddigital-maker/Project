"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** True only after hydration on the client (safe replacement for a "mounted" effect). */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const STORAGE_EVENT = "td:storage";

/** Boolean flag persisted in localStorage, synchronised across components and tabs. */
export function useStoredFlag(key: string): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(STORAGE_EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(STORAGE_EVENT, cb);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const set = (v: boolean) => {
    try {
      window.localStorage.setItem(key, v ? "1" : "0");
    } catch {
      /* storage unavailable: state just won't persist */
    }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };
  return [value, set];
}

/** Re-evaluates `read` periodically (e.g. the current calendar day). */
export function usePolled<T extends string | number | boolean>(read: () => T, intervalMs: number, serverValue: T): T {
  return useSyncExternalStore(
    (cb) => {
      const id = window.setInterval(cb, intervalMs);
      return () => window.clearInterval(id);
    },
    read,
    () => serverValue,
  );
}
