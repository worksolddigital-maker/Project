import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Pill({ children, tone = 'orange', className }: { children: ReactNode; tone?: 'orange' | 'ink' | 'white' | 'glass'; className?: string }) {
  const tones = {
    orange: 'bg-inter-100 text-inter-700 ring-inter-200',
    ink: 'bg-ink text-white ring-ink',
    white: 'bg-white text-ink ring-ink/10',
    glass: 'bg-white/10 text-white ring-white/15 backdrop-blur',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1', tones[tone], className)}>
      {children}
    </span>
  )
}
