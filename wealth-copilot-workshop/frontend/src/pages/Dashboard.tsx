import { useEffect, useState } from 'react'
import { useCustomerContext } from '../context/CustomerContext'
import { fetchAccounts, fetchInsights, fetchPerformance, fetchPortfolio, fetchRisk } from '../api/client'
import type { Account, InsightsSummary, PerformanceSummary, PortfolioSummary, RiskSummary } from '../api/types'
import StatCard from '../components/StatCard'
import PerformanceChart from '../components/PerformanceChart'
import { formatCurrency } from '../utils/format'

export default function Dashboard() {
  const { selectedCustomerId, selectedCustomer } = useCustomerContext()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null)
  const [risk, setRisk] = useState<RiskSummary | null>(null)
  const [insights, setInsights] = useState<InsightsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCustomerId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchAccounts(selectedCustomerId),
      fetchPortfolio(selectedCustomerId),
      fetchPerformance(selectedCustomerId),
      fetchRisk(selectedCustomerId),
      fetchInsights(selectedCustomerId),
    ])
      .then(([accountsRes, portfolioRes, performanceRes, riskRes, insightsRes]) => {
        if (cancelled) return
        setAccounts(accountsRes.accounts)
        setPortfolio(portfolioRes)
        setPerformance(performanceRes)
        setRisk(riskRes)
        setInsights(insightsRes)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedCustomerId])

  if (loading) return <p className="loading-state">Loading dashboard...</p>
  if (error) return <p className="error-state">Could not load dashboard data: {error}</p>
  if (!portfolio || !performance || !risk || !insights) return null

  const cashBalance = accounts
    .filter((a) => a.account_type === 'Current Account' || a.account_type === 'Savings')
    .reduce((sum, a) => sum + a.balance, 0)
  const investmentAccountBalance = accounts
    .filter((a) => a.account_type === 'Investment Account' || a.account_type === 'Pension')
    .reduce((sum, a) => sum + a.balance, 0)
  const netWorth = cashBalance + investmentAccountBalance

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Welcome back</p>
        <h2>{selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : ''}</h2>
      </div>

      <div className="stat-grid">
        <StatCard label="Net worth" value={formatCurrency(netWorth)} />
        <StatCard label="Bank deposits" value={formatCurrency(cashBalance)} />
        <StatCard label="Investments" value={formatCurrency(portfolio.total_value)} />
        <StatCard
          label="Monthly savings"
          value={formatCurrency(insights.savings.averageMonthlySavings)}
          sublabel={`${insights.savings.savingsRatePct}% of income`}
        />
        <StatCard
          label="Portfolio performance"
          value={`${performance.period_return_pct >= 0 ? '+' : ''}${performance.period_return_pct}%`}
          tone={performance.period_return_pct >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Risk score"
          value={`${risk.risk_score}/100`}
          sublabel={risk.risk_category}
        />
      </div>

      <section className="panel">
        <h3>Portfolio performance</h3>
        <PerformanceChart series={performance.series} />
      </section>
    </div>
  )
}
