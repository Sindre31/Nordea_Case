// Case C - "Am I on track for my goal?"
//
// Projects a savings goal as a RANGE of outcomes, never a promise:
//   - every input (target, years, monthly saving, starting amount, return)
//     comes either from the customer, a registered goal, their own data, or
//     a clearly labelled assumption - and the response says which,
//   - outcomes are simulated with a seeded random generator, so the same
//     inputs always give the same answer (deterministic and testable),
//   - "levers" show what changes the picture most (save more, wait longer,
//     an early market crash),
//   - if a goal was registered with a plan, we compare today's actual value
//     with where the plan expected the customer to be.
// All amounts are in today's money (returns are reduced by assumed inflation).
import { getCustomer, getGoalsFor, getTransactionsFor } from '../data.js'
import type { Goal } from '../types.js'
import { calculatePortfolio } from './portfolio.js'
import { explainPerformance } from './attribution.js'
import { calculateMonthlySavings } from './insights.js'
import { ASSUMED_INFLATION_PCT, profileAssumption, round } from './assumptions.js'
import { dateName, horizonName, kr, num, pct, profileName } from './locale.js'

export type InputSource = 'your_input' | 'registered_goal' | 'your_data' | 'assumption'

export interface ProjectionInput {
  target_amount?: number
  years?: number
  monthly_contribution?: number
  starting_amount?: number
  annual_return_pct?: number
  annual_volatility_pct?: number
}

export interface ResolvedInput {
  key: keyof ProjectionInput
  label: string
  value: number
  unit: 'NOK' | 'years' | '%' | 'NOK/month'
  source: InputSource
  explanation: string
}

export interface YearPoint {
  year: number
  p10: number
  p50: number
  p90: number
  contributed: number
}

export interface Lever {
  id: string
  label: string
  probability_pct: number
  median_value: number
  delta_probability_pct: number
}

export interface GoalProjection {
  customer_id: string
  goal: Goal | null
  inputs: ResolvedInput[]
  probability_pct: number
  status: 'likely' | 'possible' | 'at_risk' | 'unlikely'
  outcomes: { pessimistic: number; median: number; optimistic: number }
  timeline: YearPoint[]
  required_monthly_contribution: number
  years_needed_at_current_pace: number | null
  plan_check: {
    months_since_start: number
    planned_value_today: number
    actual_value_today: number
    difference: number
    verdict: 'ahead' | 'behind' | 'on_plan'
  } | null
  levers: Lever[]
  market_impact: MarketImpact
  summary: string[]
  data_quality: { assumptions: string[]; limitations: string[] }
}

// How market development affects the goal - the part of case C that is
// outside the customer's control, made concrete in kroner.
export interface MarketImpact {
  // What the last market period actually did to the goal (null if the
  // customer has no investments).
  recent: {
    days: number
    change_value: number
    probability_without_change_pct: number
    probability_now_pct: number
  } | null
  // The typical outcome split into money paid in and market growth.
  composition: { paid_in: number; market_growth: number; median: number; market_share_pct: number }
  // Weak vs. strong market at the goal date: the cost of uncertainty.
  spread: { pessimistic: number; optimistic: number; difference: number }
  // Extra kroner at the goal date per 1 percentage point of yearly return.
  value_per_return_point: number
  // Same 25 % crash, different timing (average returns otherwise).
  timing: { crash_pct: number; no_crash: number; crash_early: number; crash_late: number; late_crash_year: number }
  explanation: string[]
}

const CRASH_PCT = 25

const SIMULATIONS = 2000
const SEED = 20260906
const TODAY = '2026-09-06'

export const INPUT_LIMITS: Record<keyof ProjectionInput, [number, number]> = {
  target_amount: [10000, 100000000],
  years: [1, 50],
  monthly_contribution: [0, 1000000],
  starting_amount: [0, 100000000],
  annual_return_pct: [-5, 15],
  annual_volatility_pct: [0, 40],
}

