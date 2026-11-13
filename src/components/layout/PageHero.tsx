import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface Props {
  kicker: string
  title: ReactNode
  subtitle: ReactNode
  actions?: ReactNode
  visual?: ReactNode
  tone?: 'light' | 'dark'
  className?: string
  children?: ReactNode
}

const ease = [0.22, 1, 0.36, 1] as const

/** Herói padrão das páginas internas: texto à esquerda + elemento 3D à direita. */
export function PageHero({ kicker, title, subtitle, actions, visual, tone = 'light', className, children }: Props) {
  const dark = tone === 'dark'
  return (
    <section
      data-nav-theme={tone}
      className={cn(
        'noise relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:min-h-[100svh] lg:pb-20 lg:pt-36',
        dark ? 'bg-night text-white' : 'bg-cream text-ink',
        className,
      )}
    >
      {dark ? (
        <>
          <div className="pointer-events-none absolute -right-40 top-0 h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.35),transparent_65%)]" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(255,160,80,0.18),transparent_65%)]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -right-48 -top-40 h-[52rem] w-[52rem] animate-drift rounded-full bg-[radial-gradient(circle,rgba(255,122,0,0.45),rgba(255,140,40,0.15)_40%,transparent_68%)]" />
          <div className="pointer-events-none absolute -bottom-56 -left-40 h-[40rem] w-[40rem] animate-drift rounded-full bg-[radial-gradient(circle,rgba(255,180,110,0.35),transparent_65%)] [animation-delay:-8s]" />
        </>
      )}
      <div className="container-x relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className={cn(
              'mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] ring-1 backdrop-blur',
              dark ? 'bg-white/10 text-inter-300 ring-white/15' : 'bg-white/70 text-inter-700 ring-white',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-inter-500" />
            {kicker}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.05, ease }}
            className="text-balance font-display text-[clamp(2.5rem,5.4vw,4.7rem)] font-bold leading-[0.95] tracking-[-0.04em]"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease }}
            className={cn('mt-6 max-w-xl text-balance text-lg leading-relaxed', dark ? 'text-white/70' : 'text-ink/65')}
          >
            {subtitle}
          </motion.p>
          {actions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease }}
              className="mt-8 flex flex-wrap gap-3"
            >
              {actions}
            </motion.div>
          )}
          {children}
        </div>
        {visual && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.1, ease }}
            className="relative h-[52vw] max-h-[560px] min-h-[300px] w-full lg:h-[62vh]"
          >
            {visual}
          </motion.div>
        )}
      </div>
    </section>
  )
}
