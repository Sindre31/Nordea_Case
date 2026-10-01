// Norwegian (bokmål) display text for the customer-facing explanations.
//
// The data model stays in English (field names, enum codes, raw sector and
// asset type values), so the API contract is unchanged. Only the text a
// customer reads - summaries, labels, assumptions - goes through here.

const nb = 'nb-NO'

// "1 234 567 kr" (absolute value - callers add the sign or wording).
export function kr(value: number): string {
  return `${Math.round(Math.abs(value)).toLocaleString(nb)} kr`
}

// "4,8 %" with an optional explicit sign.
export function pct(value: number, decimals = 1, signed = false): string {
  const text = Math.abs(value).toLocaleString(nb, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const sign = value < 0 ? '-' : signed ? '+' : ''
  return `${sign}${text} %`
}

export function num(value: number, decimals = 1): string {
  return value.toLocaleString(nb, { maximumFractionDigits: decimals })
}

const SECTORS: Record<string, string> = {
  Energy: 'Energi',
  'Consumer Staples': 'Dagligvarer',
  Industrials: 'Industri',
  Technology: 'Teknologi',
  Healthcare: 'Helse',
  Financials: 'Finans',
  Materials: 'Materialer',
  Utilities: 'Forsyning',
  'Consumer Discretionary': 'Forbruksvarer',
  Diversified: 'Brede fond',
  'Government Bonds': 'Statsobligasjoner',
  'Corporate Bonds': 'Selskapsobligasjoner',
  Cash: 'Kontanter',
}

const ASSET_TYPES: Record<string, string> = {
  Equity: 'Aksjer',
  ETF: 'Børshandlede fond',
  'Mutual Fund': 'Verdipapirfond',
  Bond: 'Obligasjoner',
  Cash: 'Kontanter',
}

const GEOGRAPHIES: Record<string, string> = {
  Norway: 'Norge',
  Nordics: 'Norden',
  Sweden: 'Sverige',
  Denmark: 'Danmark',
  Finland: 'Finland',
  Europe: 'Europa',
  'United States': 'USA',
  'Asia Pacific': 'Asia og Stillehavet',
  'Emerging Markets': 'Fremvoksende markeder',
  Global: 'Global',
}

const PROFILES: Record<string, string> = {
  Conservative: 'Forsiktig',
  Moderate: 'Moderat',
  Balanced: 'Balansert',
  Growth: 'Vekst',
  Aggressive: 'Offensiv',
}

export const sectorName = (s: string) => SECTORS[s] ?? s
export const assetTypeName = (s: string) => ASSET_TYPES[s] ?? s
export const geographyName = (s: string) => GEOGRAPHIES[s] ?? s
export const profileName = (s: string) => PROFILES[s] ?? s

// Instrument names are product names and stay as they are. The "(Fictional)"
// marker is dropped: the whole app is labelled as fictional data.
export function instrumentName(name: string): string {
  return name.replace(' (Fictional)', '').replace('Cash (NOK)', 'Kontanter (NOK)')
}

// "9. juni 2026"
export function dateName(isoDate: string): string {
  return new Intl.DateTimeFormat(nb, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`))
}

// "10-20 years" -> "10–20 år"
export function horizonName(horizon: string): string {
  return horizon.replace(/(\d+)-(\d+)/, '$1–$2').replace('years', 'år')
}
