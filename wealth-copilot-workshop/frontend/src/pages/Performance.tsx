// Case A - explain WHY the portfolio developed the way it did.
import { useState } from 'react'
import { fetchPerformance, fetchPerformanceExplanation } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import PerformanceChart from '../components/PerformanceChart'
import { DivergingBars, RangeBar } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Segmented, Stat, Story } from '../components/ui'
import { formatCurrency, formatDate, formatSignedCurrency } from '../utils/format'

const PERIODS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

const VERDICT: Record<string, string> = {
  mostly_market: 'Mostly the market',
  mostly_choices: 'Mostly your choices',
  mixed: 'A mix of both',
}

export default function Performance() {
  const [days, setDays] = useState(90)
  const { data, loading, error } = useCustomerData((id) => Promise.all([
    fetchPerformanceExplanation(id, days),
    fetchPerformance(id),
  ]), [days])
  const [view, setView] = useState<'holdings' | 'sector' | 'type'>('holdings')

  const heading = (
    <PageHeading eyebrow="Case A · Understand your development" title="Why did my portfolio move?"
      lead="See which investments drove the change, how much came from the market versus your own choices, and whether it is normal for your risk profile.">
      <Segmented label="Period" options={PERIODS} value={days} onChange={setDays} />
    </PageHeading>
  )

  if (loading && !data) return <Loading />
  if (error) return <div className="page">{heading}<ErrorState message={error} /></div>
  if (!data) return null
  const [x, perf] = data
  const series = perf.series.filter((p) => p.date >= x.period.start_date)
  const empty = x.start_value === 0

  const rows = view === 'holdings'
    ? x.contributions.map((c) => ({ key: c.ticker, label: c.name.replace(' (Fictional)', ''), detail: `${c.return_pct >= 0 ? '+' : ''}${c.return_pct}%`, value: c.change_value }))
    : (view === 'sector' ? x.by_sector : x.by_asset_type).map((g) => ({ key: g.label, label: g.label, detail: `${g.contribution_pct_points >= 0 ? '+' : ''}${g.contribution_pct_points} pts`, value: g.change_value }))

  const mvc = x.market_vs_choices
  const totalAbs = Math.abs(mvc.market_effect_value) + Math.abs(mvc.choices_effect_value) || 1
  const rangeTone = x.expected_range.verdict === 'within' ? 'good' : 'warning'

  return (
    <div className="page" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
      {heading}

      <Story lines={x.summary} />

      {!empty && (
        <>
          <div className="grid grid--4">
            <Stat label="Change in value" value={<span className={x.change_value >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(x.change_value)}</span>}
              sub={`${x.change_pct >= 0 ? '+' : ''}${x.change_pct.toFixed(1)}% in ${x.period.days} days`} />
            <Stat label="From the market" value={formatSignedCurrency(mvc.market_effect_value)} sub={`Reference mix ${mvc.market_return_pct >= 0 ? '+' : ''}${mvc.market_return_pct.toFixed(1)}%`} />
            <Stat label="From your choices" value={formatSignedCurrency(mvc.choices_effect_value)} sub={`${mvc.choices_effect_pct_points >= 0 ? '+' : ''}${mvc.choices_effect_pct_points.toFixed(1)} pts vs. the market`} />
            <Stat label="Value now" value={formatCurrency(x.end_value)} sub={`Was ${formatCurrency(x.start_value)} on ${formatDate(x.period.start_date)}`} />
          </div>

          <div className="grid grid--main-side">
            <Panel title="What moved your portfolio" subtitle="Change in NOK per investment. Right = pushed up, left = pulled down."
              action={<Segmented label="Group by" value={view} onChange={setView} options={[
                { value: 'holdings', label: 'Investments' }, { value: 'sector', label: 'Sector' }, { value: 'type', label: 'Type' },
              ]} />}>
              <DivergingBars rows={rows} />
            </Panel>

            <div className="grid">
              <Panel title="Market or your choices?" action={<Pill tone="accent">{VERDICT[mvc.verdict]}</Pill>}>
                <div className="split" role="img" aria-label={`Market ${formatSignedCurrency(mvc.market_effect_value)}, your choices ${formatSignedCurrency(mvc.choices_effect_value)}`}>
                  <span style={{ width: `${(Math.abs(mvc.market_effect_value) / totalAbs) * 100}%`, background: 'var(--neutral-mark)' }} />
                  <span style={{ width: `${(Math.abs(mvc.choices_effect_value) / totalAbs) * 100}%`, background: 'var(--series-1)' }} />
                </div>
                <div className="legend">
                  <span className="legend__item"><span className="swatch" style={{ background: 'var(--neutral-mark)' }} />Market {formatSignedCurrency(mvc.market_effect_value)}</span>
                  <span className="legend__item"><span className="swatch" style={{ background: 'var(--series-1)' }} />Your choices {formatSignedCurrency(mvc.choices_effect_value)}</span>
                </div>
                <p className="small muted" style={{ marginTop: 14 }}>
                  "The market" is a simple {mvc.reference_portfolio.name.toLowerCase()}:{' '}
                  {mvc.reference_portfolio.composition.map((c) => `${c.weight_pct}% ${c.name.replace(' (Fictional)', '')}`).join(', ')}.
                </p>
              </Panel>

              <Panel title="Was this expected?" subtitle={`Normal ${x.period.days}-day range for a ${x.expected_range.risk_profile.toLowerCase()} investor`}
                action={<Pill tone={rangeTone}>{x.expected_range.verdict === 'within' ? 'Within normal range' : `${x.expected_range.verdict === 'above' ? 'Above' : 'Below'} normal range`}</Pill>}>
                <RangeBar low={x.expected_range.low_pct} high={x.expected_range.high_pct} expected={x.expected_range.expected_pct} value={x.change_pct} />
                <p className="small muted">About 9 in 10 periods of this length land inside the blue band.</p>
              </Panel>
            </div>
          </div>

          <Panel title="Value over the period" subtitle={`${formatDate(x.period.start_date)} – ${formatDate(x.period.end_date)}`}>
            <PerformanceChart series={series} />
          </Panel>

          <Panel title="All investments" subtitle="The numbers behind the chart">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Investment</th><th className="num">Start</th><th className="num">Now</th><th className="num">Change</th><th className="num">Return</th><th className="num">Share of result</th></tr>
                </thead>
                <tbody>
                  {x.contributions.map((c) => (
                    <tr key={c.ticker}>
                      <td>{c.name}<div className="ticker">{c.ticker} &middot; {c.asset_type}</div></td>
                      <td className="num">{formatCurrency(c.start_value)}</td>
                      <td className="num">{formatCurrency(c.end_value)}</td>
                      <td className={`num ${c.change_value >= 0 ? 'delta--pos' : 'delta--neg'}`}>{formatSignedCurrency(c.change_value)}</td>
                      <td className="num">{c.return_pct >= 0 ? '+' : ''}{c.return_pct}%</td>
                      <td className="num">{c.contribution_pct_points >= 0 ? '+' : ''}{c.contribution_pct_points} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <MethodNote assumptions={x.data_quality.assumptions} limitations={x.data_quality.limitations} />
    </div>
  )
}
