import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { InterLogo } from '@/components/brand/InterLogo'
import { Icon } from '@/components/ui/Icon'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { NAV_ITEMS, preloadRoute } from '@/routes'
import { navTheme, useNavTheme } from '@/lib/navTheme'
import { lockScroll } from '@/lib/smooth'
import { OFFICIAL } from '@/data/sources'
import { cn } from '@/lib/cn'

/** Detecta o tema da seção sob a navbar (atributo data-nav-theme). */
function useThemeProbe(headerRef: React.RefObject<HTMLElement | null>) {
  const location = useLocation()
  useEffect(() => {
    let raf = 0
    const probe = () => {
      raf = 0
      const els = document.elementsFromPoint(window.innerWidth / 2, 44)
      for (const el of els) {
        if (headerRef.current?.contains(el)) continue
        const host = el.closest<HTMLElement>('[data-nav-theme]')
        if (host) {
          navTheme.set(host.dataset.navTheme === 'dark' ? 'dark' : 'light')
          return
        }
      }
      navTheme.set('light')
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(probe)
    }
    schedule()
    const interval = window.setInterval(schedule, 400)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(interval)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [location.pathname, headerRef])
}

export function Navbar() {
  const headerRef = useRef<HTMLElement>(null)
  const theme = useNavTheme()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  useThemeProbe(headerRef)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    lockScroll(true)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const dark = theme === 'dark' && !open

  return (
    <>
      <header
        ref={headerRef}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] px-3 pt-3 sm:px-5 sm:pt-4"
        data-theme={dark ? 'dark' : 'light'}
      >
        <nav
          aria-label="Navegação principal"
          className={cn(
            'pointer-events-auto mx-auto flex max-w-[1240px] items-center justify-between gap-4 rounded-full py-2 pl-5 pr-2 transition-all duration-500 ease-[var(--ease-glass)]',
            scrolled || open ? 'shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]' : '',
            dark
              ? 'bg-white/[0.07] text-white ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150'
              : 'bg-white/65 text-ink ring-1 ring-white/80 backdrop-blur-2xl backdrop-saturate-150',
          )}
          style={{ boxShadow: dark ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'inset 0 1px 0 rgba(255,255,255,1)' }}
        >
          <Link to="/" aria-label="Banco Inter — Início" className="flex shrink-0 items-center gap-2 py-1.5" data-testid="nav-logo">
            <InterLogo tone={dark ? 'white' : 'orange'} className="h-6 w-auto sm:h-7" />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onPointerEnter={() => preloadRoute(item.to)}
                  onFocus={() => preloadRoute(item.to)}
                  className={({ isActive }) =>
                    cn(
                      'relative block rounded-full px-4 py-2.5 text-[0.9rem] font-medium transition-colors',
                      isActive
                        ? dark
                          ? 'text-white'
                          : 'text-ink'
                        : dark
                          ? 'text-white/65 hover:text-white'
                          : 'text-ink/60 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className={cn(
                            'absolute inset-0 -z-10 rounded-full',
                            dark ? 'bg-white/12 ring-1 ring-white/20' : 'bg-white ring-1 ring-ink/5 shadow-sm',
                          )}
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <LiquidButton
              href={OFFICIAL.account}
              variant="orange"
              size="sm"
              className="hidden sm:inline-flex"
              iconRight={<Icon name="arrowUpRight" size={16} />}
            >
              Site oficial
            </LiquidButton>
            <button
              type="button"
              className={cn(
                'grid h-11 w-11 place-items-center rounded-full transition lg:hidden',
                dark ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-ink text-white',
              )}
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              data-testid="mobile-menu-toggle"
            >
              <Icon name={open ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[55] overflow-y-auto bg-cream/80 px-4 pb-10 pt-28 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0, clipPath: 'circle(0% at 92% 4%)' }}
            animate={{ opacity: 1, clipPath: 'circle(150% at 92% 4%)' }}
            exit={{ opacity: 0, clipPath: 'circle(0% at 92% 4%)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            data-lenis-prevent
          >
            <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-inter-400/40 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-inter-200/60 blur-3xl" />
            <ul className="relative mx-auto flex max-w-md flex-col gap-2">
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.to}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-3xl px-6 py-5 font-display text-2xl font-semibold transition',
                        isActive ? 'bg-ink text-white' : 'bg-white/70 text-ink ring-1 ring-white',
                      )
                    }
                  >
                    {item.label}
                    <Icon name="arrowRight" size={22} />
                  </NavLink>
                </motion.li>
              ))}
            </ul>
            <motion.div
              className="relative mx-auto mt-8 flex max-w-md justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <LiquidButton href={OFFICIAL.account} variant="orange" size="lg" iconRight={<Icon name="arrowUpRight" size={18} />}>
                Ir para o site oficial
              </LiquidButton>
            </motion.div>
            <p className="relative mx-auto mt-6 max-w-md text-center text-xs text-ink/50">
              Projeto conceitual · não é o site oficial do Banco Inter.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
