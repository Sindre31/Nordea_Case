import { fetchInvestments, fetchPerformance, fetchPortfolio } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import AllocationPieChart from '../components/AllocationPieChart'
import PerformanceChart from '../components/PerformanceChart'
import { ErrorState, Loading, PageHeading, Panel, Stat } from '../components/ui'
import { formatCurrency, formatSignedCurrency } from '../utils/format'

export default function Portfolio() {
  const { data, loading, error } = useCustomerData((id) => Promise.all([fetchPortfolio(id), fetchPerformance(id), fetchInvestments(id)]))
  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  const [portfolio, performance, { investments }] = data
  const total = portfolio.total_value
  const holdings = investments
    .map((h) => {
      const value = h.quantity * h.current_price
      const cost = h.quantity * h.purchase_price
      return { ...h, value, gain: value - cost, gainPct: cost > 0 ? ((value - cost) / cost) * 100 : 0, weight: total > 0 ? (value / total) * 100 : 0 }
    })
    .sort((a, b) => b.value - a.value)

  return (
    <div className="page">
      <PageHeading eyebrow="Your investments" title="Portfolio" lead="Everything you own across your investment and pension accounts." />
      <div className="grid grid--4">
        <Stat label="Total value" value={formatCurrency(total)} />
        <Stat label="Unrealised gain" value={<span className={portfolio.unrealized_gain_loss >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(portfolio.unrealized_gain_loss)}</span>} sub={`${portfolio.unrealized_gain_loss_pct}%`} />
        <Stat label="Cash" value={formatCurrency(portfolio.cash_value)} sub={`${portfolio.cash_percentage}% of portfolio`} />
        <Stat label="Holdings" value={portfolio.holding_count} />
      </div>
      <Panel title="Value over time" subtitle="Today's holdings valued at historical prices">
        <PerformanceChart series={performance.series} />
      </Panel>
      <div className="grid grid--3">
        <AllocationPieChart data={portfolio.allocation_by_asset_type} title="By asset type" />
        <AllocationPieChart data={portfolio.allocation_by_geography} title="By region" />
        <AllocationPieChart data={portfolio.allocation_by_sector} title="By sector" />
      </div>
      <Panel title="All holdings">
        {holdings.length === 0 ? <p className="state">No holdings to display.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Investment</th><th>Type</th><th className="num">Value</th><th className="num">Weight</th><th className="num">Gain / loss</th></tr></thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.investment_id}>
                    <td>{h.name}<div className="ticker">{h.ticker} &middot; {h.sector} &middot; {h.geography}</div></td>
                    <td>{h.asset_type}</td>
                    <td className="num">{formatCurrency(h.value)}</td>
                    <td className="num">{h.weight.toFixed(1)}%</td>
                    <td className={`num ${h.gain >= 0 ? 'delta--pos' : 'delta--neg'}`}>{formatSignedCurrency(h.gain)} ({h.gainPct.toFixed(1)}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
