// Case A - "Why did my portfolio move?"
//
// Explains a change in portfolio value in three layers, each simple enough
// to say out loud to a customer:
//   1. WHICH investments moved the total (contribution per holding, sector
//      and asset type, in NOK and percentage points).
//   2. MARKET vs. OWN CHOICES: how a simple reference portfolio matching the
//      customer's risk profile moved in the same period ("the market"), and
//      how much better/worse the customer's own mix did ("your choices").
//   3. WAS IT EXPECTED: compares the result with a normal range for the
//      customer's risk profile over a period of this length.
//
// Deterministic and dependency-free. All assumptions and data gaps are
// returned alongside the numbers so the UI can show "how we calculated this".
import { getInvestmentsFor, getMarketDataFor, getTransactionsFor, getCustomer } from '../data.js'
import type { Investment } from '../types.js'
import { profileAssumption, round, sectorLabel } from './assumptions.js'

export interface ContributionRow {
  ticker: string
  name: string
  asset_type: string
  sector: string
  start_value: number
  end_value: number
  change_value: number
  return_pct: number
  // Percentage points of the total portfolio return this holding explains.
  contribution_pct_points: number
  weight_start_pct: number
}

export interface GroupContribution {
  label: string
  change_value: number
  contribution_pct_points: number
}

export interface PerformanceExplanation {
  customer_id: string
  period: { start_date: string; end_date: string; days: number; max_days_available: number }
  start_value: number
  end_value: number
  change_value: number
  change_pct: number
  contributions: ContributionRow[]
  by_asset_type: GroupContribution[]
  by_sector: GroupContribution[]
  market_vs_choices: {
    reference_portfolio: { name: string; composition: { ticker: string; name: string; weight_pct: number }[] }
    market_return_pct: number
    choices_effect_pct_points: number
    market_effect_value: number
    choices_effect_value: number
    verdict: 'mostly_market' | 'mostly_choices' | 'mixed'
  }
  expected_range: {
    risk_profile: string
    low_pct: number
    expected_pct: number
    high_pct: number
    verdict: 'within' | 'above' | 'below'
  }
  summary: string[]
  data_quality: {
    data_as_of: string
    net_new_money_in_period: number
    assumptions: string[]
    limitations: string[]
  }
}

const REFERENCE = {
  equity: { ticker: 'GLBEQ', name: 'Global Equity Index Fund (Fictional)' },
  bonds: [
    { ticker: 'CORPB', name: 'Nordic Corporate Bond Fund (Fictional)' },
    { ticker: 'GOVNO', name: 'Norway Government Bond 10Y (Fictional)' },
  ],
}

const ALLOWED_DAYS = [30, 60, 90]

export function aggregateByTicker(holdings: Investment[]): Investment[] {
  const byTicker = new Map<string, Investment>()
  for (const h of holdings) {
    const existing = byTicker.get(h.ticker)
    if (existing) byTicker.set(h.ticker, { ...existing, quantity: existing.quantity + h.quantity })
    else byTicker.set(h.ticker, { ...h })
  }
  return [...byTicker.values()]
}

export function priceOn(ticker: string, date: string, fallback: number): { price: number; missing: boolean } {
  if (ticker === 'CASHNOK') return { price: 1, missing: false }
  const point = getMarketDataFor(ticker).find((p) => p.date === date)
  return point ? { price: point.price, missing: false } : { price: fallback, missing: true }
}

function tickerReturn(ticker: string, startDate: string, endDate: string): number {
  const start = getMarketDataFor(ticker).find((p) => p.date === startDate)?.price
  const end = getMarketDataFor(ticker).find((p) => p.date === endDate)?.price
  return start && end ? (end - start) / start : 0
}

function groupBy(rows: ContributionRow[], key: (r: ContributionRow) => string, startTotal: number): GroupContribution[] {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + row.change_value)
  return [...totals.entries()]
    .map(([label, change]) => ({
      label,
      change_value: round(change),
      contribution_pct_points: startTotal > 0 ? round((change / startTotal) * 100) : 0,
    }))
    .sort((a, b) => Math.abs(b.change_value) - Math.abs(a.change_value))
}

function nok(value: number): string {
  return `${Math.round(Math.abs(value)).toLocaleString('en-US')} NOK`
}

