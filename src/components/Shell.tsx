import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { groupById, groups, pageIndex, pages, pagesOf } from '../content'
import type { Page } from '../content/types'
import { lockScroll } from '../lib/motion'
import { href } from '../lib/router'
import { actions, useStore } from '../lib/store'
import { Icon, Magnetic } from './ui'

export const pageLabel = (p: Page) => p.short ?? p.title

export function useReadingProgress() {
  const visited = useStore((s) => s.visited)
  const n = pages.filter((p) => visited[p.id]).length
  return { n, total: pages.length, ratio: n / pages.length }
}

export function TopBar({ page, onMenu }: { page: Page; onMenu: () => void }) {
  const { ratio, n, total } = useReadingProgress()
  const g = groupById.get(page.group)!
  const cover = page.special === 'capa'
  return (
    <header className={`topbar no-print ${cover ? 'topbar--cover' : ''}`}>
      <div className="topbar__row">
        <button type="button" className="iconbtn" onClick={onMenu} aria-label="Abrir menu de capítulos" aria-haspopup="dialog">{Icon.menu}</button>
        <a className="topbar__brand" href={href('capa')} aria-label="RECOMEÇO: ir para a capa">RECOME<span>ÇO</span></a>
        <p className="topbar__crumb" aria-hidden={cover}>
          {!cover && <><span>{g.label}</span><span className="topbar__sep">/</span><strong>{pageLabel(page)}</strong></>}
        </p>
        <nav className="topbar__actions" aria-label="Atalhos">
          <a className="chip" href={href('indice')}>{Icon.grid}<span>Índice</span></a>
          <a className="chip" href={href('painel')}>{Icon.chart}<span>Painel</span></a>
          <span className="topbar__pct" title={`${n} de ${total} páginas visitadas`}>{Math.round(ratio * 100)}%</span>
        </nav>
      </div>
      <div className="topbar__progress" role="progressbar" aria-label="Progresso de leitura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
        <motion.div className="topbar__bar" initial={false} animate={{ scaleX: ratio }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </header>
  )
}

export function Drawer({ open, onClose, current }: { open: boolean; onClose: () => void; current: Page }) {
  const visited = useStore((s) => s.visited)
  const { n, total, ratio } = useReadingProgress()
  const [confirm, setConfirm] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lockScroll(open)
    if (!open) { setConfirm(false); return }
    const prev = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[aria-current="page"], button')?.focus(), 60)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href], button')
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', key); lockScroll(false); prev?.focus?.() }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer no-print">
          <motion.div className="drawer__scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
          <motion.div ref={panel} className="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu de capítulos" data-lenis-prevent
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div className="drawer__head">
              <div>
                <p className="drawer__brand">RECOME<span>ÇO</span></p>
                <p className="drawer__meta">{n} de {total} páginas · {Math.round(ratio * 100)}% lido</p>
              </div>
              <button type="button" className="iconbtn" onClick={onClose} aria-label="Fechar menu">{Icon.close}</button>
            </div>
            <nav className="drawer__nav" aria-label="Capítulos">
              {groups.map((g, gi) => (
                <motion.section key={g.id} className="drawer__group" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + gi * 0.035, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                  <h2 className="drawer__gtitle"><span>{g.n ? String(g.n).padStart(2, '0') : '·'}</span>{g.title}</h2>
                  <ul>
                    {pagesOf(g.id).map((p) => (
                      <li key={p.id}>
                        <a href={href(p.id)} onClick={onClose} aria-current={p.id === current.id ? 'page' : undefined} className={`drawer__link ${visited[p.id] ? 'is-visited' : ''}`}>
                          <span className="drawer__dot" aria-hidden="true">{visited[p.id] && Icon.check}</span>
                          <span>{pageLabel(p)}</span>
                          {visited[p.id] && <span className="sr-only"> (visitada)</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              ))}
            </nav>
            <div className="drawer__foot">
              <a className="btn btn--outline btn--sm" href={href('imprimir')} onClick={onClose}>{Icon.print}<span>Imprimir / PDF</span></a>
              {confirm ? (
                <div className="drawer__confirm" role="alert">
                  <p>Apagar todas as marcações, textos e progresso deste dispositivo?</p>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => { actions.resetAll(); setConfirm(false); onClose(); window.location.hash = href('capa') }}>Sim, apagar tudo</button>
                  <button type="button" className="btn btn--text btn--sm" onClick={() => setConfirm(false)}>Cancelar</button>
                </div>
              ) : (
                <button type="button" className="btn btn--text btn--sm" onClick={() => setConfirm(true)}>Redefinir meus dados</button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function PageNav({ page }: { page: Page }) {
  const i = pageIndex(page.id)
  const prev = pages[i - 1]
  const next = pages[i + 1]
  return (
    <nav className="pagenav no-print" aria-label="Navegação entre páginas">
      <div className="pagenav__inner">
        {prev
          ? <a className="pagenav__btn pagenav__btn--prev" href={href(prev.id)} rel="prev">{Icon.back}<span><small>Voltar</small><b>{pageLabel(prev)}</b></span></a>
          : <span />}
        <a className="pagenav__mid" href={href('indice')}>{Icon.grid}<span>Índice</span><small>{i + 1} / {pages.length}</small></a>
        {next
          ? <Magnetic strength={0.18}><a className="pagenav__btn pagenav__btn--next" href={href(next.id)} rel="next"><span><small>Avançar</small><b>{pageLabel(next)}</b></span>{Icon.arrow}</a></Magnetic>
          : <a className="pagenav__btn pagenav__btn--next" href={href('painel')}><span><small>Revisar</small><b>Painel de metas</b></span>{Icon.arrow}</a>}
      </div>
    </nav>
  )
}
