// Norwegian display names for the English codes in the data model.
// Mirrors api/src/services/locale.ts.
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
  Germany: 'Tyskland',
  'United Kingdom': 'Storbritannia',
  Netherlands: 'Nederland',
}

const PROFILES: Record<string, string> = {
  Conservative: 'Forsiktig',
  Moderate: 'Moderat',
  Balanced: 'Balansert',
  Growth: 'Vekst',
  Aggressive: 'Offensiv',
}

const RISK_CATEGORIES: Record<string, string> = { Low: 'Lav', Medium: 'Middels', High: 'Høy' }

const ALIGNMENTS: Record<string, string> = {
  Aligned: 'I tråd med profilen',
  'More conservative than profile': 'Mer forsiktig enn profilen',
  'More aggressive than profile': 'Mer offensiv enn profilen',
}

export const sectorName = (s: string) => SECTORS[s] ?? s
export const assetTypeName = (s: string) => ASSET_TYPES[s] ?? s
export const geographyName = (s: string) => GEOGRAPHIES[s] ?? s
export const profileName = (s: string) => PROFILES[s] ?? s
export const riskCategoryName = (s: string) => RISK_CATEGORIES[s] ?? s
export const alignmentName = (s: string) => ALIGNMENTS[s] ?? s

// "10-20 years" -> "10–20 år"
export function horizonName(horizon: string): string {
  return horizon.replace(/(\d+)-(\d+)/, '$1–$2').replace('years', 'år')
}

// Product names stay as they are. The "(Fictional)" marker is dropped: the
// whole app is labelled as fictional data.
export function instrumentName(name: string): string {
  return name.replace(' (Fictional)', '').replace('Cash (NOK)', 'Kontanter (NOK)')
}
