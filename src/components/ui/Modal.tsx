import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './Icon'
import { lockScroll } from '@/lib/smooth'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  kicker?: string
  children: ReactNode
  labelledBy?: string
}

/** Painel de detalhes acessível (Esc fecha, foco gerenciado, scroll travado). */
export function Modal({ open, onClose, title, kicker, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement as HTMLElement
    lockScroll(true)
    const t = window.setTimeout(() => panelRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      lockScroll(false)
      lastFocus.current?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="modal-backdrop"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            data-lenis-prevent
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel relative max-h-[88dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-b-none bg-white/90 p-6 outline-none sm:rounded-[28px] sm:p-9"
          >
            <div className="mb-6 flex items-start justify-between gap-6">
              <div>
                {kicker && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-inter-600">{kicker}</p>
                )}
                <h2 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                data-testid="modal-close"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink/5 text-ink transition hover:rotate-90 hover:bg-inter-500 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
