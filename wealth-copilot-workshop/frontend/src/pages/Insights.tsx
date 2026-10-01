import { fetchInsights, fetchRisk } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import InsightCard from '../components/InsightCard'
import { ErrorState, Loading, PageHeading, Panel } from '../components/ui'
import { formatCurrency, formatNumber, formatPct } from '../utils/format'
import { alignmentName, riskCategoryName } from '../utils/labels'

export default function Insights() {
  const { data, loading, error } = useCustomerData((id) => Promise.all([fetchInsights(id), fetchRisk(id)]))
  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  const [insights, risk] = data
  const factors = [
    ['Fordeling mellom aktivaklasser', risk.factors.asset_allocation_score],
    ['Konsentrasjon', risk.factors.concentration_score],
    ['Geografi', risk.factors.geography_score],
    ['Svingninger', risk.factors.volatility_score],
  ] as const

  return (
    <div className="page">
      <PageHeading eyebrow="Regelbasert og forklarbart" title="Innsikter" lead="Observasjoner fra kontoene og investeringene dine. Hver innsikt følger en enkel, synlig regel." />
      <div className="grid grid--2">
        {insights.insights.map((i) => <InsightCard key={i.id} insight={i} />)}
      </div>
      <div className="grid grid--2">
        <Panel title="Månedlig kontantstrøm" subtitle="Gjennomsnitt for månedene i transaksjonene dine">
          <div className="kv">
            <div className="kv__row"><span>Inntekt</span><strong>{formatCurrency(insights.savings.averageMonthlyIncome)}</strong></div>
            <div className="kv__row"><span>Forbruk</span><strong>{formatCurrency(insights.savings.averageMonthlyExpenses)}</strong></div>
            <div className="kv__row"><span>Til overs</span><strong>{formatCurrency(insights.savings.averageMonthlySavings)}</strong></div>
            <div className="kv__row"><span>Sparerate</span><strong>{formatPct(insights.savings.savingsRatePct)}</strong></div>
          </div>
        </Panel>
        <Panel title={`Illustrativ risikoscore: ${risk.risk_score}/100`} subtitle={`${riskCategoryName(risk.risk_category)} · ${alignmentName(risk.risk_profile_alignment)}`}>
          <div className="pairs">
            {factors.map(([label, v]) => (
              <div key={label}>
                <div className="pair__head"><span>{label}</span><strong>{formatNumber(v, 1)}</strong></div>
                <div className="lever__bar"><span style={{ width: `${Math.min(100, v)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="disclaimer" style={{ marginTop: 14 }}>{risk.disclaimer} Se Risiko-siden for en forklaring i klartekst.</p>
        </Panel>
      </div>
    </div>
  )
}
