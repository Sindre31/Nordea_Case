// Deterministic "Wealth Copilot" chat engine.
//
// For the workshop demo, answers are generated entirely from the
// customer's own data using simple pattern matching - no external AI API
// key is required. The `CopilotEngine` interface is the seam where a real
// LLM (with the customer's data as context/RAG input) could be plugged in
// later without changing the route or frontend contract.
import { calculatePortfolio, calculatePerformance } from './portfolio.js'
import { calculateRisk } from './risk.js'
import { calculateMonthlySavings, generateInsights } from './insights.js'
import { getCustomer } from '../data.js'

export interface CopilotReply {
  answer: string
  matched_intent: string
}

export interface CopilotEngine {
  answer(customerId: string, message: string): CopilotReply
}

type IntentHandler = (customerId: string) => string

const INTENTS: { id: string; patterns: RegExp[]; handle: IntentHandler }[] = [
  {
    id: 'performance',
    patterns: [/perform/i, /how.*(doing|done)/i, /return/i],
    handle: (customerId) => {
      const performance = calculatePerformance(customerId)
      const direction = performance.period_return_pct >= 0 ? 'gained' : 'lost'
      return `Over the observed period your portfolio has ${direction} ${Math.abs(performance.period_return_pct)}%, moving from ${performance.start_value.toLocaleString('en-US')} NOK to ${performance.end_value.toLocaleString('en-US')} NOK.`
    },
  },
  {
    id: 'risk-change',
    patterns: [/risk.*(increas|chang|higher|why)/i],
    handle: (customerId) => {
      const risk = calculateRisk(customerId)
      return `Your illustrative risk score is ${risk.risk_score}/100 ("${risk.risk_category}"), driven mainly by asset allocation (${risk.factors.asset_allocation_score}) and concentration (${risk.factors.concentration_score}). This is ${risk.risk_profile_alignment.toLowerCase()} compared to your stated "${risk.customer_risk_profile}" profile. ${risk.disclaimer}`
    },
  },
  {
    id: 'diversification',
    patterns: [/diversif/i, /spread/i, /concentrat/i],
    handle: (customerId) => {
      const portfolio = calculatePortfolio(customerId)
      const topSector = portfolio.allocation_by_sector[0]
      const topGeography = portfolio.allocation_by_geography[0]
      if (!topSector) return 'You currently have no investment holdings, so diversification cannot be assessed yet.'
      return `Your largest sector exposure is ${topSector.label} at ${topSector.percentage}%, and your largest geographic exposure is ${topGeography?.label ?? 'n/a'} at ${topGeography?.percentage ?? 0}%. ${topSector.percentage >= 40 ? 'This is a fairly concentrated position - broader diversification could reduce risk.' : 'This looks reasonably diversified.'}`
    },
  },
  {
    id: 'savings',
    patterns: [/saving/i, /save/i, /budget/i],
    handle: (customerId) => {
      const savings = calculateMonthlySavings(customerId)
      return `On average you save ${savings.averageMonthlySavings.toLocaleString('en-US')} NOK per month (income ${savings.averageMonthlyIncome.toLocaleString('en-US')} NOK vs. expenses ${savings.averageMonthlyExpenses.toLocaleString('en-US')} NOK), a savings rate of ${savings.savingsRatePct}%.`
    },
  },
  {
    id: 'largest-risks',
    patterns: [/largest risk/i, /biggest risk/i, /main risk/i],
    handle: (customerId) => {
      const portfolio = calculatePortfolio(customerId)
      const risk = calculateRisk(customerId)
      const topHolding = portfolio.largest_holdings[0]
      const parts = [`Your illustrative overall risk score is ${risk.risk_score}/100 ("${risk.risk_category}").`]
      if (topHolding) parts.push(`Your largest single holding is ${topHolding.name} at ${topHolding.weight_pct}% of your portfolio.`)
      if (risk.factors.concentration_score >= 40) parts.push('Concentration in a small number of holdings is a notable contributor to your risk score.')
      return parts.join(' ')
    },
  },
]

function fallbackAnswer(customerId: string): string {
  const insightsSummary = generateInsights(customerId)
  const first = insightsSummary.insights[0]
  if (!first) return "I don't have a specific answer for that yet, but your financial overview looks stable with no notable flags right now."
  return `I don't have a specific answer for that question yet, but here's something relevant from your data: ${first.detail}`
}

export const deterministicCopilot: CopilotEngine = {
  answer(customerId, message) {
    const customer = getCustomer(customerId)
    if (!customer) {
      return { answer: 'Unknown customer.', matched_intent: 'error' }
    }
    for (const intent of INTENTS) {
      if (intent.patterns.some((pattern) => pattern.test(message))) {
        return { answer: intent.handle(customerId), matched_intent: intent.id }
      }
    }
    return { answer: fallbackAnswer(customerId), matched_intent: 'fallback' }
  },
}
