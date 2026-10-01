import { fetchInvestments, fetchPerformance, fetchPortfolio } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import AllocationPieChart from '../components/AllocationPieChart'
import PerformanceChart from '../components/PerformanceChart'
import { ErrorState, Loading, PageHeading, Panel, Stat } from '../components/ui'
import { formatCurrency, formatPct, formatSignedCurrency } from '../utils/format'
import { assetTypeName, geographyName, instrumentName, sectorName } from '../utils/labels'

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
      <PageHeading eyebrow="Dine investeringer" title="Portefølje" lead="Alt du eier på investerings- og pensjonskontoene dine." />
      <div className="grid grid--4">
        <Stat label="Samlet verdi" value={formatCurrency(total)} />
        <Stat label="Urealisert gevinst" value={<span className={portfolio.unrealized_gain_loss >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(portfolio.unrealized_gain_loss)}</span>} sub={formatPct(portfolio.unrealized_gain_loss_pct, 1, true)} />
        <Stat label="Kontanter" value={formatCurrency(portfolio.cash_value)} sub={`${formatPct(portfolio.cash_percentage)} av porteføljen`} />
        <Stat label="Beholdninger" value={portfolio.holding_count} />
      </div>
      <Panel title="Verdiutvikling" subtitle="Dagens beholdninger verdsatt til historiske kurser">
        <PerformanceChart series={performance.series} />
      </Panel>
      <div className="grid grid--3">
        <AllocationPieChart data={portfolio.allocation_by_asset_type} title="Etter aktivaklasse" labelOf={assetTypeName} />
        <AllocationPieChart data={portfolio.allocation_by_geography} title="Etter region" labelOf={geographyName} />
        <AllocationPieChart data={portfolio.allocation_by_sector} title="Etter sektor" labelOf={sectorName} />
      </div>
      <Panel title="Alle beholdninger">
        {holdings.length === 0 ? <p className="state">Ingen beholdninger å vise.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Investering</th><th>Type</th><th className="num">Verdi</th><th className="num">Andel</th><th className="num">Gevinst / tap</th></tr></thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.investment_id}>
                    <td>{instrumentName(h.name)}<div className="ticker">{h.ticker} &middot; {sectorName(h.sector)} &middot; {geographyName(h.geography)}</div></td>
                    <td>{assetTypeName(h.asset_type)}</td>
                    <td className="num">{formatCurrency(h.value)}</td>
                    <td className="num">{formatPct(h.weight)}</td>
                    <td className={`num ${h.gain >= 0 ? 'delta--pos' : 'delta--neg'}`}>{formatSignedCurrency(h.gain)} ({formatPct(h.gainPct, 1, true)})</td>
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
