export function formatCurrency(value: number, currency = 'NOK'): string {
  return `${Math.round(value).toLocaleString('en-US')} ${currency}`
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}%`
}

// Compact money for chart axes and tight spaces: 1.2M, 340k.
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`
  return `${sign}${Math.round(abs)}`
}

// Signed money: "+12,375 NOK" / "-5,913 NOK".
export function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}
