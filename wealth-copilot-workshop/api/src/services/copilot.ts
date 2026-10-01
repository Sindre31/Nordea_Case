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
import { explainPerformance } from './attribution.js'
import { explainRisk } from './riskBreakdown.js'
import { projectGoal } from './goals.js'
import { getCustomer } from '../data.js'
import { geographyName, instrumentName, kr, num, pct, profileName, sectorName } from './locale.js'

export interface CopilotReply {
  answer: string
  matched_intent: string
  // "Why am I seeing this?" - the customer data each answer was built from.
  sources: string[]
  // Suggested next questions, so the customer can keep exploring.
  follow_ups: string[]
}

export interface CopilotEngine {
  answer(customerId: string, message: string): CopilotReply
}

type IntentHandler = (customerId: string) => string

// Patterns cover Norwegian and English. Order matters: the first match wins,
// so the more specific intents come first.
const INTENTS: { id: string; patterns: RegExp[]; handle: IntentHandler; sources: string[]; follow_ups: string[] }[] = [
  {
    id: 'performance-drivers',
    patterns: [
      /hvorfor.*(portefølj|verdi|investering).*(endret|steg|økt|falt|gikk|vokst)/i, /hvorfor.*(endret|steg|økt|falt|gikk|vokst).*(portefølj|verdi|investering)/i, /hva.*(drev|påvirket|forklarer)/i, /forventet/i,
      /why.*(portfolio|value|investment).*(chang|grow|grew|rise|rose|increas|fall|fell|drop|up|down)/i, /what.*(driv|caus)/i, /driv|contribut|expected/i,
    ],
    handle: (customerId) => explainPerformance(customerId, 90).summary.join(' '),
    sources: ['Dine nåværende beholdninger', 'Markedspriser for de siste 90 dagene', 'Referanseblanding for risikoprofilen din', 'Overføringer til investeringskontoen din'],
    follow_ups: ['Hvor kommer risikoen min fra?', 'Er jeg i rute til å nå målet mitt?'],
  },
  {
    id: 'risk-sources',
    patterns: [/hvor (kommer|stammer)/i, /hvor.*risiko.*(fra|kommer)/i, /svinge|svingning|dårlig måned|stresstest/i, /where.*risk/i, /risk.*(come|from|source)/i, /swing|volatil|fluctuat|bad month|stress/i],
    handle: (customerId) => {
      const risk = explainRisk(customerId)
      const parts = [...risk.summary]
      if (risk.stress_tests[0] && risk.total_value > 0) {
        const s = risk.stress_tests[0]
        parts.push(`Scenarioet som ville rammet deg hardest er «${s.name}»: rundt ${kr(s.impact_value)} (${pct(s.impact_pct)}).`)
      }
      return parts.join(' ')
    },
    sources: ['Dine nåværende beholdninger', 'Kurssvingninger de siste 90 dagene', 'Den registrerte risikoprofilen din', 'Tommelfingerregler for samvariasjon (se Risiko-siden)'],
    follow_ups: ['Hvorfor endret porteføljen min seg?', 'Er jeg godt nok diversifisert?'],
  },
  {
    id: 'goal',
    patterns: [/mål|i rute|uavhengig|pensjon|frihet/i, /goal|target|independen|retire|on track|freedom|reach/i],
    handle: (customerId) => projectGoal(customerId).summary.join(' '),
    sources: ['Det registrerte målet ditt (hvis du har et)', 'Dagens verdi av investeringene dine', 'Overføringer til investeringer og forbruk i transaksjonene dine', 'Avkastningsantakelser for risikoprofilen din'],
    follow_ups: ['Hvor mye sparer jeg hver måned?', 'Hvor kommer risikoen min fra?'],
  },
  {
    id: 'performance',
    patterns: [/utvikl|avkastning|hvordan går det/i, /perform/i, /how.*(doing|done)/i, /return/i],
    handle: (customerId) => {
      const performance = calculatePerformance(customerId)
      const direction = performance.period_return_pct >= 0 ? 'steget' : 'falt'
      return `I perioden vi har data for har porteføljen din ${direction} ${pct(Math.abs(performance.period_return_pct))}, fra ${kr(performance.start_value)} til ${kr(performance.end_value)}.`
    },
    sources: ['Dine nåværende beholdninger', 'Markedspriser for de siste 90 dagene'],
    follow_ups: ['Hvorfor endret porteføljen min seg?', 'Var dette forventet for risikoprofilen min?'],
  },
  {
    id: 'risk-change',
    patterns: [/risiko.*(økt|endret|høyere)|hvorfor.*risiko/i, /risk.*(increas|chang|higher|why)/i],
    handle: (customerId) => {
      const risk = calculateRisk(customerId)
      const category: Record<string, string> = { Low: 'Lav', Medium: 'Middels', High: 'Høy' }
      return `Den illustrative risikoscoren din er ${risk.risk_score}/100 («${category[risk.risk_category]}»), hovedsakelig drevet av fordelingen mellom aktivaklasser (${num(risk.factors.asset_allocation_score)}) og konsentrasjon (${num(risk.factors.concentration_score)}). Risikoprofilen din er «${profileName(risk.customer_risk_profile)}». Se Risiko-siden for hva som driver svingningene. ${risk.disclaimer}`
    },
    sources: ['Beholdningene og fordelingen din', 'Den registrerte risikoprofilen din', 'Illustrativ modell for risikoscore'],
    follow_ups: ['Hvor kommer risikoen min fra?'],
  },
  {
    id: 'diversification',
    patterns: [/diversif|spredt|spredning|konsentr/i, /spread/i, /concentrat/i],
    handle: (customerId) => {
      const portfolio = calculatePortfolio(customerId)
      const topSector = portfolio.allocation_by_sector[0]
      const topGeography = portfolio.allocation_by_geography[0]
      if (!topSector) return 'Du har ingen investeringer ennå, så spredningen kan ikke vurderes.'
      return `Den største sektoreksponeringen din er ${sectorName(topSector.label).toLowerCase()} med ${pct(topSector.percentage)}, og den største geografiske eksponeringen er ${topGeography ? geographyName(topGeography.label) : 'ukjent'} med ${pct(topGeography?.percentage ?? 0)}. ${topSector.percentage >= 40 ? 'Det er en ganske konsentrert posisjon. Bredere spredning kan redusere risikoen.' : 'Det ser rimelig godt spredt ut.'}`
    },
    sources: ['Fordelingen din på sektor og region'],
    follow_ups: ['Hvor kommer risikoen min fra?'],
  },
  {
    id: 'savings',
    patterns: [/spar|budsjett/i, /saving/i, /save/i, /budget/i],
    handle: (customerId) => {
      const savings = calculateMonthlySavings(customerId)
      return `I snitt sparer du ${kr(savings.averageMonthlySavings)} per måned (inntekt ${kr(savings.averageMonthlyIncome)} mot forbruk ${kr(savings.averageMonthlyExpenses)}), en sparerate på ${pct(savings.savingsRatePct)}.`
    },
    sources: ['Inntekt og forbruk i transaksjonene dine'],
    follow_ups: ['Er jeg i rute til å nå målet mitt?'],
  },
  {
    id: 'largest-risks',
    patterns: [/største risiko|viktigste risiko/i, /largest risk/i, /biggest risk/i, /main risk/i],
    handle: (customerId) => {
      const portfolio = calculatePortfolio(customerId)
      const risk = calculateRisk(customerId)
      const topHolding = portfolio.largest_holdings[0]
      const parts = [`Den illustrative samlede risikoscoren din er ${risk.risk_score}/100.`]
      if (topHolding) parts.push(`Den største enkeltbeholdningen din er ${instrumentName(topHolding.name)} med ${pct(topHolding.weight_pct)} av porteføljen.`)
      if (risk.factors.concentration_score >= 40) parts.push('At mye står i få beholdninger bidrar merkbart til risikoscoren din.')
      return parts.join(' ')
    },
    sources: ['De største beholdningene dine', 'Illustrativ modell for risikoscore'],
    follow_ups: ['Hvor kommer risikoen min fra?'],
  },
]

