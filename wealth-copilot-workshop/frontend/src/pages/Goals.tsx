// Case C - follow progress towards a financial goal, as a range of
// scenarios with every assumption visible and adjustable.
import { useEffect, useState } from 'react'
import { fetchGoalProjection } from '../api/client'
import type { InputSource, MarketImpact, ProjectionInput, ResolvedInput } from '../api/types'
import { useCustomerContext } from '../context/CustomerContext'
import { useCustomerData } from '../hooks/useCustomerData'
import { FanChart, ProbabilityRing } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Stat, Story } from '../components/ui'
import { formatCurrency, formatNumber, formatPct, formatSignedCurrency } from '../utils/format'

const SOURCE_LABEL: Record<InputSource, string> = {
  your_input: 'Ditt valg',
  registered_goal: 'Ditt mål',
  your_data: 'Fra dine data',
  assumption: 'Antakelse',
}

const STATUS = {
  likely: { tone: 'good', label: 'Sannsynligvis i rute' },
  possible: { tone: 'accent', label: 'Mulig, men usikkert' },
  at_risk: { tone: 'warning', label: 'I fare' },
  unlikely: { tone: 'critical', label: 'Lite sannsynlig uten endringer' },
} as const

const years = (v: number) => `${formatNumber(v, 1)} år`
const childrenText = (v: number) => (v === 0 ? 'Ingen barn' : `${v} barn`)

const SLIDERS: { key: keyof ProjectionInput; min: number; max: number; step: number; format: (v: number) => string }[] = [
  { key: 'monthly_spending', min: 5000, max: 100000, step: 1000, format: (v) => `${formatCurrency(v)} / mnd.` },
  { key: 'target_amount', min: 100000, max: 10000000, step: 50000, format: formatCurrency },
  { key: 'years', min: 1, max: 40, step: 1, format: years },
  { key: 'monthly_contribution', min: 0, max: 40000, step: 500, format: (v) => `${formatCurrency(v)} / mnd.` },
  { key: 'annual_return_pct', min: 0, max: 10, step: 0.5, format: (v) => `${formatPct(v)} / år` },
  { key: 'children', min: 0, max: 4, step: 1, format: childrenText },
]

function formatInput(i: ResolvedInput): string {
  if (i.unit === 'NOK') return formatCurrency(i.value)
  if (i.unit === 'NOK/month') return `${formatCurrency(i.value)} / mnd.`
  if (i.unit === '%') return formatPct(i.value)
  if (i.unit === 'count') return childrenText(i.value)
  return years(i.value)
}

