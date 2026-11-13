import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import { useReducedMotion } from './useMedia'

let lenis: Lenis | null = null

export const getLenis = () => lenis

/**
 * Smooth scrolling com Lenis sincronizado ao ticker do GSAP, para que o
 * ScrollTrigger leia sempre a mesma posição de scroll que a tela exibe.
 * Em dispositivos de toque o Lenis mantém a rolagem nativa (mais fluida no celular).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenis = instance
    instance.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      instance.destroy()
      lenis = null
    }
  }, [reduced])

  return <>{children}</>
}

export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, { immediate, duration: 1.6, force: true })
  else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
}

export function scrollToElement(target: string | HTMLElement, offset = -80) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return
  const y = el.getBoundingClientRect().top + window.scrollY + offset
  scrollToY(y)
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  }
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
