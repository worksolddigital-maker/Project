import { easeInOutCubic, clamp } from './math'

/**
 * Keyframes determinísticos: cada propriedade é uma função pura do progresso
 * normalizado do scroll (0..1). Isso garante que a animação seja 100% reversível —
 * subir a página devolve exatamente o estado anterior, sem reinícios.
 */
export type Vec = readonly number[]
export interface Key {
  p: number
  v: Vec
  /** easing do trecho que TERMINA nesta key */
  ease?: (t: number) => number
}

export function sample(keys: readonly Key[], p: number, out: number[] = []): number[] {
  const n = keys[0].v.length
  out.length = n
  if (p <= keys[0].p) {
    for (let i = 0; i < n; i++) out[i] = keys[0].v[i]
    return out
  }
  const last = keys[keys.length - 1]
  if (p >= last.p) {
    for (let i = 0; i < n; i++) out[i] = last.v[i]
    return out
  }
  for (let k = 1; k < keys.length; k++) {
    const b = keys[k]
    if (p <= b.p) {
      const a = keys[k - 1]
      const span = b.p - a.p
      const t = span <= 0 ? 1 : clamp((p - a.p) / span)
      const e = (b.ease ?? easeInOutCubic)(t)
      for (let i = 0; i < n; i++) out[i] = a.v[i] + (b.v[i] - a.v[i]) * e
      return out
    }
  }
  return out
}