export function parsePeriodDays(raw: unknown): number | null {
  if (raw === undefined) return 90
  const days = Number(raw)
  return ALLOWED_DAYS.includes(days) ? days : null
}

export function explainPerformance(customerId: string, days = 90): PerformanceExplanation {
  const customer = getCustomer(customerId)
  const holdings = aggregateByTicker(getInvestmentsFor(customerId))
  const { profile, assumption } = profileAssumption(customer?.risk_profile)

  // All instruments share the same trading calendar in the synthetic data;
  // use the reference equity fund as the calendar.
  const calendar = getMarketDataFor(REFERENCE.equity.ticker).map((p) => p.date)
  const maxDays = calendar.length
  const startIndex = Math.max(0, calendar.length - days)
  const startDate = calendar[startIndex] ?? ''
  const endDate = calendar[calendar.length - 1] ?? ''

  let missingPrices = 0
  const contributions: ContributionRow[] = holdings.map((h) => {
    const start = priceOn(h.ticker, startDate, h.current_price)
    const end = priceOn(h.ticker, endDate, h.current_price)
    if (start.missing || end.missing) missingPrices += 1
    const startValue = h.quantity * start.price
    const endValue = h.quantity * end.price
    return {
      ticker: h.ticker,
      name: h.name,
      asset_type: h.asset_type,
      sector: h.sector,
      start_value: round(startValue),
      end_value: round(endValue),
      change_value: round(endValue - startValue),
      return_pct: startValue > 0 ? round(((endValue - startValue) / startValue) * 100) : 0,
      contribution_pct_points: 0,
      weight_start_pct: 0,
    }
  })
  const startTotal = contributions.reduce((s, r) => s + r.start_value, 0)
  const endTotal = contributions.reduce((s, r) => s + r.end_value, 0)
  for (const row of contributions) {
    row.contribution_pct_points = startTotal > 0 ? round((row.change_value / startTotal) * 100) : 0
    row.weight_start_pct = startTotal > 0 ? round((row.start_value / startTotal) * 100) : 0
  }
  contributions.sort((a, b) => Math.abs(b.change_value) - Math.abs(a.change_value))

  const changeValue = endTotal - startTotal
  const changePct = startTotal > 0 ? (changeValue / startTotal) * 100 : 0

  // 2) Market vs. own choices, using a reference portfolio with the same
  // share/bond split as the customer's risk profile.
  const equityWeight = assumption.equity_share_pct / 100
  const bondWeight = (1 - equityWeight) / REFERENCE.bonds.length
  const marketReturn =
    equityWeight * tickerReturn(REFERENCE.equity.ticker, startDate, endDate) +
    REFERENCE.bonds.reduce((s, b) => s + bondWeight * tickerReturn(b.ticker, startDate, endDate), 0)
  const marketReturnPct = marketReturn * 100
  const choicesPct = changePct - marketReturnPct
  const marketEffectValue = startTotal * marketReturn
  const choicesEffectValue = changeValue - marketEffectValue
  const absMarket = Math.abs(marketEffectValue)
  const absChoices = Math.abs(choicesEffectValue)
  const verdict: PerformanceExplanation['market_vs_choices']['verdict'] =
    absMarket >= 2 * absChoices ? 'mostly_market' : absChoices >= 2 * absMarket ? 'mostly_choices' : 'mixed'

  // 3) Normal range for this profile over a period of this length: expected
  // return +/- 1.645 standard deviations (roughly 9 out of 10 periods).
  const years = days / 365
  const expectedPct = assumption.expected_annual_return_pct * years
  const spread = 1.645 * assumption.expected_annual_volatility_pct * Math.sqrt(years)
  const lowPct = expectedPct - spread
  const highPct = expectedPct + spread
  const rangeVerdict = changePct > highPct ? 'above' : changePct < lowPct ? 'below' : 'within'

  // New money moved into investments in the period. The demo cannot link
  // these transfers to specific purchases (see limitations).
  const netNewMoney = getTransactionsFor(customerId)
    .filter((t) => t.category === 'Investments' && t.date >= startDate && t.date <= endDate)
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const byAssetType = groupBy(contributions, (r) => r.asset_type, startTotal)
  const bySector = groupBy(contributions, (r) => sectorLabel(r.sector), startTotal)

  const summary: string[] = []
  if (holdings.length === 0 || startTotal === 0) {
    summary.push('You have no investments yet, so there is no development to explain.')
  } else {
    const direction = changeValue >= 0 ? 'grew' : 'fell'
    summary.push(`Over the last ${days} days your investments ${direction} by ${nok(changeValue)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%).`)
    const ups = contributions.filter((c) => c.change_value > 0).slice(0, 2)
    const downs = contributions.filter((c) => c.change_value < 0).slice(0, 1)
    if (ups.length) summary.push(`The biggest lift came from ${ups.map((u) => `${u.name} (+${nok(u.change_value)})`).join(' and ')}.`)
    if (downs.length) summary.push(`${downs[0].name} pulled the other way (-${nok(downs[0].change_value)}).`)
    const marketPart = `A simple mix matching your "${profile}" profile moved ${marketReturnPct >= 0 ? '+' : ''}${marketReturnPct.toFixed(1)}% in the same period`
    if (verdict === 'mostly_market') summary.push(`${marketPart}, so most of your result is explained by the market as a whole rather than your specific investments.`)
    else if (verdict === 'mostly_choices') summary.push(`${marketPart}. Most of your result comes from which investments you hold, not from the market as a whole.`)
    else summary.push(`${marketPart}. Your result is a mix of general market movements and your specific investments.`)
    summary.push(rangeVerdict === 'within'
      ? `For a ${profile.toLowerCase()} investor, a ${days}-day result between ${lowPct.toFixed(1)}% and ${highPct.toFixed(1)}% is normal, so this is within what we would expect.`
      : `For a ${profile.toLowerCase()} investor, a ${days}-day result between ${lowPct.toFixed(1)}% and ${highPct.toFixed(1)}% is normal. Yours is ${rangeVerdict} that range, which is worth understanding but not necessarily a problem.`)
  }

  const limitations = [
    'Your holdings are assumed unchanged through the whole period. Purchases and sales are not yet part of the calculation, so new money can look like growth.',
    `Market history only covers ${maxDays} days, so longer periods (like a half-year) cannot be explained yet.`,
    'Market data is synthetic and created for this demo.',
  ]
  if (netNewMoney > 0) limitations.unshift(`You moved ${nok(netNewMoney)} into investments in this period. Without trade history we cannot tell what it bought, so it is not separated from market growth.`)
  if (missingPrices > 0) limitations.unshift(`${missingPrices} holding(s) had no price on the start or end date; today's price was used instead.`)

  return {
    customer_id: customerId,
    period: { start_date: startDate, end_date: endDate, days: Math.min(days, maxDays), max_days_available: maxDays },
    start_value: round(startTotal),
    end_value: round(endTotal),
    change_value: round(changeValue),
    change_pct: round(changePct),
    contributions,
    by_asset_type: byAssetType,
    by_sector: bySector,
    market_vs_choices: {
      reference_portfolio: {
        name: `${assumption.equity_share_pct}/${100 - assumption.equity_share_pct} reference mix for "${profile}"`,
        composition: [
          { ...REFERENCE.equity, weight_pct: assumption.equity_share_pct },
          ...REFERENCE.bonds.map((b) => ({ ...b, weight_pct: round(bondWeight * 100, 1) })),
        ],
      },
      market_return_pct: round(marketReturnPct),
      choices_effect_pct_points: round(choicesPct),
      market_effect_value: round(marketEffectValue),
      choices_effect_value: round(choicesEffectValue),
      verdict,
    },
    expected_range: {
      risk_profile: profile,
      low_pct: round(lowPct),
      expected_pct: round(expectedPct),
      high_pct: round(highPct),
      verdict: rangeVerdict,
    },
    summary,
    data_quality: {
      data_as_of: endDate,
      net_new_money_in_period: round(netNewMoney),
      assumptions: [
        `"The market" = a reference mix of ${assumption.equity_share_pct}% global shares and ${100 - assumption.equity_share_pct}% Nordic bonds, matching a "${profile}" profile.`,
        `Normal range = expected return ${assumption.expected_annual_return_pct}%/year with typical swings of ${assumption.expected_annual_volatility_pct}%/year, scaled to ${days} days (covers about 9 in 10 periods).`,
        'Contribution = quantity x (price at end - price at start) for each holding.',
      ],
      limitations,
    },
  }
}

