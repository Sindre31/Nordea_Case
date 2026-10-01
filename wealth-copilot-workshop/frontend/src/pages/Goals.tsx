// Case C - follow progress towards a financial goal, as a range of
// scenarios with every assumption visible and adjustable.
import { useEffect, useState } from 'react'
import { fetchGoalProjection } from '../api/client'
import type { InputSource, ProjectionInput, ResolvedInput } from '../api/types'
import { useCustomerContext } from '../context/CustomerContext'
import { useCustomerData } from '../hooks/useCustomerData'
import { FanChart, ProbabilityRing } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Stat, Story } from '../components/ui'
import { formatCurrency, formatDate, formatNumber, formatPct, formatSignedCurrency } from '../utils/format'

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

const SLIDERS: { key: keyof ProjectionInput; min: number; max: number; step: number; format: (v: number) => string }[] = [
  { key: 'target_amount', min: 100000, max: 10000000, step: 50000, format: formatCurrency },
  { key: 'years', min: 1, max: 40, step: 1, format: years },
  { key: 'monthly_contribution', min: 0, max: 40000, step: 500, format: (v) => `${formatCurrency(v)} / mnd.` },
  { key: 'annual_return_pct', min: 0, max: 10, step: 0.5, format: (v) => `${formatPct(v)} / år` },
]

function formatInput(i: ResolvedInput): string {
  if (i.unit === 'NOK') return formatCurrency(i.value)
  if (i.unit === 'NOK/month') return `${formatCurrency(i.value)} / mnd.`
  if (i.unit === '%') return formatPct(i.value)
  return years(i.value)
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
    <PageHeading eyebrow="Case C · Følg målene dine" title="Er jeg i rute til å nå målet mitt?"
      lead="Et spenn av mulige utfall, ikke et løfte. Flytt på glidebryterne for å se hva som betyr mest for å nå målet." />
  )

  if (loading && !g) return <Loading />
  if (error) return <div className="page">{heading}<ErrorState message={error} /></div>
  if (!g) return null

  const status = STATUS[g.status]
  const target = g.inputs.find((i) => i.key === 'target_amount')?.value ?? 0
  const horizon = g.inputs.find((i) => i.key === 'years')?.value ?? 0
  const monthly = g.inputs.find((i) => i.key === 'monthly_contribution')?.value ?? 0
  const start = g.inputs.find((i) => i.key === 'starting_amount')
  const maxLever = Math.max(1, ...g.levers.map((l) => l.probability_pct))
  const dirty = Object.keys(overrides).length > 0
  const plan = g.plan_check

  return (
    <div className="page" style={{ opacity: loading ? 0.75 : 1, transition: 'opacity .2s' }}>
      {heading}

      <div className="grid grid--main-side">
        <Panel title={g.goal?.name ?? `Økonomisk uavhengighet for ${selectedCustomer?.first_name ?? 'deg'} (anslag)`}
          subtitle={g.goal ? `Registrert ${formatDate(g.goal.created_at)} · måldato ${formatDate(g.goal.target_date)}` : 'Ingen mål er registrert ennå. Vi har tatt utgangspunkt i forbruket ditt og merket alle anslag.'}
          action={<Pill tone={status.tone}>{status.label}</Pill>}>
          <div className="row" style={{ gap: 28, alignItems: 'center' }}>
            <ProbabilityRing value={g.probability_pct} caption="sjanse for å nå det" />
            <div style={{ flex: 1, minWidth: 220 }} className="kv">
              <div className="kv__row"><span>Mål</span><strong>{formatCurrency(target)}</strong></div>
              <div className="kv__row"><span>Svakt marked (1 av 10)</span><span>{formatCurrency(g.outcomes.pessimistic)}</span></div>
              <div className="kv__row"><span>Typisk utfall</span><strong>{formatCurrency(g.outcomes.median)}</strong></div>
              <div className="kv__row"><span>Sterkt marked (1 av 10)</span><span>{formatCurrency(g.outcomes.optimistic)}</span></div>
            </div>
          </div>
        </Panel>

        <div className="grid">
          {plan ? (
            <Stat label={`Mot planen din fra for ${plan.months_since_start} måneder siden`}
              value={<span className={plan.difference >= 0 ? 'delta--pos' : 'delta--neg'}>
                {plan.verdict === 'on_plan' ? 'I rute' : `${formatSignedCurrency(plan.difference)} ${plan.verdict === 'ahead' ? 'foran' : 'bak'}`}
              </span>}
              sub={`Planen forventet ${formatCurrency(plan.planned_value_today)} nå. Du har ${formatCurrency(plan.actual_value_today)}.`} />
          ) : (
            <Stat label="Mot plan" value="Ingen plan ennå" sub="Registrer et mål for å følge med på om du ligger foran eller bak." />
          )}
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
                onChange={(v) => setOverrides((o) => ({ ...o, [def.key]: v }))} />
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Hva betyr mest?" subtitle="Sjansen for å nå målet hvis én ting endres og alt annet er likt">
        <div>
          <div className="lever">
            <strong>Dagens plan</strong>
            <span className="lever__bar"><span style={{ width: `${(g.probability_pct / maxLever) * 100}%`, background: 'var(--neutral-mark)' }} /></span>
            <strong style={{ textAlign: 'right' }}>{g.probability_pct} %</strong>
          </div>
          {g.levers.map((l) => (
            <div key={l.id} className="lever">
              <span>{l.label}</span>
              <span className="lever__bar" aria-hidden="true"><span style={{ width: `${(l.probability_pct / maxLever) * 100}%`, background: l.delta_probability_pct < 0 ? 'var(--series-7)' : undefined }} /></span>
              <span style={{ textAlign: 'right' }}>
                <strong>{l.probability_pct} %</strong>{' '}
                <span className={`small ${l.delta_probability_pct >= 0 ? 'delta--pos' : 'delta--neg'}`}>({l.delta_probability_pct >= 0 ? '+' : ''}{l.delta_probability_pct})</span>
              </span>
            </div>
          ))}
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
