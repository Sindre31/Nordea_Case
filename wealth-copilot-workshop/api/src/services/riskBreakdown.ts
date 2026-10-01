// Case B - "Where does my risk come from?"
//
// Turns the abstract risk score into things a customer can relate to:
//   - typical yearly swings of the portfolio, compared with the band that
//     fits the customer's risk profile,
//   - how much each holding / sector / region CONTRIBUTES to those swings
//     (share of risk vs. share of money - the key "aha" for Jonas),
//   - what a bad month could look like in NOK,
//   - simple stress tests ("what if tech falls 25%?"),
//   - how the mix has drifted from price movements alone.
//
// Method: each holding's own swings are measured from its price history.
// How holdings move TOGETHER is set by transparent rules of thumb (same
// sector moves strongly together, shares and bonds barely do), because the
// synthetic market data is generated independently per instrument and would
// otherwise make every multi-stock portfolio look unrealistically safe.
// Educational model only - not a real risk or suitability assessment.
import { getCustomer, getInvestmentsFor, getMarketDataFor } from '../data.js'
import type { Investment } from '../types.js'
import { aggregateByTicker, priceOn } from './attribution.js'
import { isEquityLike, profileAssumption, round } from './assumptions.js'
import { assetTypeName, dateName, geographyName, instrumentName, kr, pct, profileName, sectorName } from './locale.js'

const TRADING_DAYS = 252
const MONTH_DAYS = 21
// One-sided 95% z-score: a loss at least this bad in about 1 of 20 months.
const Z_BAD_MONTH = 1.645

export interface RiskContributionRow {
  ticker: string
  name: string
  asset_type: string
  sector: string
  geography: string
  value: number
  weight_pct: number
  own_volatility_pct: number
  risk_contribution_pct: number
}

export interface GroupRisk {
  label: string
  weight_pct: number
  risk_contribution_pct: number
}

export interface StressTest {
  id: string
  name: string
  description: string
  impact_value: number
  impact_pct: number
}

export interface RiskExplanation {
  customer_id: string
  total_value: number
  portfolio_volatility_pct: number
  risk_profile: string
  profile_band_pct: { min: number; max: number }
  profile_description: string
  alignment: 'within' | 'above' | 'below'
  equity_share_pct: number
  profile_equity_share_pct: number
  contributions: RiskContributionRow[]
  by_sector: GroupRisk[]
  by_geography: GroupRisk[]
  by_asset_type: GroupRisk[]
  bad_month: { loss_value: number; loss_pct: number; frequency: string }
  stress_tests: StressTest[]
  drift: { since: string; rows: { label: string; start_pct: number; now_pct: number }[] }
  what_if: { description: string; new_volatility_pct: number; new_bad_month_loss: number } | null
  summary: string[]
  data_quality: { assumptions: string[]; limitations: string[] }
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
}

const NORDIC = new Set(['Norway', 'Nordics', 'Sweden', 'Denmark', 'Finland'])

// Rule-of-thumb correlation between two holdings. Shown to the customer as
// "how strongly do these tend to move together".
export function assumedCorrelation(a: Investment, b: Investment): number {
  if (a.ticker === b.ticker) return 1
  const aEq = isEquityLike(a.asset_type, a.sector)
  const bEq = isEquityLike(b.asset_type, b.sector)
  if (a.asset_type === 'Cash' || b.asset_type === 'Cash') return 0
  if (!aEq && !bEq) return 0.6
  if (aEq !== bEq) return 0.1
  let rho = 0.5
  const broad = a.sector === 'Diversified' || b.sector === 'Diversified'
  if (!broad && a.sector === b.sector) rho += 0.3
  if (broad) rho += 0.15
  if (a.geography === b.geography || (NORDIC.has(a.geography) && NORDIC.has(b.geography))) rho += 0.1
  return Math.min(0.9, rho)
}

// Daily volatility (as a fraction) per holding, from its own price history.
function dailyVol(h: Investment): number {
  if (h.asset_type === 'Cash') return 0
  return stdDev(getMarketDataFor(h.ticker).map((p) => p.daily_return / 100))
}

