import { Suspense, useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { PageLoader } from './PageLoader'
import { scrollToY } from '@/lib/smooth'
import { ScrollTrigger } from '@/lib/gsap'
import { preloadAllRoutes } from '@/routes'

const TITLES: Record<string, string> = {
  '/': 'Início',
  '/cartoes': 'Cartões Inter',
  '/shopping': 'Inter Shop',
  '/emprestimos': 'Empréstimos',
  '/investimentos': 'Investimentos',
  '/sobre': 'Sobre o Inter',
}

export function Layout() {
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    // Pré-carrega as demais páginas quando o navegador estiver ocioso
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    const id = w.requestIdleCallback ? w.requestIdleCallback(preloadAllRoutes) : window.setTimeout(preloadAllRoutes, 2500)
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id)
    }
  }, [])

  useEffect(() => {
    const t = TITLES[location.pathname] ?? 'Página não encontrada'
    document.title = `${t} · Banco Inter — Experiência 3D (conceito)`
  }, [location.pathname])

  return (
    <>
      <a
        href="#conteudo"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <Navbar />
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          scrollToY(0, true)
        }}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
          exit={{ opacity: 0, y: -16, filter: 'blur(10px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => ScrollTrigger.refresh()}
        >
          <main id="conteudo">
            <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
          </main>
          <Footer />
        </motion.div>
      </AnimatePresence>
    </>
  )
}
