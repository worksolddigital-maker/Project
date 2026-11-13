export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Progresso normalizado de `p` dentro do intervalo [a, b]. */
export const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a))

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const smoothstep = (t: number) => t * t * (3 - 2 * t)

/**
 * Janela de visibilidade: sobe de 0→1 em [a,b], fica em 1 e desce em [c,d].
 * Usada para legendas e camadas sincronizadas ao mesmo progresso de scroll.
 */
export function windowed(p: number, a: number, b: number, c: number, d: number) {
  if (p <= a || p >= d) return 0
  if (p < b) return smoothstep(range(p, a, b))
  if (p <= c) return 1
  return 1 - smoothstep(range(p, c, d))
}

/** Menor diferença angular entre dois ângulos (radianos). */
export function angleDelta(from: number, to: number) {
  const tau = Math.PI * 2
  let d = (to - from) % tau
  if (d > Math.PI) d -= tau
  if (d < -Math.PI) d += tau
  return d
}
