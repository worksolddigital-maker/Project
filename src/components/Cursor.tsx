import { useEffect, useRef } from 'react'
import { gsap, prefersReduced } from '../lib/motion'

/** Cursor personalizado discreto: acompanha o ponteiro nativo (que continua visível). Só em ponteiro fino. */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced() || !window.matchMedia('(pointer: fine)').matches) return
    el.hidden = false
    gsap.set(el, { xPercent: -50, yPercent: -50 })
    const x = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      x(e.clientX); y(e.clientY)
      el.classList.add('is-visible')
      const t = e.target as Element | null
      el.classList.toggle('is-active', !!t?.closest?.('a, button, summary, label, input, textarea, select, [role="button"]'))
    }
    const out = () => el.classList.remove('is-visible')
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', out)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', out)
      gsap.killTweensOf(el)
    }
  }, [])
  return <div ref={ref} className="cursor" hidden aria-hidden="true" />
}
