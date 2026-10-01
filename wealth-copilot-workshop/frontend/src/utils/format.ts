// Norwegian (bokmål) number formatting: "1 234 567 kr", "4,8 %".
// Negative numbers use a plain hyphen-minus so they read the same everywhere.
const nb = 'nb-NO'

function plain(value: number, decimals: number): string {
  const text = Math.abs(value).toLocaleString(nb, { minimumFractionDigits: 0, maximumFractionDigits: decimals })
  return value < 0 && text !== '0' ? `-${text}` : text
}

export function formatNumber(value: number, decimals = 0): string {
  return plain(value, decimals)
}

export function formatCurrency(value: number, currency = 'kr'): string {
  return `${plain(Math.round(value), 0)} ${currency}`
}

// Signed money: "+12 375 kr" / "-5 913 kr".
export function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`
}

// "4,8 %"; with signed=true "+4,8 %".
export function formatPct(value: number, decimals = 1, signed = false): string {
  const fixed = Number(value.toFixed(decimals))
  const text = Math.abs(fixed).toLocaleString(nb, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const sign = fixed < 0 ? '-' : signed ? '+' : ''
  return `${sign}${text} %`
}

export function formatPercentage(value: number): string {
  return formatPct(value, 1, true)
}

// Compact money for chart axes and tight spaces: "1,3 mill.", "340k".
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString(nb, { maximumFractionDigits: abs >= 10_000_000 ? 0 : 1 })} mill.`
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`
  return `${sign}${Math.round(abs)}`
}

// "9. juni 2026"
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat(nb, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
}

// "9. jun."
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat(nb, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
}
