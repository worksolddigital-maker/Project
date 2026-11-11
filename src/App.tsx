import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Cursor } from './components/Cursor'
import { PageView } from './components/PageView'
import { PrintAll } from './components/PrintAll'
import { Drawer, TopBar } from './components/Shell'
import { pageById, pageIndex, pages } from './content'
import { ScrollTrigger, scrollToTop, startLenis, stopLenis } from './lib/motion'
import { navigate, useRoute } from './lib/router'
import { actions } from './lib/store'

const EASE = [0.76, 0, 0.24, 1] as const

export default function App() {
  const route = useRoute()
  const reduced = useReducedMotion()
  const [menu, setMenu] = useState(false)
  const isPrint = route.page === 'imprimir'
  const page = pageById.get(route.page) ?? pages[0]
  const closeMenu = useCallback(() => setMenu(false), [])

  // Rolagem suave: desligada com movimento reduzido e na versão de impressão
  useEffect(() => {
    if (reduced || isPrint) { stopLenis(); return }
    startLenis()
    return stopLenis
  }, [reduced, isPrint])

  useEffect(() => {
    if (isPrint) { scrollToTop(); document.title = 'RECOMEÇO — versão para impressão'; return }
    actions.visit(page.id)
    document.title = page.special === 'capa' ? 'RECOMEÇO — A construção de uma nova versão de si' : `${page.title} · RECOMEÇO`
  }, [page, isPrint])

  // Rota desconhecida → capa
  useEffect(() => { if (!isPrint && !pageById.has(route.page)) navigate('capa') }, [route.page, isPrint])

  // Setas do teclado avançam e voltam (fora de campos de texto e de componentes com setas próprias)
  useEffect(() => {
    if (isPrint) return
    const key = (e: KeyboardEvent) => {
      if (menu || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable], [role="tablist"], [role="dialog"]')) return
      const i = pageIndex(page.id)
      if (e.key === 'ArrowRight' && pages[i + 1]) navigate(pages[i + 1].id)
      if (e.key === 'ArrowLeft' && pages[i - 1]) navigate(pages[i - 1].id)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [page.id, menu, isPrint])

  if (isPrint) return <PrintAll />

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#conteudo" onClick={(e) => { e.preventDefault(); document.querySelector<HTMLElement>('[data-page-title]')?.focus() }}>Pular para o conteúdo</a>
      <Cursor />
      <TopBar page={page} onMenu={() => setMenu(true)} />
      <Drawer open={menu} onClose={closeMenu} current={page} />
      <main id="conteudo">
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => ScrollTrigger.refresh()}>
          <motion.div key={page.id} className="stage" initial="enter" animate="in" exit="out">
            {/* Transição cinematográfica: cortina que cobre de baixo para cima e revela a nova página */}
            {!reduced && (
              <motion.div
                className="curtain no-print" aria-hidden="true"
                variants={{
                  enter: { scaleY: 1, originY: 0 },
                  in: { scaleY: 0, originY: 0, transition: { duration: 0.8, ease: EASE, delay: 0.05 } },
                  out: { scaleY: 1, originY: 1, transition: { duration: 0.5, ease: EASE } },
                }}
              ><span>RECOME<i>ÇO</i></span></motion.div>
            )}
            <motion.div
              variants={{
                enter: { opacity: 0 },
                in: { opacity: 1, transition: { duration: reduced ? 0.25 : 0.01 } },
                out: { opacity: reduced ? 0 : 1, transition: { duration: reduced ? 0.15 : 0.5 } },
              }}
            >
              <PageView page={page} anchor={route.anchor} />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  )
}
