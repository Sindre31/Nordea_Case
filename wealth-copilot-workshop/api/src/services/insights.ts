// Deterministic, rule-based insight generation.
//
// Deliberately NOT using an LLM here: these are simple, explainable rules
// over the customer's own data. The goal is a realistic "v1" a bank could
// ship today, with the AI/Copilot service (see copilot.ts) layered on top
// later without needing to touch this deterministic core.
import { calculatePortfolio, calculatePerformance } from './portfolio.js'
import { explainRisk } from './riskBreakdown.js'
import { sectorLabel } from './assumptions.js'
import { getTransactionsFor } from '../data.js'

export interface Insight {
  id: string
  severity: 'info' | 'notice' | 'warning'
  title: string
  detail: string
}

export function calculateMonthlySavings(customerId: string): {
  averageMonthlyIncome: number
  averageMonthlyExpenses: number
  averageMonthlySavings: number
  savingsRatePct: number
} {
  const transactions = getTransactionsFor(customerId)
  const monthKey = (date: string) => date.slice(0, 7)
  const months = new Set(transactions.map((t) => monthKey(t.date)))
  const monthCount = Math.max(1, months.size)

  const income = transactions.filter((t) => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0)
  // Expenses = debits (spending). Transfers into investments/savings are
  // treated as savings, not spending, so they're excluded from expenses.
  const expenses = transactions.filter((t) => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const averageMonthlyIncome = income / monthCount
  const averageMonthlyExpenses = expenses / monthCount
  const averageMonthlySavings = (income - expenses) / monthCount
  const savingsRatePct = averageMonthlyIncome > 0
    ? Number(((averageMonthlySavings / averageMonthlyIncome) * 100).toFixed(1))
    : 0

  return {
    averageMonthlyIncome: Number(averageMonthlyIncome.toFixed(2)),
    averageMonthlyExpenses: Number(averageMonthlyExpenses.toFixed(2)),
    averageMonthlySavings: Number(averageMonthlySavings.toFixed(2)),
    savingsRatePct,
  }
}

export interface InsightsSummary {
  customer_id: string
  insights: Insight[]
  savings: ReturnType<typeof calculateMonthlySavings>
}

export function generateInsights(customerId: string): InsightsSummary {
  const portfolio = calculatePortfolio(customerId)
  const risk = explainRisk(customerId)
  const performance = calculatePerformance(customerId)
  const savings = calculateMonthlySavings(customerId)
  const insights: Insight[] = []

  const topSector = portfolio.allocation_by_sector[0]
  if (topSector && topSector.percentage >= 40 && portfolio.total_value > 0) {
    insights.push({
      id: 'sector-concentration',
      severity: 'warning',
      title: 'High concentration in one sector',
      detail: `${topSector.percentage}% of your portfolio is invested in ${sectorLabel(topSector.label)}. Consider whether this concentration matches your risk tolerance.`,
    })
  }

  const topGeography = portfolio.allocation_by_geography[0]
  if (topGeography && topGeography.percentage >= 55 && portfolio.total_value > 0) {
    insights.push({
      id: 'geography-concentration',
      severity: 'notice',
      title: 'High geographic concentration',
      detail: `${topGeography.percentage}% of your portfolio is invested in ${topGeography.label}. Diversifying across regions can reduce country-specific risk.`,
    })
  }

  // Uses the same swing-based model as the Risk page, so the insight and the
  // detailed explanation never contradict each other.
  if (risk.total_value > 0 && risk.alignment !== 'within') {
    insights.push({
      id: 'risk-profile-mismatch',
      severity: risk.alignment === 'above' ? 'warning' : 'notice',
      title: risk.alignment === 'above' ? 'Your portfolio swings more than your risk profile' : 'Your portfolio is calmer than your risk profile',
      detail: `Your investments typically swing about ${risk.portfolio_volatility_pct}% a year, while a "${risk.risk_profile}" profile suggests ${risk.profile_band_pct.min}-${risk.profile_band_pct.max}%. ${risk.by_sector[0] ? `${risk.by_sector[0].label} accounts for ${risk.by_sector[0].risk_contribution_pct}% of the swings. ` : ''}It may be worth reviewing your allocation with an advisor.`,
    })
  }

  if (portfolio.cash_percentage >= 25 && portfolio.total_value > 0) {
    insights.push({
      id: 'high-cash-allocation',
      severity: 'notice',
      title: 'Unusually high cash allocation',
      detail: `${portfolio.cash_percentage}% of your portfolio is held in cash. Over the long term this may limit growth potential relative to your investment horizon.`,
    })
  }

  if (Math.abs(performance.period_return_pct) >= 5) {
    const direction = performance.period_return_pct > 0 ? 'increased' : 'decreased'
    insights.push({
      id: 'performance-change',
      severity: performance.period_return_pct > 0 ? 'info' : 'warning',
      title: 'Significant portfolio performance change',
      detail: `Your portfolio value has ${direction} by ${Math.abs(performance.period_return_pct)}% over the observed period.`,
    })
  }

  insights.push({
    id: 'savings-rate',
    severity: savings.savingsRatePct >= 15 ? 'info' : 'notice',
    title: 'Monthly savings rate',
    detail: `On average you save ${savings.averageMonthlySavings.toLocaleString('en-US')} NOK per month, a savings rate of ${savings.savingsRatePct}% of income.`,
  })

  return { customer_id: customerId, insights, savings }
}
