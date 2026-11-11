import { motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { gsap, prefersReduced } from '../lib/motion'

export const Icon = {
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  arrow: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  menu: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h11M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  grid: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  chart: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  print: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2M7 14h10v6H7z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
}

/** Caixa de seleção animada (Motion): o traço do "check" é desenhado e o rótulo ganha destaque. */
export function CheckBox({ checked, onChange, children, id }: { checked: boolean; onChange: () => void; children: ReactNode; id?: string }) {
  return (
    <label className={`check ${checked ? 'is-on' : ''}`}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="check__box" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      </span>
      <span className="check__label">{children}</span>
    </label>
  )
}

/** Anel de progresso em SVG; o traço é animado pelo GSAP quando o valor muda. */
export function Ring({ value, size = 132, stroke = 8, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ref = useRef<SVGCircleElement>(null)
  const v = Math.max(0, Math.min(1, value))
  useEffect(() => {
    if (!ref.current) return
    const to = c * (1 - v)
    if (prefersReduced()) { gsap.set(ref.current, { strokeDashoffset: to }); return }
    const tw = gsap.to(ref.current, { strokeDashoffset: to, duration: 1.1, ease: 'power3.out' })
    return () => { tw.kill() }
  }, [v, c])
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle ref={ref} className="ring__value" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring__inner">{children}</div>
    </div>
  )
}

/** Barra de progresso horizontal com transição suave. */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <motion.div className="meter__fill" initial={false} animate={{ scaleX: v }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  )
}

/** Botão magnético: segue o ponteiro com gsap.quickTo (apenas ponteiro fino e sem movimento reduzido). */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced() || !window.matchMedia('(pointer: fine)').matches) return
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect()
      x((e.clientX - (b.left + b.width / 2)) * strength)
      y((e.clientY - (b.top + b.height / 2)) * strength)
    }
    const leave = () => { x(0); y(0) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      gsap.killTweensOf(el)
    }
  }, [strength])
  return <span ref={ref} className="magnetic">{children}</span>
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
