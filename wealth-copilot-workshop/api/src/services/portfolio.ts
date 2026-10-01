// Portfolio calculations: derives allocations, valuations and performance
// from raw investment holdings + market data. Kept deterministic and
// dependency-free so it's easy to read, test and extend during the
// workshop.
import { getInvestmentsFor, getMarketDataFor } from '../data.js'
import type { Investment } from '../types.js'

export interface AllocationSlice {
  label: string
  value: number
  percentage: number
}

export interface HoldingSummary {
  investment_id: string
  account_id: string
  ticker: string
  name: string
  asset_type: string
  quantity: number
  current_price: number
  market_value: number
  unrealized_gain_loss: number
  unrealized_gain_loss_pct: number
  weight_pct: number
}

export interface PortfolioSummary {
  customer_id: string
  total_value: number
  cash_value: number
  cash_percentage: number
  unrealized_gain_loss: number
  unrealized_gain_loss_pct: number
  allocation_by_asset_type: AllocationSlice[]
  allocation_by_geography: AllocationSlice[]
  allocation_by_sector: AllocationSlice[]
  largest_holdings: HoldingSummary[]
  holding_count: number
}

function marketValue(investment: Investment): number {
  return investment.quantity * investment.current_price
}

function costBasis(investment: Investment): number {
  return investment.quantity * investment.purchase_price
}

function toAllocation(totals: Map<string, number>, totalValue: number): AllocationSlice[] {
  return [...totals.entries()]
    .map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
      percentage: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

export function calculatePortfolio(customerId: string): PortfolioSummary {
  const holdings = getInvestmentsFor(customerId)
  const totalValue = holdings.reduce((sum, h) => sum + marketValue(h), 0)
  const totalCost = holdings.reduce((sum, h) => sum + costBasis(h), 0)
  const cashValue = holdings.filter((h) => h.asset_type === 'Cash').reduce((sum, h) => sum + marketValue(h), 0)

  const byAssetType = new Map<string, number>()
  const byGeography = new Map<string, number>()
  const bySector = new Map<string, number>()
  for (const holding of holdings) {
    const value = marketValue(holding)
    byAssetType.set(holding.asset_type, (byAssetType.get(holding.asset_type) ?? 0) + value)
    byGeography.set(holding.geography, (byGeography.get(holding.geography) ?? 0) + value)
    bySector.set(holding.sector, (bySector.get(holding.sector) ?? 0) + value)
  }

  const largestHoldings: HoldingSummary[] = holdings
    .map((h) => {
      const value = marketValue(h)
      const cost = costBasis(h)
      return {
        investment_id: h.investment_id,
        account_id: h.account_id,
        ticker: h.ticker,
        name: h.name,
        asset_type: h.asset_type,
        quantity: h.quantity,
        current_price: h.current_price,
        market_value: Number(value.toFixed(2)),
        unrealized_gain_loss: Number((value - cost).toFixed(2)),
        unrealized_gain_loss_pct: cost > 0 ? Number((((value - cost) / cost) * 100).toFixed(2)) : 0,
        weight_pct: totalValue > 0 ? Number(((value / totalValue) * 100).toFixed(2)) : 0,
      }
    })
    .sort((a, b) => b.market_value - a.market_value)
    .slice(0, 5)

  return {
    customer_id: customerId,
    total_value: Number(totalValue.toFixed(2)),
    cash_value: Number(cashValue.toFixed(2)),
    cash_percentage: totalValue > 0 ? Number(((cashValue / totalValue) * 100).toFixed(2)) : 0,
    unrealized_gain_loss: Number((totalValue - totalCost).toFixed(2)),
    unrealized_gain_loss_pct: totalCost > 0 ? Number((((totalValue - totalCost) / totalCost) * 100).toFixed(2)) : 0,
    allocation_by_asset_type: toAllocation(byAssetType, totalValue),
    allocation_by_geography: toAllocation(byGeography, totalValue),
    allocation_by_sector: toAllocation(bySector, totalValue),
    largest_holdings: largestHoldings,
    holding_count: holdings.length,
  }
}

export interface PerformancePoint {
  date: string
  value: number
}

export interface PerformanceSummary {
  customer_id: string
  series: PerformancePoint[]
  period_return_pct: number
  start_value: number
  end_value: number
}

// Reconstructs an illustrative historical portfolio value series by
// replaying each holding's quantity against historical market prices per
// ticker. This is a simplification (assumes today's quantities were held
// throughout the whole period) which is clearly acceptable for a workshop
// demo, but would need proper position history in a real system.
export function calculatePerformance(customerId: string): PerformanceSummary {
  const holdings = getInvestmentsFor(customerId)
  const dateSet = new Set<string>()
  const historyByTicker = new Map<string, Map<string, number>>()
  for (const holding of holdings) {
    const history = getMarketDataFor(holding.ticker)
    const priceByDate = new Map(history.map((p) => [p.date, p.price]))
    historyByTicker.set(holding.ticker, priceByDate)
    for (const date of priceByDate.keys()) dateSet.add(date)
  }
  const dates = [...dateSet].sort()

  const series: PerformancePoint[] = dates.map((date) => {
    const value = holdings.reduce((sum, holding) => {
      const price = historyByTicker.get(holding.ticker)?.get(date) ?? holding.current_price
      return sum + holding.quantity * price
    }, 0)
    return { date, value: Number(value.toFixed(2)) }
  })

  const startValue = series[0]?.value ?? 0
  const endValue = series[series.length - 1]?.value ?? 0
  const periodReturnPct = startValue > 0 ? Number((((endValue - startValue) / startValue) * 100).toFixed(2)) : 0

  return {
    customer_id: customerId,
    series,
    period_return_pct: periodReturnPct,
    start_value: Number(startValue.toFixed(2)),
    end_value: Number(endValue.toFixed(2)),
  }
}
