import { useEffect, useLayoutEffect, useRef } from 'react'
import { groupById, images, pagesOf } from '../content'
import type { Page } from '../content/types'
import { gsap, MOTION_OK, scrollToEl, scrollToTop, ScrollTrigger, SplitText, useGSAP } from '../lib/motion'
import { Blocks } from './Blocks'
import { Cover } from './Cover'
import { Picture } from './Picture'
import { PageNav } from './Shell'
import { Toc } from './Toc'

function Hero({ page }: { page: Page }) {
  const g = groupById.get(page.group)!
  const siblings = pagesOf(page.group)
  const pos = siblings.indexOf(page) + 1
  return (
    <header className="hero">
      {page.img && (
        <div className="hero__media">
          <Picture img={page.img} eager className="hero__img" />
          <span className="hero__credit">Foto: {images[page.img].by} / Unsplash</span>
        </div>
      )}
      <div className="hero__body">
        <p className="hero__kicker">
          <span>{g.label}</span>
          {g.n && <span className="hero__ktitle">{g.title}</span>}
          {siblings.length > 1 && <span className="hero__kpos">{pos} / {siblings.length}</span>}
        </p>
        <h1 className="hero__title" tabIndex={-1} data-page-title data-split>{page.title}</h1>
        {page.lead && <p className="hero__lead">{page.lead}</p>}
      </div>
    </header>
  )
}

export function PageView({ page, anchor }: { page: Page; anchor?: string }) {
  const root = useRef<HTMLDivElement>(null)

  // Nova página: volta ao topo antes da pintura e move o foco para o título (leitores de tela)
  useLayoutEffect(() => {
    scrollToTop()
    root.current?.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true })
  }, [page.id])

  // Âncoras internas (#pagina--ancora) e destaque do alvo
  useEffect(() => {
    if (!anchor) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(anchor) ?? document.getElementById(`ref-${anchor}`)
      if (!el) return
      scrollToEl(el)
      el.classList.add('is-target')
      window.setTimeout(() => el.classList.remove('is-target'), 2600)
    }, 750)
    return () => window.clearTimeout(t)
  }, [anchor, page.id])

  useGSAP(() => {
    if (page.special === 'capa') return
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root)
      const D = 0.35 // espera a cortina de transição começar a subir

      // Hero: imagem revelada por clip-path + escala, título por máscara de linhas
      if (q('.hero__media').length) {
        gsap.from(q('.hero__media'), { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.5, ease: 'expo.out', delay: D })
        gsap.from(q('.hero__img'), { scale: 1.28, duration: 2.2, ease: 'power3.out', delay: D })
        // Parallax discreto, reduzido em telas pequenas
        const small = window.matchMedia('(max-width: 760px)').matches
        gsap.to(q('.hero__img'), { yPercent: small ? 6 : 14, ease: 'none', scrollTrigger: { trigger: q('.hero')[0], start: 'top top', end: 'bottom top', scrub: true } })
        gsap.to(q('.hero__body'), { yPercent: small ? -4 : -10, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: q('.hero')[0], start: '55% top', end: 'bottom top', scrub: true } })
      }
      gsap.from(q('.hero__kicker'), { opacity: 0, y: 14, duration: 1, delay: D + 0.15 })
      const splits = q('[data-split]').map((el) => SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 112, duration: 1.25, stagger: 0.1, ease: 'expo.out', delay: D + 0.2 }),
      }))
      gsap.from(q('.hero__lead'), { opacity: 0, y: 22, duration: 1.1, delay: D + 0.55 })

      // Conteúdo: surge progressivamente, em lotes, conforme entra na tela
      const items = q('[data-reveal]')
      gsap.set(items, { opacity: 0, y: 34 })
      ScrollTrigger.batch(items, {
        start: 'top 90%', once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, stagger: 0.09, ease: 'power3.out', overwrite: true, clearProps: 'transform' }),
      })
      // Figuras: revelação por clip-path e escala suave atrelada à rolagem
      q('[data-figure]').forEach((fig) => {
        const frame = fig.querySelector('.figure__frame'), img = fig.querySelector('.figure__img')
        gsap.from(frame, { clipPath: 'inset(12% 8% 12% 8% round 18px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 82%', once: true } })
        gsap.fromTo(img, { scale: 1.18, yPercent: -4 }, { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } })
      })
      // Passos numerados: entrada escalonada
      q('.steps').forEach((list) => {
        gsap.from(list.querySelectorAll('.steps__item'), { opacity: 0, x: -18, duration: 0.8, stagger: 0.09, scrollTrigger: { trigger: list, start: 'top 84%', once: true } })
      })
      return () => splits.forEach((s) => s.revert())
    })

    // Widgets e abas mudam a altura da página: recalcula os gatilhos
    let raf = 0
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => ScrollTrigger.refresh()) })
    if (root.current) ro.observe(root.current)
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => { ro.disconnect(); cancelAnimationFrame(raf); mm.revert() }
  }, { scope: root, dependencies: [page.id], revertOnUpdate: true })

  if (page.special === 'capa') return <div ref={root}><Cover /></div>

  return (
    <div ref={root} className={`page page--${page.group}`}>
      {page.special === 'indice' ? <Toc /> : (
        <>
          <Hero page={page} />
          <article className="article"><Blocks blocks={page.blocks} /></article>
        </>
      )}
      <PageNav page={page} />
    </div>
  )
}