function fallbackAnswer(customerId: string): string {
  const insightsSummary = generateInsights(customerId)
  const first = insightsSummary.insights[0]
  if (!first) return 'Jeg har ikke et konkret svar på det ennå, men økonomien din ser stabil ut uten noe spesielt å merke seg akkurat nå.'
  return `Jeg har ikke et konkret svar på det spørsmålet ennå, men her er noe relevant fra dataene dine: ${first.detail}`
}

export const deterministicCopilot: CopilotEngine = {
  answer(customerId, message) {
    const customer = getCustomer(customerId)
    if (!customer) {
      return { answer: 'Ukjent kunde.', matched_intent: 'error', sources: [], follow_ups: [] }
    }
    for (const intent of INTENTS) {
      if (intent.patterns.some((pattern) => pattern.test(message))) {
        return { answer: intent.handle(customerId), matched_intent: intent.id, sources: intent.sources, follow_ups: intent.follow_ups }
      }
    }
    return {
      answer: fallbackAnswer(customerId),
      matched_intent: 'fallback',
      sources: ['Regelbaserte innsikter fra kontoene og porteføljen din'],
      follow_ups: ['Hvorfor endret porteføljen min seg?', 'Hvor kommer risikoen min fra?', 'Er jeg i rute til å nå målet mitt?'],
    }
  },
}