interface RiskModel {
  volAnnualPct: number
  contributionsPct: number[]
}

function riskModel(holdings: Investment[], values: number[]): RiskModel {
  const total = values.reduce((a, b) => a + b, 0)
  if (total <= 0) return { volAnnualPct: 0, contributionsPct: holdings.map(() => 0) }
  const w = values.map((v) => v / total)
  const vols = holdings.map(dailyVol)
  const n = holdings.length
  // (Sigma w)_i
  const sigmaW = holdings.map((hi, i) => {
    let s = 0
    for (let j = 0; j < n; j += 1) s += assumedCorrelation(hi, holdings[j]) * vols[i] * vols[j] * w[j]
    return s
  })
  const variance = w.reduce((s, wi, i) => s + wi * sigmaW[i], 0)
  const contributions = w.map((wi, i) => (variance > 0 ? ((wi * sigmaW[i]) / variance) * 100 : 0))
  return { volAnnualPct: Math.sqrt(Math.max(variance, 0)) * Math.sqrt(TRADING_DAYS) * 100, contributionsPct: contributions }
}

function badMonthLoss(volAnnualPct: number, total: number): { pct: number; value: number } {
  const monthlyVol = (volAnnualPct / 100) * Math.sqrt(MONTH_DAYS / TRADING_DAYS)
  const pct = Z_BAD_MONTH * monthlyVol * 100
  return { pct, value: (pct / 100) * total }
}

function group(rows: RiskContributionRow[], key: (r: RiskContributionRow) => string): GroupRisk[] {
  const map = new Map<string, GroupRisk>()
  for (const r of rows) {
    const g = map.get(key(r)) ?? { label: key(r), weight_pct: 0, risk_contribution_pct: 0 }
    g.weight_pct += r.weight_pct
    g.risk_contribution_pct += r.risk_contribution_pct
    map.set(key(r), g)
  }
  return [...map.values()]
    .map((g) => ({ ...g, weight_pct: round(g.weight_pct, 1), risk_contribution_pct: round(g.risk_contribution_pct, 1) }))
    .sort((a, b) => b.risk_contribution_pct - a.risk_contribution_pct)
}

const STRESS_SCENARIOS: { id: string; name: string; description: string; shock: (h: Investment) => number }[] = [
  {
    id: 'tech-selloff',
    name: 'Teknologifall',
    description: 'Teknologiaksjer og -fond faller 25 %, andre aksjer faller 8 %, obligasjoner stiger litt.',
    shock: (h) => (h.asset_type === 'Cash' ? 0 : !isEquityLike(h.asset_type, h.sector) ? 0.01 : h.sector === 'Technology' ? -0.25 : -0.08),
  },
  {
    id: 'broad-fall',
    name: 'Bredt markedsfall',
    description: 'Alle aksjer og aksjefond faller 20 %, obligasjoner stiger 2 % når investorer søker trygghet.',
    shock: (h) => (h.asset_type === 'Cash' ? 0 : isEquityLike(h.asset_type, h.sector) ? -0.2 : 0.02),
  },
  {
    id: 'rates-up',
    name: 'Kraftig renteøkning',
    description: 'Obligasjonskursene faller 6 % og aksjer faller 5 % når rentene stiger kraftig.',
    shock: (h) => (h.asset_type === 'Cash' ? 0 : isEquityLike(h.asset_type, h.sector) ? -0.05 : -0.06),
  },
  {
    id: 'nordic-downturn',
    name: 'Nordisk nedgang',
    description: 'Nordiske aksjer faller 18 %, andre aksjer faller 5 %, obligasjoner uendret.',
    shock: (h) => (!isEquityLike(h.asset_type, h.sector) ? 0 : NORDIC.has(h.geography) ? -0.18 : -0.05),
  },
]

