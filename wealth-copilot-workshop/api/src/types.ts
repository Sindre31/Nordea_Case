// Shared domain types for the Wealth Copilot demo API.
// These mirror the fields produced by /data/generate.mjs.

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
  account_type: 'Current Account' | 'Savings' | 'Investment Account' | 'Pension'
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
  asset_type: 'Equity' | 'ETF' | 'Mutual Fund' | 'Bond' | 'Cash'
  ticker: string
  name: string
  quantity: number
  purchase_price: number
  current_price: number
  currency: string
  sector: string
  geography: string
}

export interface MarketDataPoint {
  ticker: string
  date: string
  price: number
  daily_return: number
  sector: string
  geography: string
}

export interface Instrument {
  ticker: string
  name: string
  asset_type: string
  sector: string
  geography: string
  current_price: number
  currency: string
}

export interface Goal {
  goal_id: string
  customer_id: string
  type: 'financial_independence' | 'home' | 'retirement' | 'other'
  name: string
  target_amount: number
  target_date: string
  created_at: string
  // The plan the customer agreed on when the goal was registered. Used to
  // answer "am I ahead or behind my plan?".
  plan: {
    starting_amount: number
    monthly_contribution: number
    assumed_annual_return_pct: number
  }
}
