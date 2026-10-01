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
import { calculateMonthlySavings } from './insights.js'
import { ASSUMED_INFLATION_PCT, profileAssumption, round } from './assumptions.js'

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
  summary: string[]
  data_quality: { assumptions: string[]; limitations: string[] }
}

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

function nok(v: number): string {
  return `${Math.round(v).toLocaleString('en-US')} NOK`
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
  const target = resolve('target_amount', 'Target amount', 'NOK', [
    [input.target_amount, 'your_input', 'The amount you entered.'],
    [goal?.target_amount, 'registered_goal', `From your registered goal "${goal?.name}".`],
    [Math.max(100000, Math.round((annualExpenses * 25) / 10000) * 10000), 'your_data',
      `Financial independence estimate: 25 x your yearly spending (${nok(annualExpenses)}), the "4% rule of thumb".`],
  ])
  const goalYears = goal ? Math.max(1, monthsBetween(TODAY, goal.target_date) / 12) : undefined
  const years = resolve('years', 'Years to goal', 'years', [
    [input.years, 'your_input', 'The time horizon you entered.'],
    [goalYears, 'registered_goal', `Until your goal date ${goal?.target_date}.`],
    [15, 'assumption', `No goal date registered. 15 years is a typical horizon for financial independence (your stated investment horizon is ${customer?.investment_horizon ?? 'unknown'}).`],
  ])
  const monthly = resolve('monthly_contribution', 'Monthly saving', 'NOK/month', [
    [input.monthly_contribution, 'your_input', 'The monthly amount you entered.'],
    [monthlyInvesting > 0 ? monthlyInvesting : undefined, 'your_data', `Average monthly transfers to investments over the last ${months} month(s).`],
    [Math.max(0, savings.averageMonthlySavings), 'your_data', 'Your average monthly surplus (income minus spending).'],
  ])
  const start = resolve('starting_amount', 'Invested today', 'NOK', [
    [input.starting_amount, 'your_input', 'The starting amount you entered.'],
    [portfolio.total_value, 'your_data', 'Current market value of your investments.'],
  ])
  const nominal = resolve('annual_return_pct', 'Expected return (before inflation)', '%', [
    [input.annual_return_pct, 'your_input', 'The return you chose.'],
    [assumption.expected_annual_return_pct, 'assumption', `Typical long-run return for a "${profile}" mix. Not a promise.`],
  ])
  const vol = resolve('annual_volatility_pct', 'Yearly swings', '%', [
    [input.annual_volatility_pct, 'your_input', 'The level of swings you chose.'],
    [assumption.expected_annual_volatility_pct, 'assumption', `Typical yearly swings for a "${profile}" mix.`],
  ])
  const real = nominal - ASSUMED_INFLATION_PCT

  const base: SimParams = { start, monthly, years, realReturnPct: real, volPct: vol, target }
  const sim = simulate(base)
  const median = percentile(sim.finals, 0.5)

  const leverDefs: { id: string; label: string; params: SimParams }[] = [
    { id: 'save-more', label: `Save ${nok(1000)} more per month`, params: { ...base, monthly: monthly + 1000 } },
    { id: 'save-more-3000', label: `Save ${nok(3000)} more per month`, params: { ...base, monthly: monthly + 3000 } },
    { id: 'wait-longer', label: 'Give it 3 more years', params: { ...base, years: years + 3 } },
    { id: 'early-crash', label: 'Markets fall 25% right away', params: { ...base, initialShockPct: -25 } },
    { id: 'lower-return', label: 'Returns 2 points lower each year', params: { ...base, realReturnPct: real - 2 } },
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
  const status = statusFor(probability)
  const summary: string[] = []
  const statusText: Record<GoalProjection['status'], string> = {
    likely: 'you are likely on track',
    possible: 'reaching the goal is possible, but far from certain',
    at_risk: 'the goal is at risk with today\'s plan',
    unlikely: 'the goal is unlikely without changes',
  }
  summary.push(`In ${probability}% of ${SIMULATIONS.toLocaleString('en-US')} simulated market paths you reach ${nok(target)} within ${round(years, 1)} years, so ${statusText[status]}.`)
  summary.push(`A typical outcome is ${nok(median)} (in today's money). In a weak market it could be ${nok(percentile(sim.finals, 0.1))}; in a strong one ${nok(percentile(sim.finals, 0.9))}.`)
  if (required > monthly) summary.push(`To reach the goal with average returns you would need to save about ${nok(required)} per month instead of ${nok(monthly)}.`)
  else summary.push(`With average returns your current saving of ${nok(monthly)} per month is enough.`)
  if (yearsNeeded && yearsNeeded > years) summary.push(`At your current pace and average returns you would reach it in about ${yearsNeeded} years.`)
  if (planCheck) {
    summary.push(planCheck.verdict === 'on_plan'
      ? `You are right on the plan you made ${planCheck.months_since_start} months ago.`
      : `Compared with the plan you made ${planCheck.months_since_start} months ago you are ${nok(Math.abs(planCheck.difference))} ${planCheck.verdict}.`)
  }

  const limitations = [
    `Transactions only cover ${months} month(s), so your monthly saving is a rough estimate.`,
    'Taxes, fees and changes in income or spending are not included.',
    'Markets can behave differently from the past - this is a range of scenarios, not a forecast or a promise.',
  ]
  if (!goal) limitations.unshift('No goal is registered for you, so the target and time horizon are estimates you should adjust.')
  if (portfolio.total_value === 0) limitations.unshift('You have no investments yet; the projection starts from zero.')

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
    summary,
    data_quality: {
      assumptions: [
        `Amounts are in today's money: returns are reduced by ${ASSUMED_INFLATION_PCT}% assumed inflation (${nominal}% - ${ASSUMED_INFLATION_PCT}% = ${round(real, 1)}% real return).`,
        `${SIMULATIONS.toLocaleString('en-US')} market paths with ${vol}% yearly swings, using a fixed random seed so the same inputs always give the same result.`,
        'Pessimistic / optimistic = 1 in 10 worst / best outcomes.',
        'Monthly saving is invested at the end of each month and kept constant.',
      ],
      limitations,
    },
  }
}
