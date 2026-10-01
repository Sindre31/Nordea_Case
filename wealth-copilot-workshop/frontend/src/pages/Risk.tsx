// Case B - make investment risk visible and relatable.
import { useState } from 'react'
import { fetchRiskExplanation } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import { PairBars, VolGauge } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Segmented, Stat, Story } from '../components/ui'
import { formatCurrency } from '../utils/format'

const ALIGNMENT = {
  within: { tone: 'good', label: 'Matches your profile' },
  above: { tone: 'critical', label: 'Riskier than your profile' },
  below: { tone: 'warning', label: 'Calmer than your profile' },
} as const

export default function Risk() {
  const { data: r, loading, error } = useCustomerData(fetchRiskExplanation)
  const [groupBy, setGroupBy] = useState<'sector' | 'holding' | 'geography'>('sector')

  const heading = (
    <PageHeading eyebrow="Case B · Make risk visible" title="Where does my risk come from?"
      lead="Risk here means how much your investments swing up and down. See what drives those swings and whether they fit the risk profile you chose." />
  )

  if (loading && !r) return <Loading />
  if (error) return <div className="page">{heading}<ErrorState message={error} /></div>
  if (!r) return null

  if (r.total_value === 0) {
    return (
      <div className="page">
        {heading}
        <Story lines={r.summary} />
        <MethodNote assumptions={r.data_quality.assumptions} limitations={r.data_quality.limitations} />
      </div>
    )
  }

  const a = ALIGNMENT[r.alignment]
  const groupRows = groupBy === 'holding'
    ? r.contributions.slice(0, 8).map((c) => ({ label: c.name.replace(' (Fictional)', ''), a: c.weight_pct, b: c.risk_contribution_pct }))
    : (groupBy === 'sector' ? r.by_sector : r.by_geography).map((g) => ({ label: g.label, a: g.weight_pct, b: g.risk_contribution_pct }))
  const worst = Math.min(...r.stress_tests.map((s) => s.impact_pct), -1)

  return (
    <div className="page">
      {heading}
      <Story lines={r.summary} />

      <div className="grid grid--2">
        <Panel title="How much it swings" subtitle="Typical yearly ups and downs" action={<Pill tone={a.tone}>{a.label}</Pill>}>
          <VolGauge value={r.portfolio_volatility_pct} min={r.profile_band_pct.min} max={r.profile_band_pct.max} />
          <p className="small muted" style={{ marginTop: 8, textAlign: 'center' }}>
            "{r.risk_profile}" means {r.profile_description}.
          </p>
        </Panel>
        <div className="grid">
        <Stat label="A bad month could cost" value={<span className="delta--neg">-{formatCurrency(r.bad_month.loss_value)}</span>}
          sub={`${r.bad_month.loss_pct}% or more, ${r.bad_month.frequency}. Markets usually recover, but not always quickly.`} />
        <Stat label="Share in stocks & equity funds" value={`${r.equity_share_pct}%`}
          sub={`A typical "${r.risk_profile}" mix has about ${r.profile_equity_share_pct}%.`} />
        <Stat label="Biggest single risk driver" value={r.contributions[0]?.name.replace(' (Fictional)', '') ?? '-'}
          sub={`${r.contributions[0]?.weight_pct}% of your money, ${r.contributions[0]?.risk_contribution_pct}% of your risk`} />
        </div>
      </div>

      <div className="grid grid--main-side">
        <Panel title="Share of money vs. share of risk" subtitle="When the orange bar is longer than the grey one, that part drives more of your swings than its size suggests."
          action={<Segmented label="Group by" value={groupBy} onChange={setGroupBy} options={[
            { value: 'sector', label: 'Sector' }, { value: 'holding', label: 'Investment' }, { value: 'geography', label: 'Region' },
          ]} />}>
          <PairBars rows={groupRows} aLabel="Share of your money" bLabel="Share of your risk" />
        </Panel>

        <Panel title="What if markets fall?" subtitle="Illustrative scenarios, not forecasts">
          <div className="stress">
            {r.stress_tests.map((s) => (
              <div key={s.id} className="stress__item">
                <div className="stress__top">
                  <span>{s.name}</span>
                  <span className={s.impact_value >= 0 ? 'delta--pos' : 'delta--neg'}>{s.impact_value >= 0 ? '+' : '-'}{formatCurrency(Math.abs(s.impact_value))}</span>
                </div>
                <p className="stress__desc">{s.description} ({s.impact_pct}%)</p>
                <div className="stress__meter" aria-hidden="true">
                  <span style={{ width: `${Math.max(0, (s.impact_pct / worst) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel title="How your mix drifted" subtitle={`Sector weights on ${r.drift.since} vs. today, from price moves alone`}>
          <PairBars rows={r.drift.rows.slice(0, 6).map((d) => ({ label: d.label, a: d.start_pct, b: d.now_pct }))}
            aLabel={`Then (${r.drift.since})`} bLabel="Now" aClass="pair__bar--money" bClass="pair__bar--now" />
          <p className="small muted" style={{ marginTop: 12 }}>
            Winners grow into a bigger share over time, so a portfolio can become riskier without you buying anything.
          </p>
        </Panel>

        <Panel title="What would change it?" subtitle="An illustration of how the numbers respond, not advice">
          {r.what_if ? (
            <div className="kv">
              <p style={{ marginBottom: 12 }}>{r.what_if.description}:</p>
              <div className="kv__row"><span>Yearly swings</span><span>{r.portfolio_volatility_pct}% &rarr; <strong>{r.what_if.new_volatility_pct}%</strong></span></div>
              <div className="kv__row"><span>Bad month</span><span>-{formatCurrency(r.bad_month.loss_value)} &rarr; <strong>-{formatCurrency(r.what_if.new_bad_month_loss)}</strong></span></div>
              <div className="kv__row"><span>Profile range</span><span>{r.profile_band_pct.min}-{r.profile_band_pct.max}%</span></div>
              <p className="small muted" style={{ marginTop: 12 }}>Talk to your advisor before making changes. Lower risk also means lower expected growth.</p>
            </div>
          ) : <p className="muted">Your largest risk driver is not a share or equity fund, so there is no simple what-if to show.</p>}
        </Panel>
      </div>

      <MethodNote assumptions={r.data_quality.assumptions} limitations={r.data_quality.limitations} />
    </div>
  )
}
