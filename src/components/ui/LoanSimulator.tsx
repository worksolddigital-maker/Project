import { useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SIMULATOR_PRESETS, type SimulatorPreset } from '@/data/loans'
import { formatBRL, formatBRL0, formatPct } from '@/lib/format'
import { Disclaimer } from './Disclaimer'
import { Pill } from './Pill'
import { cn } from '@/lib/cn'

/** Parcela pela Tabela Price. */
export function pricePayment(pv: number, monthlyRatePct: number, n: number) {
  const i = monthlyRatePct / 100
  if (n <= 0) return 0
  if (i === 0) return pv / n
  return (pv * i) / (1 - Math.pow(1 + i, -n))
}

function balanceAt(pv: number, i: number, pmt: number, k: number) {
  if (i === 0) return Math.max(0, pv - pmt * k)
  const f = Math.pow(1 + i, k)
  return Math.max(0, pv * f - (pmt * (f - 1)) / i)
}

function BalanceChart({ pv, rate, n, pmt }: { pv: number; rate: number; n: number; pmt: number }) {
  const gid = useId().replace(/:/g, '')
  const W = 560
  const H = 200
  const pts = useMemo(() => {
    const steps = Math.min(n, 60)
    const arr: [number, number][] = []
    for (let s = 0; s <= steps; s++) {
      const k = Math.round((s / steps) * n)
      arr.push([k, balanceAt(pv, rate / 100, pmt, k)])
    }
    return arr
  }, [pv, rate, n, pmt])
  const x = (k: number) => (k / n) * W
  const y = (v: number) => H - (v / pv) * (H - 12) - 4
  const line = pts.map(([k, v], i) => `${i ? 'L' : 'M'}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${W} ${H} L0 ${H} Z`
  return (
    <figure className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Gráfico do saldo devedor ao longo do prazo">
        <defs>
          <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF7A00" stopOpacity="0.35" />
            <stop offset="1" stopColor="#FF7A00" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="currentColor" strokeOpacity="0.07" />
        ))}
        <motion.path d={area} fill={`url(#${gid}-a)`} initial={false} animate={{ d: area }} transition={{ duration: 0.5 }} />
        <motion.path d={line} fill="none" stroke="#FF7A00" strokeWidth="3" strokeLinecap="round" initial={false} animate={{ d: line }} transition={{ duration: 0.5 }} />
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-ink/45">
        <span>Mês 0 · {formatBRL0(pv)}</span>
        <span>Saldo devedor</span>
        <span>Mês {n} · R$ 0</span>
      </figcaption>
    </figure>
  )
}