export function explainRisk(customerId: string): RiskExplanation {
  const customer = getCustomer(customerId)
  const { profile, assumption } = profileAssumption(customer?.risk_profile)
  const holdings = aggregateByTicker(getInvestmentsFor(customerId))
  const values = holdings.map((h) => h.quantity * h.current_price)
  const total = values.reduce((a, b) => a + b, 0)
  const model = riskModel(holdings, values)

  const contributions: RiskContributionRow[] = holdings
    .map((h, i) => ({
      ticker: h.ticker,
      name: instrumentName(h.name),
      asset_type: h.asset_type,
      sector: h.sector,
      geography: h.geography,
      value: round(values[i]),
      weight_pct: total > 0 ? round((values[i] / total) * 100, 1) : 0,
      own_volatility_pct: round(dailyVol(h) * Math.sqrt(TRADING_DAYS) * 100, 1),
      risk_contribution_pct: round(model.contributionsPct[i], 1),
    }))
    .sort((a, b) => b.risk_contribution_pct - a.risk_contribution_pct)

  const vol = model.volAnnualPct
  const band = assumption.volatility_band_pct
  const alignment = vol > band.max ? 'above' : vol < band.min ? 'below' : 'within'
  const equityValue = holdings.reduce((s, h, i) => s + (isEquityLike(h.asset_type, h.sector) ? values[i] : 0), 0)
  const equitySharePct = total > 0 ? (equityValue / total) * 100 : 0
  const badMonth = badMonthLoss(vol, total)

  const stressTests: StressTest[] = STRESS_SCENARIOS.map((s) => {
    const impact = holdings.reduce((sum, h, i) => sum + values[i] * s.shock(h), 0)
    return { id: s.id, name: s.name, description: s.description, impact_value: round(impact), impact_pct: total > 0 ? round((impact / total) * 100, 1) : 0 }
  }).sort((a, b) => a.impact_value - b.impact_value)

  // Drift: how sector weights changed purely from price moves since the
  // first day of market history (quantities held constant).
  const calendar = getMarketDataFor('GLBEQ').map((p) => p.date)
  const since = calendar[0] ?? ''
  const startValues = holdings.map((h) => h.quantity * priceOn(h.ticker, since, h.current_price).price)
  const startTotal = startValues.reduce((a, b) => a + b, 0)
  const driftMap = new Map<string, { start: number; now: number }>()
  holdings.forEach((h, i) => {
    const d = driftMap.get(sectorName(h.sector)) ?? { start: 0, now: 0 }
    d.start += startValues[i]
    d.now += values[i]
    driftMap.set(sectorName(h.sector), d)
  })
  const driftRows = [...driftMap.entries()]
    .map(([label, d]) => ({
      label,
      start_pct: startTotal > 0 ? round((d.start / startTotal) * 100, 1) : 0,
      now_pct: total > 0 ? round((d.now / total) * 100, 1) : 0,
    }))
    .sort((a, b) => b.now_pct - a.now_pct)

  // What-if: move half of the biggest risk contributor into a Nordic bond
  // fund. An illustration of how the numbers respond - not advice.
  let whatIf: RiskExplanation['what_if'] = null
  const top = contributions[0]
  if (top && total > 0 && top.risk_contribution_pct > 0 && isEquityLike(top.asset_type, top.sector)) {
    const bondTemplate: Investment = {
      ...holdings[0], ticker: 'CORPB', name: 'Nordic Corporate Bond Fund (Fictional)', asset_type: 'Bond',
      sector: 'Corporate Bonds', geography: 'Nordics', quantity: 1, current_price: 1,
    }
    const existingBond = holdings.findIndex((h) => h.ticker === 'CORPB')
    const newHoldings = existingBond >= 0 ? holdings : [...holdings, bondTemplate]
    const newValues = newHoldings.map((h) => h.quantity * h.current_price)
    if (existingBond < 0) newValues[newValues.length - 1] = 0
    const topIndex = newHoldings.findIndex((h) => h.ticker === top.ticker)
    const moved = newValues[topIndex] / 2
    newValues[topIndex] -= moved
    newValues[existingBond >= 0 ? existingBond : newValues.length - 1] += moved
    const newModel = riskModel(newHoldings, newValues)
    whatIf = {
      description: `Hvis halvparten av ${top.name} (${kr(moved)}) i stedet var plassert i et nordisk obligasjonsfond`,
      new_volatility_pct: round(newModel.volAnnualPct, 1),
      new_bad_month_loss: round(badMonthLoss(newModel.volAnnualPct, total).value),
    }
  }

  const bySector = group(contributions, (r) => sectorName(r.sector))
  const summary: string[] = []
  if (total === 0) {
    summary.push('Du har ingen investeringer ennå, så det er ingen investeringsrisiko å forklare.')
  } else {
    summary.push(`Investeringene dine svinger typisk rundt ${pct(vol)} opp eller ned i løpet av et år. For risikoprofilen «${profileName(profile)}» forventer vi ${band.min}–${band.max} %.`)
    if (alignment === 'above') summary.push('Det er mer enn profilen din tilsier, og forklarer hvorfor markedsfall kan føles større enn du venter.')
    else if (alignment === 'below') summary.push('Det er mindre enn profilen din tilsier: roligere, men med lavere vekstpotensial over tid.')
    else summary.push('Det er i tråd med risikoprofilen din.')
    const topSector = bySector[0]
    if (topSector) summary.push(`${topSector.label} utgjør ${pct(topSector.weight_pct)} av pengene dine, men ${pct(topSector.risk_contribution_pct)} av risikoen.`)
    summary.push(`I en dårlig måned (omtrent 1 av 20) kan investeringene dine falle rundt ${kr(badMonth.value)} eller mer.`)
    const techDrift = driftRows.find((r) => r.label === sectorName('Technology'))
    if (techDrift && techDrift.now_pct - techDrift.start_pct >= 1) {
      summary.push(`Kursbevegelser alene har økt teknologiandelen din fra ${pct(techDrift.start_pct)} til ${pct(techDrift.now_pct)} siden ${dateName(since)}.`)
    }
  }

  return {
    customer_id: customerId,
    total_value: round(total),
    portfolio_volatility_pct: round(vol, 1),
    risk_profile: profile,
    profile_band_pct: band,
    profile_description: assumption.plain_language,
    alignment,
    equity_share_pct: round(equitySharePct, 1),
    profile_equity_share_pct: assumption.equity_share_pct,
    contributions,
    by_sector: bySector,
    by_geography: group(contributions, (r) => geographyName(r.geography)),
    by_asset_type: group(contributions, (r) => assetTypeName(r.asset_type)),
    bad_month: { loss_value: round(badMonth.value), loss_pct: round(badMonth.pct, 1), frequency: 'omtrent 1 av 20 måneder' },
    stress_tests: stressTests,
    drift: { since, rows: driftRows },
    what_if: whatIf,
    summary,
    data_quality: {
      assumptions: [
        'Hver beholdnings egne svingninger måles fra de daglige kursendringene i tilgjengelig markedshistorikk.',
        'Hvor mye beholdningene beveger seg sammen, bygger på tommelfingerregler: aksjer 0,5, samme sektor +0,3, brede fond +0,15, samme region +0,1 (maks 0,9); obligasjoner med obligasjoner 0,6; aksjer med obligasjoner 0,1; kontanter 0.',
        '«Dårlig måned» = et tap du kan vente å overstige omtrent 1 av 20 måneder, gitt normalfordelt avkastning.',
        `Spenn for «${profileName(profile)}»: ${band.min}–${band.max} % årlige svingninger, ${assumption.equity_share_pct} % i aksjer.`,
      ],
      limitations: [
        'Markedshistorikken dekker bare rundt 90 dager med syntetiske priser, som er for kort til et pålitelig risikoestimat.',
        'Ingen historikk over tidligere handler: endringen i fordeling viser bare kursdrevne endringer, ikke hvordan egne kjøp har endret sammensetningen.',
        'Stresstestene er illustrasjoner, ikke prognoser.',
        'Kun en pedagogisk modell, ikke en reell risiko- eller egnethetsvurdering.',
      ],
    },
  }
}
