import { useRef } from 'react'
import { pageById } from '../content'
import { gsap, MOTION_OK, SplitText, useGSAP } from '../lib/motion'
import { href } from '../lib/router'
import { useStore } from '../lib/store'
import { imgUrl } from './Picture'
import { pageLabel } from './Shell'
import { Icon, Magnetic } from './ui'

const PILLARS = ['Saúde', 'Alimentação', 'Foco', 'Disciplina', 'Bem-estar']

export function Cover() {
  const root = useRef<HTMLElement>(null)
  const last = useStore((s) => s.lastPage)
  const visitedCount = useStore((s) => Object.keys(s.visited).length)
  const resume = visitedCount > 2 && last !== 'capa' ? pageById.get(last) : undefined

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root)
      // Revelação cinematográfica: fundo → tipografia → livro → detalhes
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
      tl.from(q('.cover__bg img'), { scale: 1.25, opacity: 0, duration: 2.4, ease: 'power2.out' }, 0)
        .from(q('.cover__rule'), { scaleX: 0, duration: 1.4, stagger: 0.1 }, 0.2)
        .from(q('.cover__eyebrow'), { opacity: 0, letterSpacing: '1.2em', duration: 1.6 }, 0.25)
        .from(q('.cover__book'), { clipPath: 'inset(100% 0% 0% 0%)', y: 60, duration: 1.7 }, 0.45)
        .from(q('.cover__book img'), { scale: 1.3, duration: 2.2, ease: 'power3.out' }, 0.45)
        .from(q('.cover__fade'), { opacity: 0, y: 26, duration: 1.2, stagger: 0.11, ease: 'power3.out' }, 1.0)
        .from(q('.cover__pillars li'), { opacity: 0, y: 14, duration: 0.9, stagger: 0.07, ease: 'power3.out' }, 1.5)

      const split = SplitText.create(q('.cover__title'), {
        type: 'chars', mask: 'chars', autoSplit: true,
        onSplit: (self) => gsap.from(self.chars, { yPercent: 115, duration: 1.5, stagger: 0.055, ease: 'expo.out', delay: 0.45 }),
      })

      // Profundidade: o livro inclina com o ponteiro (somente ponteiro fino)
      let off = () => {}
      if (window.matchMedia('(pointer: fine)').matches) {
        const book = q('.cover__tilt')[0]
        const bg = q('.cover__bg img')[0]
        const rx = gsap.quickTo(book, 'rotationX', { duration: 0.9, ease: 'power3.out' })
        const ry = gsap.quickTo(book, 'rotationY', { duration: 0.9, ease: 'power3.out' })
        const bx = gsap.quickTo(bg, 'x', { duration: 1.4, ease: 'power3.out' })
        const by = gsap.quickTo(bg, 'y', { duration: 1.4, ease: 'power3.out' })
        const move = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5
          const ny = e.clientY / window.innerHeight - 0.5
          ry(-9 + nx * 12); rx(ny * -9); bx(nx * -24); by(ny * -18)
        }
        const el = root.current!
        el.addEventListener('pointermove', move)
        off = () => el.removeEventListener('pointermove', move)
      }
      const float = gsap.to(q('.cover__float'), { y: -12, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      return () => { off(); float.kill(); split.revert() }
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="cover" aria-labelledby="cover-title">
      <div className="cover__bg" aria-hidden="true"><img src={imgUrl('capa-cena.webp')} alt="" /></div>
      <div className="cover__grid">
        <div className="cover__text">
          <p className="cover__eyebrowrow"><span className="cover__rule" /><span className="cover__eyebrow">E-book interativo</span><span className="cover__rule" /></p>
          <h1 id="cover-title" className="cover__title" tabIndex={-1} data-page-title>RECOME<span className="accent">ÇO</span></h1>
          <p className="cover__tag cover__fade">A construção de uma nova versão de si</p>
          <p className="cover__sub cover__fade">Um guia prático para transformar sua <b>saúde</b>, seus <b>hábitos</b>, sua <b>mente</b> e sua <b>rotina</b>.</p>
          <div className="cover__actions cover__fade">
            <Magnetic><a className="btn btn--primary btn--lg" href={href('como-usar')}><span>Começar minha transformação</span>{Icon.arrow}</a></Magnetic>
            {resume
              ? <a className="btn btn--ghost" href={href(resume.id)}><span>Continuar: {pageLabel(resume)}</span></a>
              : <a className="btn btn--ghost" href={href('indice')}><span>Ver o índice</span></a>}
          </div>
          <ul className="cover__pillars" aria-label="Temas do e-book">{PILLARS.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div className="cover__stage" aria-hidden="true">
          <div className="cover__float">
            <div className="cover__tilt">
              <div className="cover__book">
                <img src={imgUrl('capa.webp')} srcSet={`${imgUrl('capa-512.webp')} 512w, ${imgUrl('capa.webp')} 1024w`} sizes="(min-width: 900px) 34vw, 62vw" width={1024} height={1536} alt="" fetchPriority="high" />
                <span className="cover__shine" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="cover__foot cover__fade">Pequenas mudanças, grandes resultados.</p>
    </section>
  )
}
