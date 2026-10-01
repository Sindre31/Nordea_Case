// Tests for the three workshop cases: A (performance explained),
// B (risk explained) and C (goal projection). Each covers a normal case and
// at least one case where data is missing or input is invalid.
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { customers, getInvestmentsFor } from '../src/data.js'

const app = createApp()
const ANNE = 'CUST-00101'
const JONAS = 'CUST-00102'
const MARIA = 'CUST-00103'
const noInvestments = customers.find((c) => getInvestmentsFor(c.customer_id).length === 0)

describe('Case A: GET /customers/:id/performance/explain', () => {
  it('contributions add up to the total change', async () => {
    const res = await request(app).get(`/customers/${ANNE}/performance/explain?days=90`)
    expect(res.status).toBe(200)
    const sum = res.body.contributions.reduce((s: number, c: { change_value: number }) => s + c.change_value, 0)
    expect(sum).toBeCloseTo(res.body.change_value, 0)
    expect(res.body.end_value - res.body.start_value).toBeCloseTo(res.body.change_value, 0)
  })

  it('splits the result into market and own choices that add up', async () => {
    const res = await request(app).get(`/customers/${ANNE}/performance/explain`)
    const m = res.body.market_vs_choices
    expect(m.market_effect_value + m.choices_effect_value).toBeCloseTo(res.body.change_value, 0)
    expect(res.body.expected_range.low_pct).toBeLessThan(res.body.expected_range.high_pct)
    expect(res.body.summary.length).toBeGreaterThan(2)
  })

  it('supports shorter periods and rejects unsupported ones', async () => {
    const ok = await request(app).get(`/customers/${ANNE}/performance/explain?days=30`)
    expect(ok.body.period.days).toBe(30)
    const bad = await request(app).get(`/customers/${ANNE}/performance/explain?days=180`)
    expect(bad.status).toBe(400)
  })

  it('flags new money that cannot be separated from growth', async () => {
    const res = await request(app).get(`/customers/${ANNE}/performance/explain`)
    expect(res.body.data_quality.net_new_money_in_period).toBeGreaterThan(0)
    expect(res.body.data_quality.limitations[0]).toMatch(/overførte .* til investeringer/)
  })

  it('handles a customer without investments', async () => {
    if (!noInvestments) return
    const res = await request(app).get(`/customers/${noInvestments.customer_id}/performance/explain`)
    expect(res.status).toBe(200)
    expect(res.body.change_value).toBe(0)
    expect(res.body.summary[0]).toMatch(/ingen investeringer/)
  })
})

describe('Case B: GET /customers/:id/risk/explain', () => {
  it('risk contributions sum to 100%', async () => {
    const res = await request(app).get(`/customers/${JONAS}/risk/explain`)
    expect(res.status).toBe(200)
    const sum = res.body.contributions.reduce((s: number, c: { risk_contribution_pct: number }) => s + c.risk_contribution_pct, 0)
    expect(sum).toBeGreaterThan(99)
    expect(sum).toBeLessThan(101)
  })

  it('shows Jonas that tech drives his risk and exceeds his moderate profile', async () => {
    const res = await request(app).get(`/customers/${JONAS}/risk/explain`)
    expect(res.body.alignment).toBe('above')
    expect(res.body.by_sector[0].label).toBe('Teknologi')
    expect(res.body.by_sector[0].risk_contribution_pct).toBeGreaterThan(res.body.by_sector[0].weight_pct)
    expect(res.body.stress_tests[0].id).toBe('tech-selloff')
    expect(res.body.what_if.new_volatility_pct).toBeLessThan(res.body.portfolio_volatility_pct)
  })

  it('handles a customer without investments', async () => {
    if (!noInvestments) return
    const res = await request(app).get(`/customers/${noInvestments.customer_id}/risk/explain`)
    expect(res.status).toBe(200)
    expect(res.body.portfolio_volatility_pct).toBe(0)
    expect(res.body.what_if).toBeNull()
  })
})

