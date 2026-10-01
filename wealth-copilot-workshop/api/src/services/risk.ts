// Illustrative, deterministic "risk score" for the workshop demo.
//
// IMPORTANT: This is a simplified EDUCATIONAL model built purely to make
// the Wealth Copilot demo feel realistic. It is NOT a real investment
// suitability or risk assessment methodology, has not been validated by
// any risk/compliance function, and must never be used for actual
// financial advice.
import { calculatePortfolio } from './portfolio.js'
import { getInvestmentsFor, getMarketDataFor, getCustomer } from '../data.js'

const ASSET_TYPE_RISK_WEIGHT: Record<string, number> = {
  Cash: 2,
  Bond: 20,
  'Mutual Fund': 45,
  ETF: 55,
  Equity: 80,
}

function herfindahlIndex(percentages: number[]): number {
  // Sum of squared weights (0-1 scale). 1.0 = fully concentrated in one
  // bucket, close to 0 = very spread out.
  return percentages.reduce((sum, pct) => sum + (pct / 100) ** 2, 0)
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export interface RiskSummary {
  customer_id: string
  risk_score: number
  risk_category: 'Low' | 'Medium' | 'High'
  factors: {
    asset_allocation_score: number
    concentration_score: number
    geography_score: number
    volatility_score: number
  }
  customer_risk_profile: string
  risk_profile_alignment: 'Aligned' | 'More conservative than profile' | 'More aggressive than profile'
  disclaimer: string
}

export function calculateRisk(customerId: string): RiskSummary {
  const portfolio = calculatePortfolio(customerId)
  const holdings = getInvestmentsFor(customerId)
  const customer = getCustomer(customerId)

  // 1) Asset allocation score: weighted average of each asset type's
  // illustrative risk weight.
  const assetAllocationScore = portfolio.total_value > 0
    ? portfolio.allocation_by_asset_type.reduce((sum, slice) => {
      const weight = ASSET_TYPE_RISK_WEIGHT[slice.label] ?? 50
      return sum + (slice.percentage / 100) * weight
    }, 0)
    : 0

  // 2) Concentration score: Herfindahl index across individual holdings,
  // scaled to 0-100. A single holding with 100% weight scores 100.
  const holdingWeights = holdings.map((h) => {
    const value = h.quantity * h.current_price
    return portfolio.total_value > 0 ? (value / portfolio.total_value) * 100 : 0
  })
  const concentrationScore = Math.min(100, herfindahlIndex(holdingWeights) * 100)

  // 3) Geography score: same HHI approach applied to geographic allocation.
  const geographyScore = Math.min(
    100,
    herfindahlIndex(portfolio.allocation_by_geography.map((s) => s.percentage)) * 100,
  )

  // 4) Volatility score: weighted average of each holding's historical
  // daily-return standard deviation, scaled up to a 0-100-ish range.
  const volatilities = holdings.map((h) => {
    const history = getMarketDataFor(h.ticker)
    const stdDev = standardDeviation(history.map((p) => p.daily_return))
    const value = h.quantity * h.current_price
    const weight = portfolio.total_value > 0 ? value / portfolio.total_value : 0
    return stdDev * weight
  })
  const volatilityScore = Math.min(100, volatilities.reduce((a, b) => a + b, 0) * 25)

  const riskScore = Math.round(
    assetAllocationScore * 0.4 +
    concentrationScore * 0.25 +
    geographyScore * 0.15 +
    volatilityScore * 0.2,
  )

  const riskCategory: RiskSummary['risk_category'] = riskScore < 35 ? 'Low' : riskScore < 65 ? 'Medium' : 'High'

  const profileToExpectedCategory: Record<string, RiskSummary['risk_category']> = {
    Conservative: 'Low',
    Moderate: 'Low',
    Balanced: 'Medium',
    Growth: 'Medium',
    Aggressive: 'High',
  }
  const expectedCategory = customer ? profileToExpectedCategory[customer.risk_profile] ?? 'Medium' : 'Medium'
  const categoryOrder = { Low: 0, Medium: 1, High: 2 }
  let alignment: RiskSummary['risk_profile_alignment'] = 'Aligned'
  if (categoryOrder[riskCategory] > categoryOrder[expectedCategory]) alignment = 'More aggressive than profile'
  else if (categoryOrder[riskCategory] < categoryOrder[expectedCategory]) alignment = 'More conservative than profile'

  return {
    customer_id: customerId,
    risk_score: Math.max(0, Math.min(100, riskScore)),
    risk_category: riskCategory,
    factors: {
      asset_allocation_score: Number(assetAllocationScore.toFixed(1)),
      concentration_score: Number(concentrationScore.toFixed(1)),
      geography_score: Number(geographyScore.toFixed(1)),
      volatility_score: Number(volatilityScore.toFixed(1)),
    },
    customer_risk_profile: customer?.risk_profile ?? 'Unknown',
    risk_profile_alignment: alignment,
    disclaimer: 'Educational/demo risk model only. Not a real investment suitability assessment.',
  }
}
