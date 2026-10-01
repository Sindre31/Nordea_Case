import { fetchInsights, fetchRisk } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import InsightCard from '../components/InsightCard'
import { ErrorState, Loading, PageHeading, Panel } from '../components/ui'
import { formatCurrency } from '../utils/format'

export default function Insights() {
  const { data, loading, error } = useCustomerData((id) => Promise.all([fetchInsights(id), fetchRisk(id)]))
  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  const [insights, risk] = data
  const factors = [
    ['Asset allocation', risk.factors.asset_allocation_score],
    ['Concentration', risk.factors.concentration_score],
    ['Geography', risk.factors.geography_score],
    ['Volatility', risk.factors.volatility_score],
  ] as const

  return (
    <div className="page">
      <PageHeading eyebrow="Rule-based, explainable" title="Insights" lead="Observations from your accounts and investments. Every insight follows a simple, visible rule." />
      <div className="grid grid--2">
        {insights.insights.map((i) => <InsightCard key={i.id} insight={i} />)}
      </div>
      <div className="grid grid--2">
        <Panel title="Monthly cash flow" subtitle="Average over the months in your transactions">
          <div className="kv">
            <div className="kv__row"><span>Income</span><strong>{formatCurrency(insights.savings.averageMonthlyIncome)}</strong></div>
            <div className="kv__row"><span>Spending</span><strong>{formatCurrency(insights.savings.averageMonthlyExpenses)}</strong></div>
            <div className="kv__row"><span>Left over</span><strong>{formatCurrency(insights.savings.averageMonthlySavings)}</strong></div>
            <div className="kv__row"><span>Savings rate</span><strong>{insights.savings.savingsRatePct}%</strong></div>
          </div>
        </Panel>
        <Panel title={`Illustrative risk score: ${risk.risk_score}/100`} subtitle={`${risk.risk_category} · ${risk.risk_profile_alignment}`}>
          <div className="pairs">
            {factors.map(([label, v]) => (
              <div key={label}>
                <div className="pair__head"><span>{label}</span><strong>{v}</strong></div>
                <div className="lever__bar"><span style={{ width: `${Math.min(100, v)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="disclaimer" style={{ marginTop: 14 }}>{risk.disclaimer} See the Risk page for a plain-language breakdown.</p>
        </Panel>
      </div>
    </div>
  )
}
