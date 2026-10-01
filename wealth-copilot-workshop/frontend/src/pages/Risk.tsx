// Case B - make investment risk visible and relatable.
import { useState } from 'react'
import { fetchRiskExplanation } from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import { PairBars, VolGauge } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Segmented, Stat, Story } from '../components/ui'
import { formatCurrency, formatDate, formatPct } from '../utils/format'
import { instrumentName, profileName } from '../utils/labels'

const ALIGNMENT = {
  within: { tone: 'good', label: 'I tråd med profilen din' },
  above: { tone: 'critical', label: 'Mer risiko enn profilen din' },
  below: { tone: 'warning', label: 'Roligere enn profilen din' },
} as const

export default function Risk() {
  const { data: r, loading, error } = useCustomerData(fetchRiskExplanation)
  const [groupBy, setGroupBy] = useState<'sector' | 'holding' | 'geography'>('sector')

  const heading = (
    <PageHeading eyebrow="Case B · Gjør risiko synlig" title="Hvor kommer risikoen min fra?"
      lead="Risiko betyr her hvor mye investeringene dine svinger opp og ned. Se hva som driver svingningene, og om de passer med risikoprofilen du har valgt." />
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
  const profile = profileName(r.risk_profile)
  const band = `${r.profile_band_pct.min}–${r.profile_band_pct.max} %`
  const groupRows = groupBy === 'holding'
    ? r.contributions.slice(0, 8).map((c) => ({ label: instrumentName(c.name), a: c.weight_pct, b: c.risk_contribution_pct }))
    : (groupBy === 'sector' ? r.by_sector : r.by_geography).map((g) => ({ label: g.label, a: g.weight_pct, b: g.risk_contribution_pct }))
  const worst = Math.min(...r.stress_tests.map((s) => s.impact_pct), -1)
  const top = r.contributions[0]

  return (
    <div className="page">
      {heading}
      <Story lines={r.summary} />

      <div className="grid grid--2">
        <Panel title="Hvor mye den svinger" subtitle="Typiske opp- og nedturer i løpet av et år" action={<Pill tone={a.tone}>{a.label}</Pill>}>
          <VolGauge value={r.portfolio_volatility_pct} min={r.profile_band_pct.min} max={r.profile_band_pct.max} />
          <p className="small muted" style={{ marginTop: 8, textAlign: 'center' }}>
            «{profile}» betyr {r.profile_description}.
          </p>
        </Panel>
        <div className="grid">
          <Stat label="En dårlig måned kan koste" value={<span className="delta--neg">-{formatCurrency(r.bad_month.loss_value)}</span>}
            sub={`${formatPct(r.bad_month.loss_pct)} eller mer, ${r.bad_month.frequency}. Markedet henter seg som regel inn igjen, men ikke alltid raskt.`} />
          <Stat label="Andel i aksjer og aksjefond" value={formatPct(r.equity_share_pct)}
            sub={`En typisk «${profile}»-blanding har rundt ${r.profile_equity_share_pct} %.`} />
          <Stat label="Største enkeltdriver av risiko" value={top ? instrumentName(top.name) : '-'}
            sub={top ? `${formatPct(top.weight_pct)} av pengene dine, ${formatPct(top.risk_contribution_pct)} av risikoen` : undefined} />
        </div>
      </div>

      <div className="grid grid--main-side">
        <Panel title="Andel av pengene mot andel av risikoen" subtitle="Når den oransje stolpen er lengre enn den grå, driver den delen mer av svingningene enn størrelsen tilsier."
          action={<Segmented label="Grupper etter" value={groupBy} onChange={setGroupBy} options={[
            { value: 'sector', label: 'Sektor' }, { value: 'holding', label: 'Investering' }, { value: 'geography', label: 'Region' },
          ]} />}>
          <PairBars rows={groupRows} aLabel="Andel av pengene dine" bLabel="Andel av risikoen din" />
        </Panel>

        <Panel title="Hva om markedet faller?" subtitle="Illustrasjoner, ikke prognoser">
          <div className="stress">
            {r.stress_tests.map((s) => (
              <div key={s.id} className="stress__item">
                <div className="stress__top">
                  <span>{s.name}</span>
                  <span className={s.impact_value >= 0 ? 'delta--pos' : 'delta--neg'}>{s.impact_value >= 0 ? '+' : '-'}{formatCurrency(Math.abs(s.impact_value))}</span>
                </div>
                <p className="stress__desc">{s.description} ({formatPct(s.impact_pct)})</p>
                <div className="stress__meter" aria-hidden="true">
                  <span style={{ width: `${Math.max(0, (s.impact_pct / worst) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel title="Slik har fordelingen endret seg" subtitle={`Sektorvekter ${formatDate(r.drift.since)} mot i dag, bare fra kursbevegelser`}>
          <PairBars rows={r.drift.rows.slice(0, 6).map((d) => ({ label: d.label, a: d.start_pct, b: d.now_pct }))}
            aLabel={`Da (${formatDate(r.drift.since)})`} bLabel="Nå" aClass="pair__bar--money" bClass="pair__bar--now" />
          <p className="small muted" style={{ marginTop: 12 }}>
            Vinnere vokser til en større andel over tid, så en portefølje kan bli mer risikabel uten at du kjøper noe.
          </p>
        </Panel>

        <Panel title="Hva ville endret bildet?" subtitle="En illustrasjon av hvordan tallene påvirkes, ikke et råd">
          {r.what_if ? (
            <div className="kv">
              <p style={{ marginBottom: 12 }}>{r.what_if.description}:</p>
              <div className="kv__row"><span>Årlige svingninger</span><span>{formatPct(r.portfolio_volatility_pct)} &rarr; <strong>{formatPct(r.what_if.new_volatility_pct)}</strong></span></div>
              <div className="kv__row"><span>Dårlig måned</span><span>-{formatCurrency(r.bad_month.loss_value)} &rarr; <strong>-{formatCurrency(r.what_if.new_bad_month_loss)}</strong></span></div>
              <div className="kv__row"><span>Spenn for profilen</span><span>{band}</span></div>
              <p className="small muted" style={{ marginTop: 12 }}>Snakk med rådgiveren din før du gjør endringer. Lavere risiko betyr også lavere forventet vekst.</p>
            </div>
          ) : <p className="muted">Den største risikodriveren din er ikke en aksje eller et aksjefond, så det finnes ikke et enkelt hva-hvis-eksempel å vise.</p>}
        </Panel>
      </div>

      <MethodNote assumptions={r.data_quality.assumptions} limitations={r.data_quality.limitations} />
    </div>
  )
}
