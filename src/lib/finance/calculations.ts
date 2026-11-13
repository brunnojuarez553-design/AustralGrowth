export interface FinanceEntry {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'ADVANCE' | 'PENDING'
  category: string
  description: string
  amount: number
  currency: string
  date: string | Date
  isPaid: boolean
}
export interface FinancePeriod { year: number; month?: number }
export function periodBounds({ year, month }: FinancePeriod) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999 || (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12))) throw new Error('Período inválido')
  return { start: new Date(Date.UTC(year, month ? month - 1 : 0, 1)), end: new Date(Date.UTC(year, month ?? 12, 1)) }
}
export function inPeriod(entry: FinanceEntry, period: FinancePeriod) {
  const { start, end } = periodBounds(period)
  const time = new Date(entry.date).getTime()
  return time >= start.getTime() && time < end.getTime()
}
// One row represents one installment, never an invoice plus inferred payments.
// PENDING remains pending even when legacy records have isPaid=true.
export function summarize(entries: readonly FinanceEntry[], currency = 'USD') {
  let billed = 0, collected = 0, pending = 0, expenses = 0, unpaidExpenses = 0
  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    if (entry.currency !== currency) continue
    const cents = Math.round(Number(entry.amount) * 100)
    if (!Number.isFinite(cents)) throw new Error('Importe inválido')
    if (entry.type === 'EXPENSE') {
      if (entry.isPaid) expenses += cents
      else unpaidExpenses += cents
    } else {
      billed += cents
      if (entry.type !== 'PENDING' && entry.isPaid) collected += cents
      else pending += cents
    }
  }
  return { billed: billed / 100, collected: collected / 100, pending: pending / 100, expenses: expenses / 100, unpaidExpenses: unpaidExpenses / 100, netCash: (collected - expenses) / 100, margin: collected ? (collected - expenses) / collected * 100 : 0 }
}
export function annualProjection(entries: readonly FinanceEntry[], year: number, currency = 'USD', now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => Number(today.find(p => p.type === type)?.value)
  const currentYear = part('year')
  if (year > currentYear) return null
  const actual = entries.filter(e => e.currency === currency && inPeriod(e, { year }) && new Date(e.date).toISOString().slice(0, 10) <= `${currentYear}-${String(part('month')).padStart(2, '0')}-${String(part('day')).padStart(2, '0')}`)
  if (!actual.length) return null
  const collected = summarize(actual, currency).collected
  return year < currentYear ? collected : Math.round(collected / part('month') * 12 * 100) / 100
}
export function chartSeries(entries: readonly FinanceEntry[], period: FinancePeriod, currency: string) {
  const count = period.month ? new Date(Date.UTC(period.year, period.month, 0)).getUTCDate() : 12
  return Array.from({ length: count }, (_, i) => {
    const rows = entries.filter(e => inPeriod(e, period) && (period.month ? new Date(e.date).getUTCDate() === i + 1 : new Date(e.date).getUTCMonth() === i))
    const summary = summarize(rows, currency)
    return { month: period.month ? String(i + 1) : new Date(Date.UTC(period.year, i, 1)).toLocaleDateString('es', { month: 'short', timeZone: 'UTC' }), Cobrado: summary.collected, Gastos: summary.expenses }
  })
}
