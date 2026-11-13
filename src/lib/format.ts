const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatBRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0)
export const formatBRL0 = (v: number) => brlCompact.format(Number.isFinite(v) ? v : 0)
export const formatPct = (v: number) => `${pct.format(v)}%`

/** Converte texto digitado ("R$ 12.500,90") em número. */
export function parseBRL(input: string): number {
  const digits = input.replace(/[^\d,]/g, '').replace(',', '.')
  const n = Number.parseFloat(digits)
  return Number.isFinite(n) ? n : 0
}
