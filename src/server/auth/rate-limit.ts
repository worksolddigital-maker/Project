/**
 * Small fixed-window, in-memory rate limiter for authentication endpoints.
 * For multi-instance deployments, put a shared limiter (e.g. at the edge) in front.
 */
interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k);
  }
  const w = buckets.get(key);
  if (!w || w.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  w.count++;
  if (w.count > limit) return { ok: false, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
