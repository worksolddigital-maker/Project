import { useRef, type ReactNode, type PointerEvent } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  children: ReactNode
  className?: string
  max?: number
  glare?: boolean
  as?: 'div' | 'article' | 'li'
}

/**
 * Card com inclinação 3D sutil seguindo o ponteiro (perspectiva CSS + brilho).
 * Em telas de toque permanece estático, sem custo de performance.
 */
export function TiltCard({ children, className, max = 8, glare = true, as = 'div' }: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const frame = useRef(0)

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`)
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
    })
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  const Tag = as
  return (
    <Tag
      ref={ref as never}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('group/tilt relative [perspective:1000px]', className)}
    >
      <div
        className="relative h-full rounded-[inherit] transition-transform duration-500 ease-[var(--ease-glass)] [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        {children}
        {glare && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
            style={{
              background:
                'radial-gradient(420px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.35), transparent 45%)',
            }}
          />
        )}
      </div>
    </Tag>
  )
}
