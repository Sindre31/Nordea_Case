// Deterministic, rule-based insight generation.
//
// Deliberately NOT using an LLM here: these are simple, explainable rules
// over the customer's own data. The goal is a realistic "v1" a bank could
// ship today, with the AI/Copilot service (see copilot.ts) layered on top
// later without needing to touch this deterministic core.
import { calculatePortfolio, calculatePerformance } from './portfolio.js'
import { explainRisk } from './riskBreakdown.js'
import { geographyName, kr, pct, profileName, sectorName } from './locale.js'
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
      title: 'Høy konsentrasjon i én sektor',
      detail: `${pct(topSector.percentage)} av porteføljen din er investert i ${sectorName(topSector.label).toLowerCase()}. Vurder om denne konsentrasjonen passer med risikotoleransen din.`,
    })
  }

  const topGeography = portfolio.allocation_by_geography[0]
  if (topGeography && topGeography.percentage >= 55 && portfolio.total_value > 0) {
    insights.push({
      id: 'geography-concentration',
      severity: 'notice',
      title: 'Høy geografisk konsentrasjon',
      detail: `${pct(topGeography.percentage)} av porteføljen din er investert i ${geographyName(topGeography.label)}. Spredning på flere regioner kan redusere landspesifikk risiko.`,
    })
  }

  // Uses the same swing-based model as the Risk page, so the insight and the
  // detailed explanation never contradict each other.
  if (risk.total_value > 0 && risk.alignment !== 'within') {
    insights.push({
      id: 'risk-profile-mismatch',
      severity: risk.alignment === 'above' ? 'warning' : 'notice',
      title: risk.alignment === 'above' ? 'Porteføljen svinger mer enn risikoprofilen din' : 'Porteføljen er roligere enn risikoprofilen din',
      detail: `Investeringene dine svinger typisk rundt ${pct(risk.portfolio_volatility_pct)} i året, mens profilen «${profileName(risk.risk_profile)}» tilsier ${risk.profile_band_pct.min}–${risk.profile_band_pct.max} %. ${risk.by_sector[0] ? `${risk.by_sector[0].label} står for ${pct(risk.by_sector[0].risk_contribution_pct)} av svingningene. ` : ''}Det kan være lurt å gå gjennom fordelingen med en rådgiver.`,
    })
  }

  if (portfolio.cash_percentage >= 25 && portfolio.total_value > 0) {
    insights.push({
      id: 'high-cash-allocation',
      severity: 'notice',
      title: 'Uvanlig høy kontantandel',
      detail: `${pct(portfolio.cash_percentage)} av porteføljen din står i kontanter. Over tid kan det begrense vekstpotensialet sett opp mot investeringshorisonten din.`,
    })
  }

  if (Math.abs(performance.period_return_pct) >= 5) {
    const direction = performance.period_return_pct > 0 ? 'steget' : 'falt'
    insights.push({
      id: 'performance-change',
      severity: performance.period_return_pct > 0 ? 'info' : 'warning',
      title: 'Stor endring i porteføljens verdi',
      detail: `Verdien av porteføljen din har ${direction} med ${pct(Math.abs(performance.period_return_pct))} i perioden vi har data for.`,
    })
  }

  insights.push({
    id: 'savings-rate',
    severity: savings.savingsRatePct >= 15 ? 'info' : 'notice',
    title: 'Månedlig sparerate',
    detail: `I snitt sparer du ${kr(savings.averageMonthlySavings)} per måned, en sparerate på ${pct(savings.savingsRatePct)} av inntekten.`,
  })

  return { customer_id: customerId, insights, savings }
}
