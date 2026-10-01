// Shared frontend/API contract types. Intentionally simple, hand-written
// copies of the shapes returned by /api - kept close to the source of
// truth in api/src/types.ts and api/src/services/*.ts for readability
// during the workshop rather than sharing a build-time package.

export interface Customer {
  customer_id: string
  first_name: string
  last_name: string
  age: number
  country: string
  risk_profile: string
  investment_horizon: string
  annual_income: number
  customer_since: string
}

export interface Account {
  account_id: string
  customer_id: string
  account_type: string
  currency: string
  balance: number
}

export interface Transaction {
  transaction_id: string
  customer_id: string
  account_id: string
  date: string
  type: 'credit' | 'debit' | 'transfer'
  category: string
  description: string
  amount: number
  currency: string
}

export interface Investment {
  investment_id: string
  customer_id: string
  account_id: string
  asset_type: string
  ticker: string
  name: string
  quantity: number
  purchase_price: number
  current_price: number
  currency: string
  sector: string
  geography: string
}

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

export interface RiskSummary {
  customer_id: string
  risk_score: number
  risk_category: 'Low' | 'Medium' | 'High'
  factors: {
    asset_allocation_score: number
    concentration_score: number
    geography_score: number
    volatility_score: number
  }
  customer_risk_profile: string
  risk_profile_alignment: string
  disclaimer: string
}

export interface Insight {
  id: string
  severity: 'info' | 'notice' | 'warning'
  title: string
  detail: string
}

export interface InsightsSummary {
  customer_id: string
  insights: Insight[]
  savings: {
    averageMonthlyIncome: number
    averageMonthlyExpenses: number
    averageMonthlySavings: number
    savingsRatePct: number
  }
}

export interface CopilotReply {
  answer: string
  matched_intent: string
  sources: string[]
  follow_ups: string[]
}

export interface DataQuality {
  assumptions: string[]
  limitations: string[]
}

// --- Case A: performance explained ------------------------------------------
export interface ContributionRow {
  ticker: string
  name: string
  asset_type: string
  sector: string
  start_value: number
  end_value: number
  change_value: number
  return_pct: number
  contribution_pct_points: number
  weight_start_pct: number
}

export interface GroupContribution {
  label: string
  change_value: number
  contribution_pct_points: number
}

export interface PerformanceExplanation {
  customer_id: string
  period: { start_date: string; end_date: string; days: number; max_days_available: number }
  start_value: number
  end_value: number
  change_value: number
  change_pct: number
  contributions: ContributionRow[]
  by_asset_type: GroupContribution[]
  by_sector: GroupContribution[]
  market_vs_choices: {
    reference_portfolio: { name: string; composition: { ticker: string; name: string; weight_pct: number }[] }
    market_return_pct: number
    choices_effect_pct_points: number
    market_effect_value: number
    choices_effect_value: number
    verdict: 'mostly_market' | 'mostly_choices' | 'mixed'
  }
  expected_range: { risk_profile: string; low_pct: number; expected_pct: number; high_pct: number; verdict: 'within' | 'above' | 'below' }
  summary: string[]
  data_quality: DataQuality & { data_as_of: string; net_new_money_in_period: number }
}

// --- Case B: risk explained ---------------------------------------------------
export interface RiskContributionRow {
  ticker: string
  name: string
  asset_type: string
  sector: string
  geography: string
  value: number
  weight_pct: number
  own_volatility_pct: number
  risk_contribution_pct: number
}

export interface GroupRisk {
  label: string
  weight_pct: number
  risk_contribution_pct: number
}

export interface StressTest {
  id: string
  name: string
  description: string
  impact_value: number
  impact_pct: number
}

export interface RiskExplanation {
  customer_id: string
  total_value: number
  portfolio_volatility_pct: number
  risk_profile: string
  profile_band_pct: { min: number; max: number }
  profile_description: string
  alignment: 'within' | 'above' | 'below'
  equity_share_pct: number
  profile_equity_share_pct: number
  contributions: RiskContributionRow[]
  by_sector: GroupRisk[]
  by_geography: GroupRisk[]
  by_asset_type: GroupRisk[]
  bad_month: { loss_value: number; loss_pct: number; frequency: string }
  stress_tests: StressTest[]
  drift: { since: string; rows: { label: string; start_pct: number; now_pct: number }[] }
  what_if: { description: string; new_volatility_pct: number; new_bad_month_loss: number } | null
  summary: string[]
  data_quality: DataQuality
}

// --- Case C: goals ------------------------------------------------------------
export interface Goal {
  goal_id: string
  customer_id: string
  type: string
  name: string
  target_amount: number
  target_date: string
  created_at: string
  plan: { starting_amount: number; monthly_contribution: number; assumed_annual_return_pct: number }
}

export interface ProjectionInput {
  target_amount?: number
  years?: number
  monthly_contribution?: number
  starting_amount?: number
  annual_return_pct?: number
  annual_volatility_pct?: number
  monthly_spending?: number
}

export type InputSource = 'your_input' | 'registered_goal' | 'your_data' | 'assumption'

export interface ResolvedInput {
  key: keyof ProjectionInput
  label: string
  value: number
  unit: 'NOK' | 'years' | '%' | 'NOK/month'
  source: InputSource
  explanation: string
}

export interface GoalProjection {
  customer_id: string
  goal: Goal | null
  inputs: ResolvedInput[]
  probability_pct: number
  status: 'likely' | 'possible' | 'at_risk' | 'unlikely'
  outcomes: { pessimistic: number; median: number; optimistic: number }
  timeline: { year: number; p10: number; p50: number; p90: number; contributed: number }[]
  required_monthly_contribution: number
  years_needed_at_current_pace: number | null
  plan_check: {
    months_since_start: number
    planned_value_today: number
    actual_value_today: number
    difference: number
    verdict: 'ahead' | 'behind' | 'on_plan'
  } | null
  levers: { id: string; label: string; probability_pct: number; median_value: number; delta_probability_pct: number; years_needed: number | null }[]
  market_impact: MarketImpact
  independence: Independence
  summary: string[]
  data_quality: DataQuality
}

export interface MarketImpact {
  recent: { days: number; change_value: number; probability_without_change_pct: number; probability_now_pct: number } | null
  composition: { paid_in: number; market_growth: number; median: number; market_share_pct: number }
  spread: { pessimistic: number; optimistic: number; difference: number }
  value_per_return_point: number
  timing: { crash_pct: number; no_crash: number; crash_early: number; crash_late: number; late_crash_year: number }
  explanation: string[]
}

export interface Independence {
  monthly_spending: number
  target: number
  goal_target: number
  goal_monthly_income: number
  coverage_pct: number
  probability_pct: number
  required_monthly_contribution: number
  years_needed_at_current_pace: number | null
  goal_is_partial: boolean
}
