import { forwardRef, type ReactNode, type PointerEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export type LiquidVariant = 'glass' | 'light' | 'orange'
export type LiquidSize = 'sm' | 'md' | 'lg' | 'icon'

interface BaseProps {
  variant?: LiquidVariant
  size?: LiquidSize
  className?: string
  children?: ReactNode
  iconLeft?: ReactNode
  iconRight?: ReactNode
  'aria-label'?: string
  'data-testid'?: string
}

type ButtonProps = BaseProps & {
  to?: undefined
  href?: undefined
  type?: 'button' | 'submit'
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  'aria-pressed'?: boolean
  'aria-expanded'?: boolean
  'aria-controls'?: string
}
type RouteProps = BaseProps & { to: string; href?: undefined; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }
type ExternalProps = BaseProps & { href: string; to?: undefined; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }

export type LiquidButtonProps = ButtonProps | RouteProps | ExternalProps

const VARIANT: Record<LiquidVariant, string> = {
  glass: '',
  light: 'lg-light',
  orange: 'lg-orange',
}
const SIZE: Record<LiquidSize, string> = {
  sm: 'lg-sm',
  md: 'lg-md',
  lg: 'lg-lg',
  icon: 'lg-icon',
}

/** Atualiza a posição do reflexo especular conforme o ponteiro. */
function trackPointer(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * 100
  el.style.setProperty('--mx', `${Math.max(8, Math.min(92, x)).toFixed(1)}%`)
}
function resetPointer(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--mx', '24%')
}

/**
 * Botão Liquid Glass reutilizável.
 * - `to` → navegação interna (React Router)
 * - `href` → link externo (nova aba, com rel seguro)
 * - nenhum → <button>
 */
export const LiquidButton = forwardRef<HTMLElement, LiquidButtonProps>(function LiquidButton(props, ref) {
  const { variant = 'glass', size = 'md', className, children, iconLeft, iconRight } = props
  const cls = cn('lg', VARIANT[variant], SIZE[size], className)
  const inner = (
    <>
      <span className="lg-sheen" aria-hidden="true" />
      <span className="lg-label">
        {iconLeft}
        {children}
        {iconRight}
      </span>
    </>
  )
  const common = {
    className: cls,
    onPointerMove: trackPointer,
    onPointerLeave: resetPointer,
    'aria-label': props['aria-label'],
    'data-testid': props['data-testid'],
  }

  if ('to' in props && props.to !== undefined) {
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} to={props.to} onClick={props.onClick} {...common}>
        {inner}
      </Link>
    )
  }
  if ('href' in props && props.href !== undefined) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={props.onClick}
        {...common}
      >
        {inner}
      </a>
    )
  }
  const b = props as ButtonProps
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={b.type ?? 'button'}
      onClick={b.onClick}
      disabled={b.disabled}
      aria-pressed={b['aria-pressed']}
      aria-expanded={b['aria-expanded']}
      aria-controls={b['aria-controls']}
      {...common}
    >
      {inner}
    </button>
  )
})