// "How market development affects the goal": the part of the outcome the
// customer does not control, shown in kroner.
function MarketImpactPanel({ m, target }: { m: MarketImpact; target: number }) {
  const growth = Math.max(0, m.composition.market_growth)
  const total = m.composition.paid_in + growth || 1
  const recentDelta = m.recent ? m.recent.probability_now_pct - m.recent.probability_without_change_pct : 0
  const timingRows = [
    { label: 'Uten markedsfall', value: m.timing.no_crash, tone: 'var(--series-1)' },
    { label: `${m.timing.crash_pct} % fall det første året`, value: m.timing.crash_early, tone: 'var(--neutral-mark)' },
    { label: `${m.timing.crash_pct} % fall det siste året`, value: m.timing.crash_late, tone: 'var(--series-7)' },
  ]
  const maxValue = Math.max(target, ...timingRows.map((r) => r.value)) || 1
  return (
    <Panel title="Slik påvirker markedet målet ditt" subtitle="Den delen av resultatet du ikke styrer selv, vist i kroner">
      <div className="grid grid--3">
        <Stat label={m.recent ? `Markedet de siste ${m.recent.days} dagene` : 'Markedet de siste 90 dagene'}
          value={m.recent ? <span className={m.recent.change_value >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(m.recent.change_value)}</span> : 'Ingen investeringer'}
          sub={m.recent
            ? recentDelta === 0 ? 'Ingen merkbar endring i sjansen for å nå målet' : `Sjansen for å nå målet: ${m.recent.probability_without_change_pct} % → ${m.recent.probability_now_pct} %`
            : 'Markedsbevegelser påvirker deg først når du har investert'} />
        <Stat label="Svakt mot sterkt marked" value={formatCurrency(m.spread.difference)}
          sub={`Forskjellen på måldatoen: ${formatCurrency(m.spread.pessimistic)} mot ${formatCurrency(m.spread.optimistic)}`} />
        <Stat label="1 prosentpoeng avkastning per år" value={`≈ ${formatCurrency(m.value_per_return_point)}`}
          sub="Så mye mer eller mindre har du på måldatoen" />
      </div>

      <div className="grid grid--2" style={{ marginTop: 24 }}>
        <div>
          <h3 className="panel__title" style={{ fontSize: '0.95rem' }}>Hva består et typisk utfall av?</h3>
          <p className="panel__subtitle" style={{ marginBottom: 14 }}>{formatCurrency(m.composition.median)} i dagens kroner</p>
          <div className="split" role="img" aria-label={`Innbetalt ${formatCurrency(m.composition.paid_in)}, avkastning ${formatCurrency(growth)}`}>
            <span style={{ width: `${(m.composition.paid_in / total) * 100}%`, background: 'var(--neutral-mark)' }} />
            <span style={{ width: `${(growth / total) * 100}%`, background: 'var(--series-1)' }} />
          </div>
          <div className="legend">
            <span className="legend__item"><span className="swatch" style={{ background: 'var(--neutral-mark)' }} />Det du betaler inn {formatCurrency(m.composition.paid_in)}</span>
            <span className="legend__item"><span className="swatch" style={{ background: 'var(--series-1)' }} />Avkastning fra markedet {formatCurrency(growth)} ({formatPct(m.composition.market_share_pct, 0)})</span>
          </div>
        </div>
        <div>
          <h3 className="panel__title" style={{ fontSize: '0.95rem' }}>Når et fall kommer, betyr mye</h3>
          <p className="panel__subtitle" style={{ marginBottom: 6 }}>Samme fall, ulik timing (ellers gjennomsnittlig avkastning)</p>
          {timingRows.map((r) => (
            <div key={r.label} className="lever" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(60px, 30%) auto' }}>
              <span>{r.label}</span>
              <span className="lever__bar" aria-hidden="true"><span style={{ width: `${(r.value / maxValue) * 100}%`, background: r.tone }} /></span>
              <strong style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(r.value)}</strong>
            </div>
          ))}
        </div>
      </div>

      <ul className="small" style={{ margin: '20px 0 0', paddingLeft: 18, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {m.explanation.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </Panel>
  )
}

// Spending and target amount both set the goal; whichever slider was moved
// last decides it, so the other one goes back to its default.
function withOverride(current: ProjectionInput, key: keyof ProjectionInput, value: number): ProjectionInput {
  const next = { ...current, [key]: value }
  if (key === 'monthly_spending') delete next.target_amount
  if (key === 'target_amount') delete next.monthly_spending
  return next
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function Slider({ input, def, value, onChange }: { input: ResolvedInput; def: (typeof SLIDERS)[number]; value: number; onChange: (v: number) => void }) {
  const clamped = Math.min(def.max, Math.max(def.min, value))
  const fill = ((clamped - def.min) / (def.max - def.min)) * 100
  const id = `slider-${def.key}`
  return (
    <div className="slider">
      <div className="slider__top">
        <label className="slider__label" htmlFor={id}>{input.label}</label>
        <span className={`source source--${input.source}`} title={input.explanation}>{SOURCE_LABEL[input.source]}</span>
      </div>
      <span className="slider__value">{def.format(value)}</span>
      <input id={id} type="range" min={def.min} max={def.max} step={def.step} value={clamped}
        style={{ ['--fill' as string]: `${fill}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="small muted">{input.explanation}</span>
    </div>
  )
}

export default function Goals() {
  const { selectedCustomerId, selectedCustomer } = useCustomerContext()
  const [overrides, setOverrides] = useState<ProjectionInput>({})
  const debounced = useDebounced(overrides, 250)
  useEffect(() => setOverrides({}), [selectedCustomerId])
  const { data: g, loading, error } = useCustomerData((id) => fetchGoalProjection(id, debounced), [JSON.stringify(debounced)])

  const heading = (
    <PageHeading eyebrow="Case C · Følg målene dine" title="Kan jeg bli økonomisk uavhengig?"
      lead="Målet er å kunne leve av formuen: 25 × årlig forbruk, slik at du kan ta ut rundt 4 % i året. Du ser et spenn av mulige utfall, ikke et løfte. Juster forbruk, tid og sparing under «Prøv selv»." />
  )

  if (loading && !g) return <Loading />
  if (error) return <div className="page">{heading}<ErrorState message={error} /></div>
  if (!g) return null

  const status = STATUS[g.status]
  const targetInput = g.inputs.find((i) => i.key === 'target_amount')
  const target = targetInput?.value ?? 0
  const horizon = g.inputs.find((i) => i.key === 'years')?.value ?? 0
  const monthly = g.inputs.find((i) => i.key === 'monthly_contribution')?.value ?? 0
  const start = g.inputs.find((i) => i.key === 'starting_amount')
  const maxYears = Math.max(1, ...[g.years_needed_at_current_pace, ...g.levers.map((l) => l.years_needed)].map((y) => y ?? 50))
  const dirty = Object.keys(overrides).length > 0

  return (
    <div className="page" style={{ opacity: loading ? 0.75 : 1, transition: 'opacity .2s' }}>
      {heading}

      <div className="grid grid--main-side">
        <Panel title={`Økonomisk uavhengighet for ${selectedCustomer?.first_name ?? 'deg'}`}
          subtitle={targetInput?.explanation}
          action={<Pill tone={status.tone}>{status.label}</Pill>}>
          <div className="row" style={{ gap: 28, alignItems: 'center' }}>
            <ProbabilityRing value={g.probability_pct} caption="sjanse for å nå målet" />
            <div style={{ flex: 1, minWidth: 220 }} className="kv">
              <div className="kv__row"><span>Mål</span><strong>{formatCurrency(target)}</strong></div>
              <div className="kv__row"><span>Svakt marked (1 av 10)</span><span>{formatCurrency(g.outcomes.pessimistic)}</span></div>
              <div className="kv__row"><span>Typisk utfall</span><strong>{formatCurrency(g.outcomes.median)}</strong></div>
              <div className="kv__row"><span>Sterkt marked (1 av 10)</span><span>{formatCurrency(g.outcomes.optimistic)}</span></div>
            </div>
          </div>
        </Panel>

        <div className="grid">
          <Stat label="Målet gir per måned (4 % uttak)" value={`≈ ${formatCurrency(g.independence.goal_monthly_income)}`}
            sub={`${g.independence.coverage_pct} % av forbruket ditt på ${formatCurrency(g.independence.monthly_spending)} / mnd.`} />
          <Stat label="Nødvendig sparing per måned (gjennomsnittlig avkastning)" value={formatCurrency(g.required_monthly_contribution)}
            sub={g.required_monthly_contribution > monthly ? `${formatCurrency(g.required_monthly_contribution - monthly)} mer enn i dag` : 'Du sparer nok i dag'} />
          <Stat label="Med dagens tempo når du målet om"
            value={g.years_needed_at_current_pace ? years(g.years_needed_at_current_pace) : 'Over 50 år'}
            sub={`Målet er om ${years(horizon)}`} />
        </div>
      </div>

      <Story lines={g.summary} />

      <div className="grid grid--main-side">
        <Panel title="Dine mulige fremtider" subtitle="I dagens kroner, justert for inflasjon">
          <FanChart timeline={g.timeline} target={target} />
        </Panel>
        <Panel title="Prøv selv" subtitle={start ? `Med utgangspunkt i ${formatCurrency(start.value)} investert i dag` : undefined}
          action={dirty ? <button type="button" className="btn" onClick={() => setOverrides({})}>Tilbakestill</button> : undefined}>
          <div className="grid">
            {SLIDERS.map((def) => {
              const input = g.inputs.find((i) => i.key === def.key)
              if (!input) return null
              return <Slider key={def.key} def={def} input={input} value={overrides[def.key] ?? input.value}
                onChange={(v) => setOverrides((o) => withOverride(o, def.key, v))} />
            })}
          </div>
        </Panel>
      </div>

      <MarketImpactPanel m={g.market_impact} target={target} />

      <Panel title="Hva betyr mest?" subtitle={`Hvis én ting endres og alt annet er likt: hvor lang tid det tar å nå målet med gjennomsnittlig avkastning, og sjansen for å nå det innen ${years(horizon)}. Kortere stolpe er bedre.`}>
        <div>
          {[{ id: 'today', label: 'Dagens plan', probability_pct: g.probability_pct, delta_probability_pct: 0, years_needed: g.years_needed_at_current_pace }, ...g.levers].map((l) => {
            const base = g.years_needed_at_current_pace
            const tone = l.id === 'today' ? 'var(--neutral-mark)'
              : l.years_needed !== null && base !== null && l.years_needed < base ? 'var(--series-1)'
                : l.years_needed === base ? 'var(--neutral-mark)' : 'var(--series-7)'
            return (
              <div key={l.id} className="lever" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(80px, 30%) 96px 110px' }}>
                {l.id === 'today' ? <strong>{l.label}</strong> : <span>{l.label}</span>}
                <span className="lever__bar" aria-hidden="true"><span style={{ width: `${((l.years_needed ?? 50) / maxYears) * 100}%`, background: tone }} /></span>
                <strong style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{l.years_needed !== null ? years(l.years_needed) : '50+ år'}</strong>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="small">
                  {l.probability_pct} % sjanse{l.id !== 'today' && l.delta_probability_pct !== 0 && (
                    <span className={l.delta_probability_pct > 0 ? 'delta--pos' : 'delta--neg'}> ({l.delta_probability_pct > 0 ? '+' : ''}{l.delta_probability_pct})</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </Panel>

      <MethodNote assumptions={g.data_quality.assumptions} limitations={g.data_quality.limitations}
        extra={
          <div style={{ gridColumn: '1 / -1' }}>
            <h4>Hvor tallene kommer fra</h4>
            <div className="kv">
              {g.inputs.map((i) => (
                <div key={i.key} className="kv__row">
                  <span>{i.label}: <strong style={{ color: 'var(--text)' }}>{formatInput(i)}</strong></span>
                  <span className={`source source--${i.source}`}>{SOURCE_LABEL[i.source]}</span>
                </div>
              ))}
            </div>
          </div>
        } />
    </div>
  )
}
