import { useEffect, useState } from 'react'
import { useCustomerContext } from '../context/CustomerContext'
import { fetchInsights, fetchRisk } from '../api/client'
import type { InsightsSummary, RiskSummary } from '../api/types'
import InsightCard from '../components/InsightCard'

export default function Insights() {
  const { selectedCustomerId } = useCustomerContext()
  const [insights, setInsights] = useState<InsightsSummary | null>(null)
  const [risk, setRisk] = useState<RiskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCustomerId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchInsights(selectedCustomerId), fetchRisk(selectedCustomerId)])
      .then(([insightsRes, riskRes]) => {
        if (cancelled) return
        setInsights(insightsRes)
        setRisk(riskRes)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedCustomerId])

  if (loading) return <p className="loading-state">Loading insights...</p>
  if (error) return <p className="error-state">Could not load insights: {error}</p>
  if (!insights || !risk) return null

  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Deterministic, rule-based</p>
        <h2>Insights</h2>
      </div>

      <div className="insight-grid">
        {insights.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      <section className="panel panel--muted">
        <h3>Risk score breakdown</h3>
        <p className="disclaimer">{risk.disclaimer}</p>
        <ul className="risk-factor-list">
          <li>Asset allocation: {risk.factors.asset_allocation_score}</li>
          <li>Concentration: {risk.factors.concentration_score}</li>
          <li>Geography: {risk.factors.geography_score}</li>
          <li>Volatility: {risk.factors.volatility_score}</li>
        </ul>
      </section>
    </div>
  )
}