export function validateProjectionInput(body: unknown): { input: ProjectionInput } | { error: string } {
  const input: ProjectionInput = {}
  if (body === undefined || body === null) return { input }
  if (typeof body !== 'object') return { error: 'Body must be a JSON object' }
  for (const [key, [min, max]] of Object.entries(INPUT_LIMITS) as [keyof ProjectionInput, [number, number]][]) {
    const raw = (body as Record<string, unknown>)[key]
    if (raw === undefined || raw === null || raw === '') continue
    const value = Number(raw)
    if (!Number.isFinite(value) || value < min || value > max) return { error: `"${key}" must be a number between ${min} and ${max}` }
    input[key] = value
  }
  return { input }
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Pre-generated standard normal draws (Box-Muller), shared by every
// scenario so lever comparisons differ only by the lever, not by noise.
let normalCache: Float64Array | null = null
function normals(count: number): Float64Array {
  if (normalCache && normalCache.length >= count) return normalCache
  const rng = mulberry32(SEED)
  const out = new Float64Array(count)
  for (let i = 0; i < count; i += 2) {
    const u1 = Math.max(rng(), 1e-12)
    const u2 = rng()
    const r = Math.sqrt(-2 * Math.log(u1))
    out[i] = r * Math.cos(2 * Math.PI * u2)
    if (i + 1 < count) out[i + 1] = r * Math.sin(2 * Math.PI * u2)
  }
  normalCache = out
  return out
}

interface SimParams {
  start: number
  monthly: number
  years: number
  realReturnPct: number
  volPct: number
  target: number
  initialShockPct?: number
}

function percentile(sorted: Float64Array, p: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]
}

function simulate(p: SimParams): { probability: number; timeline: YearPoint[]; finals: Float64Array } {
  const months = Math.round(p.years * 12)
  const mu = Math.log(1 + p.realReturnPct / 100) / 12
  const sigma = p.volPct / 100 / Math.sqrt(12)
  const drift = mu - (sigma * sigma) / 2
  const z = normals(SIMULATIONS * Math.max(months, 1))
  const values = new Float64Array(SIMULATIONS).fill(p.start * (1 + (p.initialShockPct ?? 0) / 100))
  const timeline: YearPoint[] = [{ year: 0, p10: values[0], p50: values[0], p90: values[0], contributed: p.start }]
  for (let m = 0; m < months; m += 1) {
    for (let s = 0; s < SIMULATIONS; s += 1) {
      values[s] = values[s] * Math.exp(drift + sigma * z[s * months + m]) + p.monthly
    }
    if ((m + 1) % 12 === 0 || m === months - 1) {
      const sorted = Float64Array.from(values).sort()
      timeline.push({
        year: round((m + 1) / 12, 2),
        p10: round(percentile(sorted, 0.1), 0),
        p50: round(percentile(sorted, 0.5), 0),
        p90: round(percentile(sorted, 0.9), 0),
        contributed: round(p.start + p.monthly * (m + 1), 0),
      })
    }
  }
  const finals = Float64Array.from(values).sort()
  const reached = finals.reduce((n, v) => n + (v >= p.target ? 1 : 0), 0)
  return { probability: (reached / SIMULATIONS) * 100, timeline, finals }
}

function futureValue(start: number, monthly: number, months: number, annualPct: number): number {
  const r = Math.pow(1 + annualPct / 100, 1 / 12) - 1
  if (Math.abs(r) < 1e-9) return start + monthly * months
  const g = Math.pow(1 + r, months)
  return start * g + monthly * ((g - 1) / r)
}

// Average-return path with an optional one-off fall at a given month.
function pathWithShock(start: number, monthly: number, months: number, annualPct: number, shockMonth: number | null, shockPct: number): number {
  const r = Math.pow(1 + annualPct / 100, 1 / 12) - 1
  let value = start
  for (let m = 0; m < months; m += 1) {
    if (m === shockMonth) value *= 1 - shockPct / 100
    value = value * (1 + r) + monthly
  }
  return value
}

