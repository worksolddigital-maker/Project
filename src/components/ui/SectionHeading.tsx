import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Reveal } from './Reveal'

interface Props {
  kicker?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
  className?: string
  id?: string
}

export function SectionHeading({ kicker, title, subtitle, align = 'left', tone = 'light', className, id }: Props) {
  const dark = tone === 'dark'
  return (
    <Reveal className={cn(align === 'center' && 'mx-auto text-center', 'max-w-3xl', className)}>
      {kicker && (
        <p
          className={cn(
            'mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
            dark ? 'bg-white/10 text-inter-300' : 'bg-inter-100/80 text-inter-700',
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-inter-500" />
          {kicker}
        </p>
      )}
      <h2
        id={id}
        className={cn(
          'text-balance text-3xl font-semibold leading-[1.08] sm:text-4xl lg:text-5xl',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-5 text-base leading-relaxed sm:text-lg', dark ? 'text-white/70' : 'text-ink/65')}>
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}
