import { useEffect, useState } from 'react'
import { useCustomerContext } from '../context/CustomerContext'
import { fetchPerformance, fetchPortfolio } from '../api/client'
import type { PerformanceSummary, PortfolioSummary } from '../api/types'
import AllocationPieChart from '../components/AllocationPieChart'
import PerformanceChart from '../components/PerformanceChart'
import { formatCurrency } from '../utils/format'

export default function Portfolio() {
  const { selectedCustomerId } = useCustomerContext()
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCustomerId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchPortfolio(selectedCustomerId), fetchPerformance(selectedCustomerId)])
      .then(([portfolioRes, performanceRes]) => {
        if (cancelled) return
        setPortfolio(portfolioRes)
        setPerformance(performanceRes)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedCustomerId])

  if (loading) return <p className="loading-state">Loading portfolio...</p>
  if (error) return <p className="error-state">Could not load portfolio data: {error}</p>
  if (!portfolio || !performance) return null

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Your investments</p>
        <h2>Portfolio</h2>
      </div>

      <section className="panel">
        <h3>Performance</h3>
        <PerformanceChart series={performance.series} />
      </section>

      <div className="chart-grid">
        <AllocationPieChart data={portfolio.allocation_by_asset_type} title="Allocation by asset type" />
        <AllocationPieChart data={portfolio.allocation_by_geography} title="Allocation by geography" />
        <AllocationPieChart data={portfolio.allocation_by_sector} title="Allocation by sector" />
      </div>

      <section className="panel">
        <h3>Largest holdings</h3>
        {portfolio.largest_holdings.length === 0 ? (
          <p className="empty-state">No holdings to display.</p>
        ) : (
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Weight</th>
                <th>Unrealized gain/loss</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.largest_holdings.map((holding) => (
                <tr key={holding.investment_id}>
                  <td>
                    <div className="holdings-table__name">{holding.name}</div>
                    <div className="holdings-table__ticker">{holding.ticker}</div>
                  </td>
                  <td>{holding.asset_type}</td>
                  <td>{formatCurrency(holding.market_value)}</td>
                  <td>{holding.weight_pct}%</td>
                  <td className={holding.unrealized_gain_loss >= 0 ? 'positive' : 'negative'}>
                    {holding.unrealized_gain_loss >= 0 ? '+' : ''}
                    {formatCurrency(holding.unrealized_gain_loss)} ({holding.unrealized_gain_loss_pct}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel panel--muted">
        <h3>Portfolio summary</h3>
        <p>Total value: {formatCurrency(portfolio.total_value)}</p>
        <p>Cash: {formatCurrency(portfolio.cash_value)} ({portfolio.cash_percentage}%)</p>
        <p>
          Unrealized gain/loss: {formatCurrency(portfolio.unrealized_gain_loss)} ({portfolio.unrealized_gain_loss_pct}%)
        </p>
      </section>
    </div>
  )
}
