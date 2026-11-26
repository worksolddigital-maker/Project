import "server-only";

interface Entry<T> {
  value: T | undefined;
  /** When `value` was fetched. */
  at: number;
  /** Earliest time of the next refresh. */
  next: number;
  error: string | null;
  pending: Promise<void> | null;
}

const store = new Map<string, Entry<unknown>>();
const RETRY_MS = 45_000;

export interface CachedResult<T> {
  value: T | undefined;
  /** When `value` was fetched (0 if never). */
  at: number;
  /** Error of the latest refresh, if it failed (value may be older data). */
  error: string | null;
}

/**
 * Per-process cache with a time-to-live. Concurrent callers share one fetch;
 * if a refresh fails, the previous value keeps being served with the error
 * and the source is tried again after a short pause.
 */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<CachedResult<T>> {
  let entry = store.get(key) as Entry<T> | undefined;
  if (!entry) {
    if (store.size > 300) prune();
    entry = { value: undefined, at: 0, next: 0, error: null, pending: null };
    store.set(key, entry as Entry<unknown>);
  }
  const e = entry;
  if (Date.now() >= e.next) {
    e.pending ??= load()
      .then((v) => {
        e.value = v;
        e.at = Date.now();
        e.next = e.at + ttlMs;
        e.error = null;
      })
      .catch((err: unknown) => {
        e.error = err instanceof Error ? err.message : String(err);
        e.next = Date.now() + Math.min(ttlMs, RETRY_MS);
      })
      .finally(() => {
        e.pending = null;
      });
    await e.pending;
  }
  return { value: e.value, at: e.value === undefined ? 0 : e.at, error: e.error };
}

/** Drops entries nobody refreshed for an hour (keeps the map small). */
function prune() {
  const old = Date.now() - 3_600_000;
  for (const [k, e] of store) if (!e.pending && e.next < old) store.delete(k);
}

/** Test helper. */
export function clearMarketCache() {
  store.clear();
}
