import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
gsap.defaults({ ease: 'power3.out', duration: 0.9 })

export const REDUCED = '(prefers-reduced-motion: reduce)'
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'
export const prefersReduced = () => window.matchMedia(REDUCED).matches

let lenis: Lenis | null = null
const raf = (t: number) => lenis?.raf(t * 1000)

/** Lenis sincronizado ao ticker do GSAP. Não é criado com movimento reduzido. */
export function startLenis() {
  if (lenis || prefersReduced()) return
  lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)
}
export function stopLenis() {
  if (!lenis) return
  gsap.ticker.remove(raf)
  lenis.destroy()
  lenis = null
}
export function lockScroll(lock: boolean) {
  if (lock) lenis?.stop(); else lenis?.start()
  document.documentElement.classList.toggle('is-locked', lock)
}
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  window.scrollTo(0, 0)
}
export function scrollToEl(el: Element) {
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -96 })
  else el.scrollIntoView({ block: 'start' })
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
