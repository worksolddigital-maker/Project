import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

export interface AccordionItem {
  q: string
  a: string
}

export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0)
  const base = useId()
  return (
    <div className={cn('divide-y divide-ink/10 rounded-3xl bg-white/70 ring-1 ring-ink/5 backdrop-blur', className)}>
      {items.map((item, i) => {
        const isOpen = open === i
        const panelId = `${base}-p-${i}`
        return (
          <div key={item.q}>
            <h3 className="m-0 font-sans text-base tracking-normal">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-center justify-between gap-6 px-5 py-5 text-left font-semibold text-ink transition-colors hover:text-inter-600 sm:px-7"
              >
                <span>{item.q}</span>
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-inter-50 text-inter-600 ring-1 ring-inter-200 transition-transform duration-500',
                    isOpen && 'rotate-180 bg-inter-500 text-white ring-inter-500',
                  )}
                >
                  <Icon name="chevronDown" size={18} />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-6 leading-relaxed text-ink/70 sm:px-7">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
