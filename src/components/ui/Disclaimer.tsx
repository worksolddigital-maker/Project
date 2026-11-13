import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'

interface Props {
  children: ReactNode
  tone?: 'light' | 'dark'
  className?: string
  title?: string
}

/** Aviso padronizado para separar conteúdo ilustrativo de condições comerciais reais. */
export function Disclaimer({ children, tone = 'light', className, title = 'Importante' }: Props) {
  return (
    <aside
      role="note"
      className={cn(
        'flex gap-3 rounded-2xl p-4 text-sm leading-relaxed sm:p-5',
        tone === 'dark'
          ? 'bg-white/[0.06] text-white/70 ring-1 ring-white/10'
          : 'bg-inter-50 text-ink/70 ring-1 ring-inter-200/70',
        className,
      )}
    >
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-inter-500" />
      <div>
        <strong className={cn('font-semibold', tone === 'dark' ? 'text-white' : 'text-ink')}>{title}: </strong>
        {children}
      </div>
    </aside>
  )
}