describe('Case C: goals and projection', () => {
  it('returns Maria\'s registered goal', async () => {
    const res = await request(app).get(`/customers/${MARIA}/goals`)
    expect(res.status).toBe(200)
    expect(res.body.goals).toHaveLength(1)
  })

  it('projects a range of outcomes and compares with the plan', async () => {
    const res = await request(app).post(`/customers/${MARIA}/goals/projection`).send({})
    expect(res.status).toBe(200)
    const { pessimistic, median, optimistic } = res.body.outcomes
    expect(pessimistic).toBeLessThan(median)
    expect(median).toBeLessThan(optimistic)
    expect(res.body.plan_check.verdict).toMatch(/ahead|behind|on_plan/)
    expect(res.body.inputs.find((i: { key: string }) => i.key === 'target_amount').source).toBe('registered_goal')
  })

  it('is deterministic and responds to levers', async () => {
    const a = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ monthly_contribution: 7000 })
    const b = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ monthly_contribution: 7000 })
    const more = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ monthly_contribution: 12000 })
    expect(a.body.probability_pct).toBe(b.body.probability_pct)
    expect(more.body.probability_pct).toBeGreaterThan(a.body.probability_pct)
    expect(a.body.inputs.find((i: { key: string }) => i.key === 'monthly_contribution').source).toBe('your_input')
  })

  it('labels estimates when no goal is registered', async () => {
    const res = await request(app).post(`/customers/${JONAS}/goals/projection`).send({})
    expect(res.status).toBe(200)
    expect(res.body.goal).toBeNull()
    expect(res.body.data_quality.limitations[0]).toMatch(/ikke registrert noe mål/)
  })

  it('explains how the market affects the goal', async () => {
    const res = await request(app).post(`/customers/${MARIA}/goals/projection`).send({})
    const m = res.body.market_impact
    expect(m.composition.paid_in + m.composition.market_growth).toBeCloseTo(m.composition.median, -1)
    expect(m.spread.difference).toBe(m.spread.optimistic - m.spread.pessimistic)
    expect(m.value_per_return_point).toBeGreaterThan(0)
    // The same fall hurts more right before the goal than at the start.
    expect(m.timing.crash_late).toBeLessThan(m.timing.crash_early)
    expect(m.timing.crash_early).toBeLessThan(m.timing.no_crash)
    expect(m.recent.days).toBe(90)
    expect(m.explanation.length).toBeGreaterThan(3)
  })

  it('has no recent market effect for a customer without investments', async () => {
    if (!noInvestments) return
    const res = await request(app).post(`/customers/${noInvestments.customer_id}/goals/projection`).send({})
    expect(res.body.market_impact.recent).toBeNull()
    expect(res.body.market_impact.explanation.join(' ')).toMatch(/ingenting investert/)
  })

  it('uses current spending as default and derives the target from chosen spending', async () => {
    const base = await request(app).post(`/customers/${JONAS}/goals/projection`).send({})
    const spending = base.body.inputs.find((i: { key: string }) => i.key === 'monthly_spending')
    expect(spending.source).toBe('your_data')
    expect(spending.value).toBeGreaterThan(0)

    const chosen = await request(app).post(`/customers/${JONAS}/goals/projection`).send({ monthly_spending: 20000 })
    const target = chosen.body.inputs.find((i: { key: string }) => i.key === 'target_amount')
    expect(target.value).toBe(20000 * 12 * 25)
    expect(target.source).toBe('your_input')

    const lower = await request(app).post(`/customers/${JONAS}/goals/projection`).send({ monthly_spending: 15000 })
    expect(lower.body.probability_pct).toBeGreaterThanOrEqual(chosen.body.probability_pct)
  })

  it('lets chosen spending replace a registered goal, and a chosen target win over spending', async () => {
    const fromSpending = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ monthly_spending: 10000 })
    expect(fromSpending.body.inputs.find((i: { key: string }) => i.key === 'target_amount').value).toBe(3000000)
    const both = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ monthly_spending: 10000, target_amount: 2000000 })
    expect(both.body.inputs.find((i: { key: string }) => i.key === 'target_amount').value).toBe(2000000)
    expect(both.body.inputs.find((i: { key: string }) => i.key === 'monthly_spending').explanation).toMatch(/Påvirker ikke målet/)
  })

  it('compares a smaller goal with full financial independence', async () => {
    const res = await request(app).post(`/customers/${MARIA}/goals/projection`).send({})
    const x = res.body.independence
    expect(x.goal_is_partial).toBe(true)
    expect(x.goal_monthly_income).toBe(1500000 * 0.04 / 12)
    expect(x.target).toBeGreaterThan(x.goal_target)
    expect(x.coverage_pct).toBeLessThan(100)
    expect(res.body.summary[0]).toMatch(/Full økonomisk uavhengighet/)
    // When the target is set from spending, the goal IS full independence.
    const full = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ monthly_spending: 23000 })
    expect(full.body.independence.goal_is_partial).toBe(false)
  })

  it('rejects invalid input', async () => {
    const res = await request(app).post(`/customers/${MARIA}/goals/projection`).send({ years: -3 })
    expect(res.status).toBe(400)
  })
})

describe('Copilot explains its sources', () => {
  it.each([
    ['Hvorfor endret porteføljen min seg?', 'performance-drivers'],
    ['Var dette forventet for risikoprofilen min?', 'performance-drivers'],
    ['Hvor kommer risikoen min fra?', 'risk-sources'],
    ['Er jeg i rute til å nå målet mitt?', 'goal'],
    ['Hvordan påvirker markedet målet mitt?', 'goal-market'],
    ['Hvordan har porteføljen min utviklet seg?', 'performance'],
    ['Hvorfor har risikoen min økt?', 'risk-change'],
    ['Er jeg godt nok diversifisert?', 'diversification'],
    ['Hvor mye sparer jeg hver måned?', 'savings'],
    ['Hva er de største risikoene i porteføljen min?', 'largest-risks'],
    // English questions still work.
    ['Why did my portfolio change?', 'performance-drivers'],
    ['Where does my risk come from?', 'risk-sources'],
    ['Am I on track for my goal?', 'goal'],
  ])('"%s" -> %s', async (message, intent) => {
    const res = await request(app).post(`/customers/${MARIA}/copilot`).send({ message })
    expect(res.status).toBe(200)
    expect(res.body.matched_intent).toBe(intent)
    expect(res.body.sources.length).toBeGreaterThan(0)
  })
})