function requiredMonthly(start: number, target: number, months: number, annualPct: number): number {
  const r = Math.pow(1 + annualPct / 100, 1 / 12) - 1
  const g = Math.pow(1 + r, months)
  const gap = target - start * g
  if (gap <= 0) return 0
  return Math.abs(r) < 1e-9 ? gap / months : (gap * r) / (g - 1)
}

function monthsBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`)
  const b = new Date(`${to}T00:00:00Z`)
  return Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + (b.getUTCDate() >= a.getUTCDate() ? 0 : -1))
}

function statusFor(probability: number): GoalProjection['status'] {
  if (probability >= 75) return 'likely'
  if (probability >= 50) return 'possible'
  if (probability >= 25) return 'at_risk'
  return 'unlikely'
}

export function getGoals(customerId: string): Goal[] {
  return getGoalsFor(customerId)
}

export function projectGoal(customerId: string, input: ProjectionInput = {}, goalId?: string): GoalProjection {
  const customer = getCustomer(customerId)
  const { profile, assumption } = profileAssumption(customer?.risk_profile)
  const goals = getGoalsFor(customerId)
  const goal = (goalId ? goals.find((g) => g.goal_id === goalId) : goals[0]) ?? null
  const portfolio = calculatePortfolio(customerId)
  const savings = calculateMonthlySavings(customerId)
  const txs = getTransactionsFor(customerId)
  const months = new Set(txs.map((t) => t.date.slice(0, 7))).size || 1
  const monthlyInvesting = txs.filter((t) => t.category === 'Investments').reduce((s, t) => s + Math.abs(t.amount), 0) / months

  const inputs: ResolvedInput[] = []
  const resolve = (
    key: keyof ProjectionInput, label: string, unit: ResolvedInput['unit'],
    candidates: [number | undefined, InputSource, string][],
  ): number => {
    for (const [value, source, explanation] of candidates) {
      if (value !== undefined && Number.isFinite(value)) {
        inputs.push({ key, label, value: round(value, 2), unit, source, explanation })
        return value
      }
    }
    throw new Error(`No value for ${key}`)
  }

  const annualExpenses = savings.averageMonthlyExpenses * 12
  const target = resolve('target_amount', 'Målbeløp', 'NOK', [
    [input.target_amount, 'your_input', 'Beløpet du har lagt inn.'],
    [goal?.target_amount, 'registered_goal', `Fra det registrerte målet ditt «${goal?.name}».`],
    [Math.max(100000, Math.round((annualExpenses * 25) / 10000) * 10000), 'your_data',
      `Anslag for økonomisk uavhengighet: 25 × det årlige forbruket ditt (${kr(annualExpenses)}), etter «4 %-regelen».`],
  ])
  const goalYears = goal ? Math.max(1, monthsBetween(TODAY, goal.target_date) / 12) : undefined
  const years = resolve('years', 'År til målet', 'years', [
    [input.years, 'your_input', 'Tidshorisonten du har lagt inn.'],
    [goalYears, 'registered_goal', `Frem til måldatoen din ${goal ? dateName(goal.target_date) : ''}.`],
    [15, 'assumption', `Ingen måldato er registrert. 15 år er en vanlig horisont for økonomisk uavhengighet (oppgitt investeringshorisont: ${customer ? horizonName(customer.investment_horizon) : 'ukjent'}).`],
  ])
  const monthly = resolve('monthly_contribution', 'Månedlig sparing', 'NOK/month', [
    [input.monthly_contribution, 'your_input', 'Det månedlige beløpet du har lagt inn.'],
    [monthlyInvesting > 0 ? monthlyInvesting : undefined, 'your_data', `Gjennomsnittlige månedlige overføringer til investeringer de siste ${months} månedene.`],
    [Math.max(0, savings.averageMonthlySavings), 'your_data', 'Gjennomsnittlig månedlig overskudd (inntekt minus forbruk).'],
  ])
  const start = resolve('starting_amount', 'Investert i dag', 'NOK', [
    [input.starting_amount, 'your_input', 'Startbeløpet du har lagt inn.'],
    [portfolio.total_value, 'your_data', 'Dagens markedsverdi av investeringene dine.'],
  ])
  const nominal = resolve('annual_return_pct', 'Forventet avkastning (før inflasjon)', '%', [
    [input.annual_return_pct, 'your_input', 'Avkastningen du har valgt.'],
    [assumption.expected_annual_return_pct, 'assumption', `Typisk langsiktig avkastning for en «${profileName(profile)}»-blanding. Ikke et løfte.`],
  ])
  const vol = resolve('annual_volatility_pct', 'Årlige svingninger', '%', [
    [input.annual_volatility_pct, 'your_input', 'Svingningsnivået du har valgt.'],
    [assumption.expected_annual_volatility_pct, 'assumption', `Typiske årlige svingninger for en «${profileName(profile)}»-blanding.`],
  ])
  const real = nominal - ASSUMED_INFLATION_PCT

  const base: SimParams = { start, monthly, years, realReturnPct: real, volPct: vol, target }
  const sim = simulate(base)
  const median = percentile(sim.finals, 0.5)

  const leverDefs: { id: string; label: string; params: SimParams }[] = [
    { id: 'save-more', label: `Spar ${kr(1000)} mer per måned`, params: { ...base, monthly: monthly + 1000 } },
    { id: 'save-more-3000', label: `Spar ${kr(3000)} mer per måned`, params: { ...base, monthly: monthly + 3000 } },
    { id: 'wait-longer', label: 'Gi det 3 år ekstra', params: { ...base, years: years + 3 } },
    { id: 'early-crash', label: 'Markedet faller 25 % med en gang', params: { ...base, initialShockPct: -25 } },
    { id: 'lower-return', label: 'Avkastningen blir 2 prosentpoeng lavere hvert år', params: { ...base, realReturnPct: real - 2 } },
  ]
  const levers: Lever[] = leverDefs.map((l) => {
    const r = simulate(l.params)
    return {
      id: l.id,
      label: l.label,
      probability_pct: round(r.probability, 0),
      median_value: round(percentile(r.finals, 0.5), 0),
      delta_probability_pct: round(r.probability - sim.probability, 0),
    }
  })

  const totalMonths = Math.round(years * 12)
  const required = requiredMonthly(start, target, totalMonths, real)
  let yearsNeeded: number | null = null
  for (let m = 1; m <= 600; m += 1) {
    if (futureValue(start, monthly, m, real) >= target) { yearsNeeded = round(m / 12, 1); break }
  }

  let planCheck: GoalProjection['plan_check'] = null
  if (goal) {
    const m = monthsBetween(goal.created_at, TODAY)
    const planned = futureValue(goal.plan.starting_amount, goal.plan.monthly_contribution, m, goal.plan.assumed_annual_return_pct)
    const diff = portfolio.total_value - planned
    const tolerance = planned * 0.02
    planCheck = {
      months_since_start: m,
      planned_value_today: round(planned, 0),
      actual_value_today: round(portfolio.total_value, 0),
      difference: round(diff, 0),
      verdict: diff > tolerance ? 'ahead' : diff < -tolerance ? 'behind' : 'on_plan',
    }
  }

  const probability = round(sim.probability, 0)

  // --- How market development affects the goal ---------------------------
  const pessimistic = percentile(sim.finals, 0.1)
  const optimistic = percentile(sim.finals, 0.9)
  const paidIn = start + monthly * totalMonths
  const marketGrowth = median - paidIn
  const valuePerPoint = futureValue(start, monthly, totalMonths, real + 1) - futureValue(start, monthly, totalMonths, real)
  const lateCrashMonth = Math.max(0, totalMonths - 12)
  const timing = {
    crash_pct: CRASH_PCT,
    no_crash: round(pathWithShock(start, monthly, totalMonths, real, null, 0), 0),
    crash_early: round(pathWithShock(start, monthly, totalMonths, real, 0, CRASH_PCT), 0),
    crash_late: round(pathWithShock(start, monthly, totalMonths, real, lateCrashMonth, CRASH_PCT), 0),
    late_crash_year: round(lateCrashMonth / 12, 1),
  }
  let recent: MarketImpact['recent'] = null
  if (portfolio.total_value > 0 && input.starting_amount === undefined) {
    // Holdings are kept constant in the 90-day explanation, so its change is
    // pure market movement. Re-run the goal as if that had not happened.
    const moved = explainPerformance(customerId, 90)
    const without = simulate({ ...base, start: Math.max(0, start - moved.change_value) })
    recent = {
      days: moved.period.days,
      change_value: round(moved.change_value, 0),
      probability_without_change_pct: round(without.probability, 0),
      probability_now_pct: probability,
    }
  }
  const marketExplanation: string[] = []
  if (recent) {
    const dir = recent.change_value >= 0 ? 'steg' : 'falt'
    const delta = recent.probability_now_pct - recent.probability_without_change_pct
    const effect = delta === 0
      ? 'Det endret ikke sjansen for å nå målet merkbart'
      : `Det flyttet sjansen for å nå målet fra ${recent.probability_without_change_pct} % til ${recent.probability_now_pct} % (${delta > 0 ? '+' : ''}${delta} prosentpoeng)`
    marketExplanation.push(`De siste ${recent.days} dagene ${dir} investeringene dine ${kr(recent.change_value)} på grunn av markedet alene. ${effect}. Korte svingninger betyr lite for et mål ${num(years)} år frem i tid.`)
  }
  if (marketGrowth > 0) {
    marketExplanation.push(`I et typisk utfall på ${kr(median)} er ${kr(paidIn)} penger du selv betaler inn, og ${kr(marketGrowth)} (${pct((marketGrowth / median) * 100, 0)}) er avkastning fra markedet. Jo lengre tid, jo større del kommer fra markedet.`)
  } else {
    marketExplanation.push(`I et typisk utfall på ${kr(median)} betaler du inn ${kr(paidIn)} selv. Etter inflasjon gir markedet lite netto vekst med disse antakelsene, så sparingen din er det som driver målet.`)
  }
  marketExplanation.push(`Forskjellen mellom et svakt og et sterkt marked er ${kr(optimistic - pessimistic)} på måldatoen. Det spennet kan du ikke styre, men du kan styre sparebeløp, tid og risikonivå.`)
  marketExplanation.push(`Hvert prosentpoeng høyere eller lavere årlig avkastning utgjør rundt ${kr(valuePerPoint)} på måldatoen.`)
  const lateText = `Kommer et fall på ${CRASH_PCT} % det siste året før målet, ender du på rundt ${kr(timing.crash_late)} i stedet for ${kr(timing.no_crash)}, fordi det rammer hele den oppsparte summen rett før du trenger den.`
  marketExplanation.push(start > 0
    ? `Når et fall kommer, betyr mye: faller markedet ${CRASH_PCT} % det første året, ender du på rundt ${kr(timing.crash_early)}, fordi du har tid til å hente deg inn og kjøper billig underveis. ${lateText} Derfor er det vanlig å redusere risikoen gradvis når målet nærmer seg.`
    : `Du har ingenting investert ennå, så et markedsfall nå ville ikke kostet deg noe. ${lateText} Derfor er det vanlig å redusere risikoen gradvis når målet nærmer seg.`)

  const marketImpact: MarketImpact = {
    recent,
    composition: {
      paid_in: round(paidIn, 0),
      market_growth: round(marketGrowth, 0),
      median: round(median, 0),
      market_share_pct: median > 0 ? round(Math.max(0, marketGrowth / median) * 100, 1) : 0,
    },
    spread: { pessimistic: round(pessimistic, 0), optimistic: round(optimistic, 0), difference: round(optimistic - pessimistic, 0) },
    value_per_return_point: round(valuePerPoint, 0),
    timing,
    explanation: marketExplanation,
  }
  const status = statusFor(probability)
  const summary: string[] = []
  const statusText: Record<GoalProjection['status'], string> = {
    likely: 'du er sannsynligvis i rute',
    possible: 'det er mulig å nå målet, men langt fra sikkert',
    at_risk: 'målet er i fare med dagens plan',
    unlikely: 'målet er lite sannsynlig uten endringer',
  }
  summary.push(`I ${probability} % av ${SIMULATIONS.toLocaleString('nb-NO')} simulerte markedsforløp når du ${kr(target)} innen ${num(years)} år, så ${statusText[status]}.`)
  summary.push(`Et typisk utfall er ${kr(median)} (i dagens kroner). I et svakt marked kan det bli ${kr(percentile(sim.finals, 0.1))}, i et sterkt ${kr(percentile(sim.finals, 0.9))}.`)
  if (required > monthly) summary.push(`For å nå målet med gjennomsnittlig avkastning må du spare rundt ${kr(required)} per måned i stedet for ${kr(monthly)}.`)
  else summary.push(`Med gjennomsnittlig avkastning er dagens sparing på ${kr(monthly)} per måned nok.`)
  if (yearsNeeded && yearsNeeded > years) summary.push(`Med dagens tempo og gjennomsnittlig avkastning når du målet om rundt ${num(yearsNeeded)} år.`)
  if (planCheck) {
    summary.push(planCheck.verdict === 'on_plan'
      ? `Du er akkurat i rute med planen du lagde for ${planCheck.months_since_start} måneder siden.`
      : `Sammenlignet med planen du lagde for ${planCheck.months_since_start} måneder siden ligger du ${kr(Math.abs(planCheck.difference))} ${planCheck.verdict === 'ahead' ? 'foran' : 'bak'}.`)
  }

  const limitations = [
    `Transaksjonene dekker bare ${months} måneder, så den månedlige sparingen er et grovt anslag.`,
    'Skatt, gebyrer og endringer i inntekt eller forbruk er ikke tatt med.',
    'Markedet kan oppføre seg annerledes enn før. Dette er et spenn av scenarioer, ikke en prognose eller et løfte.',
  ]
  if (!goal) limitations.unshift('Du har ikke registrert noe mål, så målbeløp og tidshorisont er anslag du bør justere.')
  if (portfolio.total_value === 0) limitations.unshift('Du har ingen investeringer ennå, så fremskrivingen starter fra null.')

  return {
    customer_id: customerId,
    goal,
    inputs,
    probability_pct: probability,
    status,
    outcomes: {
      pessimistic: round(percentile(sim.finals, 0.1), 0),
      median: round(median, 0),
      optimistic: round(percentile(sim.finals, 0.9), 0),
    },
    timeline: sim.timeline,
    required_monthly_contribution: round(required, 0),
    years_needed_at_current_pace: yearsNeeded,
    plan_check: planCheck,
    levers,
    market_impact: marketImpact,
    summary,
    data_quality: {
      assumptions: [
        `Beløpene er i dagens kroner: avkastningen er redusert med ${ASSUMED_INFLATION_PCT} % antatt inflasjon (${pct(nominal)} - ${ASSUMED_INFLATION_PCT} % = ${pct(real)} realavkastning).`,
        `${SIMULATIONS.toLocaleString('nb-NO')} markedsforløp med ${pct(vol)} årlige svingninger, med fast startverdi for tilfeldighetene slik at samme input alltid gir samme resultat.`,
        'Svakt / sterkt marked = de 1 av 10 dårligste / beste utfallene.',
        'Den månedlige sparingen investeres ved slutten av hver måned og holdes konstant.',
      ],
      limitations,
    },
  }
}
