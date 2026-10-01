// Thin fetch wrapper for the Wealth Copilot API.
//
// The API base URL is configurable via VITE_API_URL so the same frontend
// build can point at a local dev server or a deployed API without code
// changes. Defaults to localhost:3000 for local development.
import type {
  Account,
  Customer,
  CopilotReply,
  Goal,
  GoalProjection,
  InsightsSummary,
  Investment,
  PerformanceExplanation,
  PerformanceSummary,
  PortfolioSummary,
  ProjectionInput,
  RiskExplanation,
  RiskSummary,
  Transaction,
} from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function fetchHealth(): Promise<{ status: string }> {
  return getJson('/health')
}

export async function fetchCustomers(): Promise<{ count: number; customers: Customer[] }> {
  return getJson('/customers')
}

export async function fetchCustomer(customerId: string): Promise<Customer> {
  return getJson(`/customers/${customerId}`)
}

export async function fetchAccounts(customerId: string): Promise<{ accounts: Account[] }> {
  return getJson(`/customers/${customerId}/accounts`)
}

export async function fetchTransactions(customerId: string): Promise<{ transactions: Transaction[] }> {
  return getJson(`/customers/${customerId}/transactions`)
}

export async function fetchInvestments(customerId: string): Promise<{ investments: Investment[] }> {
  return getJson(`/customers/${customerId}/investments`)
}

export async function fetchPortfolio(customerId: string): Promise<PortfolioSummary> {
  return getJson(`/customers/${customerId}/portfolio`)
}

export async function fetchPerformance(customerId: string): Promise<PerformanceSummary> {
  return getJson(`/customers/${customerId}/performance`)
}

export async function fetchRisk(customerId: string): Promise<RiskSummary> {
  return getJson(`/customers/${customerId}/risk`)
}

export async function fetchInsights(customerId: string): Promise<InsightsSummary> {
  return getJson(`/customers/${customerId}/insights`)
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function askCopilot(customerId: string, message: string): Promise<CopilotReply> {
  return postJson(`/customers/${customerId}/copilot`, { message })
}

export async function fetchPerformanceExplanation(customerId: string, days = 90): Promise<PerformanceExplanation> {
  return getJson(`/customers/${customerId}/performance/explain?days=${days}`)
}

export async function fetchRiskExplanation(customerId: string): Promise<RiskExplanation> {
  return getJson(`/customers/${customerId}/risk/explain`)
}

export async function fetchGoals(customerId: string): Promise<{ goals: Goal[] }> {
  return getJson(`/customers/${customerId}/goals`)
}

export async function fetchGoalProjection(customerId: string, input: ProjectionInput = {}): Promise<GoalProjection> {
  return postJson(`/customers/${customerId}/goals/projection`, input)
}
