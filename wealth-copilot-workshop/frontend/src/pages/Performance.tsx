// Case A - explain WHY the portfolio developed the way it did.
import { useState } from 'react'
import { fetchPerformance, fetchPerformanceExplanation } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import PerformanceChart from '../components/PerformanceChart'
import { DivergingBars, RangeBar } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Segmented, Stat, Story } from '../components/ui'
import { formatCurrency, formatDate, formatPct, formatSignedCurrency } from '../utils/format'
import { assetTypeName, instrumentName, profileName } from '../utils/labels'

const PERIODS = [
  { value: 30, label: '30 dager' },
  { value: 60, label: '60 dager' },
  { value: 90, label: '90 dager' },
]

const VERDICT: Record<string, string> = {
  mostly_market: 'Mest markedet',
  mostly_choices: 'Mest dine valg',
  mixed: 'En blanding',
}

const RANGE: Record<string, string> = {
  within: 'Innenfor normalen',
  above: 'Over normalen',
  below: 'Under normalen',
}

function pts(value: number): string {
  return `${formatPct(value, 1, true).replace(' %', '')} pp`
}

export default function Performance() {
  const [days, setDays] = useState(90)
  const { data, loading, error } = useCustomerData((id) => Promise.all([
    fetchPerformanceExplanation(id, days),
    fetchPerformance(id),
  ]), [days])
  const [view, setView] = useState<'holdings' | 'sector' | 'type'>('holdings')

  const heading = (
    <PageHeading eyebrow="Case A · Forstå utviklingen" title="Hvorfor endret porteføljen seg?"
      lead="Se hvilke investeringer som drev endringen, hvor mye som skyldes markedet og hvor mye som skyldes dine egne valg, og om utviklingen er normal for risikoprofilen din.">
      <Segmented label="Periode" options={PERIODS} value={days} onChange={setDays} />
    </PageHeading>
  )

  if (loading && !data) return <Loading />
  if (error) return <div className="page">{heading}<ErrorState message={error} /></div>
  if (!data) return null
  const [x, perf] = data
  const series = perf.series.filter((p) => p.date >= x.period.start_date)
  const empty = x.start_value === 0

  const rows = view === 'holdings'
    ? x.contributions.map((c) => ({ key: c.ticker, label: instrumentName(c.name), detail: formatPct(c.return_pct, 1, true), value: c.change_value }))
    : (view === 'sector' ? x.by_sector : x.by_asset_type).map((g) => ({ key: g.label, label: g.label, detail: pts(g.contribution_pct_points), value: g.change_value }))

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
            <Stat label="Endring i verdi" value={<span className={x.change_value >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(x.change_value)}</span>}
              sub={`${formatPct(x.change_pct, 1, true)} på ${x.period.days} dager`} />
            <Stat label="Fra markedet" value={formatSignedCurrency(mvc.market_effect_value)} sub={`Referanseblandingen ${formatPct(mvc.market_return_pct, 1, true)}`} />
            <Stat label="Fra dine valg" value={formatSignedCurrency(mvc.choices_effect_value)} sub={`${pts(mvc.choices_effect_pct_points)} mot markedet`} />
            <Stat label="Verdi nå" value={formatCurrency(x.end_value)} sub={`Var ${formatCurrency(x.start_value)} ${formatDate(x.period.start_date)}`} />
          </div>

          <div className="grid grid--main-side">
            <Panel title="Dette påvirket porteføljen" subtitle="Endring i kroner per investering. Mot høyre = trakk opp, mot venstre = trakk ned."
              action={<Segmented label="Grupper etter" value={view} onChange={setView} options={[
                { value: 'holdings', label: 'Investering' }, { value: 'sector', label: 'Sektor' }, { value: 'type', label: 'Type' },
              ]} />}>
              <DivergingBars rows={rows} />
            </Panel>

            <div className="grid">
              <Panel title="Markedet eller dine valg?" action={<Pill tone="accent">{VERDICT[mvc.verdict]}</Pill>}>
                <div className="split" role="img" aria-label={`Markedet ${formatSignedCurrency(mvc.market_effect_value)}, dine valg ${formatSignedCurrency(mvc.choices_effect_value)}`}>
                  <span style={{ width: `${(Math.abs(mvc.market_effect_value) / totalAbs) * 100}%`, background: 'var(--neutral-mark)' }} />
                  <span style={{ width: `${(Math.abs(mvc.choices_effect_value) / totalAbs) * 100}%`, background: 'var(--series-1)' }} />
                </div>
                <div className="legend">
                  <span className="legend__item"><span className="swatch" style={{ background: 'var(--neutral-mark)' }} />Markedet {formatSignedCurrency(mvc.market_effect_value)}</span>
                  <span className="legend__item"><span className="swatch" style={{ background: 'var(--series-1)' }} />Dine valg {formatSignedCurrency(mvc.choices_effect_value)}</span>
                </div>
                <p className="small muted" style={{ marginTop: 14 }}>
                  «Markedet» er en enkel {mvc.reference_portfolio.name}:{' '}
                  {mvc.reference_portfolio.composition.map((c) => `${c.weight_pct} % ${instrumentName(c.name)}`).join(', ')}.
                </p>
              </Panel>

              <Panel title="Var dette forventet?" subtitle={`Normalt spenn over ${x.period.days} dager for risikoprofilen «${profileName(x.expected_range.risk_profile)}»`}
                action={<Pill tone={rangeTone}>{RANGE[x.expected_range.verdict]}</Pill>}>
                <RangeBar low={x.expected_range.low_pct} high={x.expected_range.high_pct} expected={x.expected_range.expected_pct} value={x.change_pct} />
                <p className="small muted">Omtrent 9 av 10 perioder av denne lengden havner innenfor det blå feltet.</p>
              </Panel>
            </div>
          </div>

          <Panel title="Verdi gjennom perioden" subtitle={`${formatDate(x.period.start_date)} – ${formatDate(x.period.end_date)}`}>
            <PerformanceChart series={series} />
          </Panel>

          <Panel title="Alle investeringer" subtitle="Tallene bak grafen">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Investering</th><th className="num">Start</th><th className="num">Nå</th><th className="num">Endring</th><th className="num">Avkastning</th><th className="num">Bidrag</th></tr>
                </thead>
                <tbody>
                  {x.contributions.map((c) => (
                    <tr key={c.ticker}>
                      <td>{instrumentName(c.name)}<div className="ticker">{c.ticker} &middot; {assetTypeName(c.asset_type)}</div></td>
                      <td className="num">{formatCurrency(c.start_value)}</td>
                      <td className="num">{formatCurrency(c.end_value)}</td>
                      <td className={`num ${c.change_value >= 0 ? 'delta--pos' : 'delta--neg'}`}>{formatSignedCurrency(c.change_value)}</td>
                      <td className="num">{formatPct(c.return_pct, 1, true)}</td>
                      <td className="num">{pts(c.contribution_pct_points)}</td>
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