export function LoanSimulator() {
  const [presetId, setPresetId] = useState(SIMULATOR_PRESETS[0].id)
  const preset = SIMULATOR_PRESETS.find((p) => p.id === presetId) as SimulatorPreset
  const [amount, setAmount] = useState(preset.defaultAmount)
  const [term, setTerm] = useState(preset.defaultTerm)
  const [rate, setRate] = useState(preset.rate)

  const choose = (p: SimulatorPreset) => {
    setPresetId(p.id)
    setAmount(p.defaultAmount)
    setTerm(p.defaultTerm)
    setRate(p.rate)
  }

  const safeAmount = Math.min(preset.maxAmount, Math.max(preset.minAmount, amount || preset.minAmount))
  const pmt = pricePayment(safeAmount, rate, term)
  const total = pmt * term
  const interest = total - safeAmount
  const annual = (Math.pow(1 + rate / 100, 12) - 1) * 100
  const amountFill = ((safeAmount - preset.minAmount) / (preset.maxAmount - preset.minAmount)) * 100
  const rateFill = ((rate - preset.rateMin) / (preset.rateMax - preset.rateMin)) * 100
  const official = preset.rateKind === 'official-from' && Math.abs(rate - preset.rate) < 0.001

  return (
    <div className="glass-panel p-5 sm:p-9" data-testid="loan-simulator">
      <div role="radiogroup" aria-label="Modalidade da simulação" className="flex flex-wrap gap-2">
        {SIMULATOR_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === presetId}
            onClick={() => choose(p)}
            data-testid={`preset-${p.id}`}
            className={cn(
              'rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition',
              p.id === presetId
                ? 'bg-ink text-white ring-ink'
                : 'bg-white/70 text-ink/65 ring-ink/10 hover:text-ink hover:ring-ink/20',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="grid gap-8">
          {/* valor */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <label htmlFor="sim-amount" className="text-sm font-medium text-ink/60">
                Valor desejado
              </label>
              <span className="text-xs text-ink/40">
                {formatBRL0(preset.minAmount)} – {formatBRL0(preset.maxAmount)}
              </span>
            </div>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display font-semibold text-ink/40">R$</span>
              <input
                id="sim-amount"
                type="number"
                inputMode="numeric"
                min={preset.minAmount}
                max={preset.maxAmount}
                step={preset.step}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                onBlur={() => setAmount(safeAmount)}
                className="glass-input pl-12 text-xl"
                data-testid="sim-amount"
              />
            </div>
            <input
              type="range"
              min={preset.minAmount}
              max={preset.maxAmount}
              step={preset.step}
              value={safeAmount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="range mt-5"
              style={{ ['--fill' as string]: `${amountFill}%` }}
              aria-label="Ajustar valor desejado"
              data-testid="sim-amount-range"
            />
          </div>

          {/* prazo */}
          <fieldset>
            <legend className="text-sm font-medium text-ink/60">Prazo (meses)</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {preset.terms.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  aria-pressed={t === term}
                  data-testid={`term-${t}`}
                  className={cn(
                    'min-w-14 rounded-xl px-3 py-2 font-display text-sm font-semibold ring-1 transition',
                    t === term
                      ? 'bg-gradient-to-b from-inter-400 to-inter-600 text-white shadow-[0_8px_18px_-8px_rgba(255,122,0,0.8)] ring-inter-500'
                      : 'bg-white/70 text-ink/70 ring-ink/10 hover:ring-inter-300',
                  )}
                >
                  {t}x
                </button>
              ))}
            </div>
          </fieldset>

          {/* taxa */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="sim-rate" className="text-sm font-medium text-ink/60">
                Taxa de juros mensal: <strong className="text-ink">{formatPct(rate)} a.m.</strong>
              </label>
              {official ? <Pill>Mínima divulgada (“a partir de”)</Pill> : <Pill tone="white">Taxa hipotética</Pill>}
            </div>
            <input
              id="sim-rate"
              type="range"
              min={preset.rateMin}
              max={preset.rateMax}
              step={0.01}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="range mt-5"
              style={{ ['--fill' as string]: `${rateFill}%` }}
              data-testid="sim-rate"
            />
            <p className="mt-3 text-xs leading-relaxed text-ink/50">{preset.rateNote}</p>
          </div>
        </div>

        {/* resultado */}
        <div className="rounded-[24px] bg-night p-6 text-white sm:p-8" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Parcela estimada</p>
          <motion.p
            key={Math.round(pmt)}
            initial={{ opacity: 0.4, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 font-display text-4xl font-bold tracking-tight text-inter-300 sm:text-5xl"
            data-testid="sim-payment"
          >
            {formatBRL(pmt)}
          </motion.p>
          <p className="mt-1 text-sm text-white/50">em {term}x mensais (Tabela Price)</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-sm">
            <div>
              <dt className="text-white/45">Valor solicitado</dt>
              <dd className="mt-1 font-display text-lg font-semibold">{formatBRL(safeAmount)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Total estimado</dt>
              <dd className="mt-1 font-display text-lg font-semibold" data-testid="sim-total">{formatBRL(total)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Juros estimados</dt>
              <dd className="mt-1 font-display text-lg font-semibold">{formatBRL(interest)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Taxa anual equivalente</dt>
              <dd className="mt-1 font-display text-lg font-semibold">{formatPct(annual)} a.a.</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-2xl bg-white/[0.04] p-4 text-white ring-1 ring-white/10">
            <BalanceChart pv={safeAmount} rate={rate} n={term} pmt={pmt} />
          </div>
        </div>
      </div>

      <Disclaimer className="mt-8" title="Simulação ilustrativa">
        Os valores são estimativas educativas calculadas pela Tabela Price e não constituem oferta de crédito. Não incluem
        IOF, tarifas, seguros, correção por IPCA nem o Custo Efetivo Total (CET). As condições reais dependem da análise de
        crédito e da oferta disponibilizada pelo Inter no momento da contratação.
      </Disclaimer>
    </div>
  )
}
