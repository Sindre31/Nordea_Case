import { Router } from 'express'
import { customers, getAccountsFor, getAllHoldings, getAllInstruments, getCustomer, getInvestmentsFor, getTransactionsFor } from '../data.js'
import { calculatePortfolio, calculatePerformance } from '../services/portfolio.js'
import { calculateRisk } from '../services/risk.js'
import { generateInsights } from '../services/insights.js'
import { deterministicCopilot } from '../services/copilot.js'
import { explainPerformance, parsePeriodDays } from '../services/attribution.js'
import { explainRisk } from '../services/riskBreakdown.js'
import { getGoals, projectGoal, validateProjectionInput } from '../services/goals.js'

export const customersRouter = Router()

function requireCustomer(customerId: string) {
  return getCustomer(customerId)
}

// GET /instruments - all unique instruments in the fictional universe.
customersRouter.get('/instruments', (_req, res) => {
  const instruments = getAllInstruments()
  res.json({ count: instruments.length, instruments })
})

// GET /holdings - all holdings across all customers (flattened).
customersRouter.get('/holdings', (_req, res) => {
  const holdings = getAllHoldings()
  res.json({ count: holdings.length, holdings })
})

// GET /customers - list all fictional customers (summary fields only).
customersRouter.get('/', (_req, res) => {
  res.json({ count: customers.length, customers })
})

// GET /customers/:customerId - single customer profile.
customersRouter.get('/:customerId', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json(customer)
})

// GET /customers/:customerId/accounts
customersRouter.get('/:customerId/accounts', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json({ customer_id: customer.customer_id, accounts: getAccountsFor(customer.customer_id) })
})

// GET /customers/:customerId/transactions
customersRouter.get('/:customerId/transactions', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const transactions = getTransactionsFor(customer.customer_id)
  res.json({ customer_id: customer.customer_id, count: transactions.length, transactions })
})

// GET /customers/:customerId/investments
customersRouter.get('/:customerId/investments', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json({ customer_id: customer.customer_id, investments: getInvestmentsFor(customer.customer_id) })
})

// GET /customers/:customerId/portfolio - derived allocations & valuation.
customersRouter.get('/:customerId/portfolio', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json(calculatePortfolio(customer.customer_id))
})

// GET /customers/:customerId/performance - historical value series.
customersRouter.get('/:customerId/performance', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json(calculatePerformance(customer.customer_id))
})

// GET /customers/:customerId/performance/explain?days=30|60|90 - case A:
// what drove the change, market vs. own choices, and whether it was expected.
customersRouter.get('/:customerId/performance/explain', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const days = parsePeriodDays(req.query.days)
  if (days === null) return res.status(400).json({ error: 'Query parameter "days" must be 30, 60 or 90' })
  res.json(explainPerformance(customer.customer_id, days))
})

// GET /customers/:customerId/risk/explain - case B: where the risk comes from.
customersRouter.get('/:customerId/risk/explain', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json(explainRisk(customer.customer_id))
})

// GET /customers/:customerId/goals - registered financial goals (may be empty).
customersRouter.get('/:customerId/goals', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json({ customer_id: customer.customer_id, goals: getGoals(customer.customer_id) })
})

// POST /customers/:customerId/goals/projection - case C: scenario-based goal
// projection. Body fields are all optional; missing values are filled from
// the registered goal, the customer's data or labelled assumptions.
customersRouter.post('/:customerId/goals/projection', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const validated = validateProjectionInput(req.body)
  if ('error' in validated) return res.status(400).json({ error: validated.error })
  const goalId = typeof req.body?.goal_id === 'string' ? req.body.goal_id : undefined
  res.json(projectGoal(customer.customer_id, validated.input, goalId))
})

// GET /customers/:customerId/risk - illustrative demo risk score.
customersRouter.get('/:customerId/risk', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json(calculateRisk(customer.customer_id))
})

// GET /customers/:customerId/insights - deterministic rule-based insights.
customersRouter.get('/:customerId/insights', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json(generateInsights(customer.customer_id))
})

// POST /customers/:customerId/copilot - chat-style Q&A over the customer's
// own data. Body: { message: string }. Deterministic today; see
// services/copilot.ts for how a real LLM could be plugged in later.
customersRouter.post('/:customerId/copilot', (req, res) => {
  const customer = requireCustomer(req.params.customerId)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const message = typeof req.body?.message === 'string' ? req.body.message : ''
  if (!message.trim()) return res.status(400).json({ error: 'Request body must include a non-empty "message" string' })
  res.json(deterministicCopilot.answer(customer.customer_id, message))
})
