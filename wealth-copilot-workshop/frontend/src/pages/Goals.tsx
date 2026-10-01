// Case C - follow progress towards a financial goal, as a range of
// scenarios with every assumption visible and adjustable.
import { useEffect, useState } from 'react'
import { fetchGoalProjection } from '../api/client'
import type { InputSource, ProjectionInput, ResolvedInput } from '../api/types'
import { useCustomerContext } from '../context/CustomerContext'
import { useCustomerData } from '../hooks/useCustomerData'
import { FanChart, ProbabilityRing } from '../components/charts'
import { ErrorState, Loading, MethodNote, PageHeading, Panel, Pill, Stat, Story } from '../components/ui'
import { formatCurrency, formatDate, formatSignedCurrency } from '../utils/format'

const SOURCE_LABEL: Record<InputSource, string> = {
  your_input: 'Your input',
  registered_goal: 'Your goal',
  your_data: 'From your data',
  assumption: 'Assumption',
}

const STATUS = {
  likely: { tone: 'good', label: 'Likely on track' },
  possible: { tone: 'accent', label: 'Possible, not certain' },
  at_risk: { tone: 'warning', label: 'At risk' },
  unlikely: { tone: 'critical', label: 'Unlikely without changes' },
} as const

const SLIDERS: { key: keyof ProjectionInput; min: number; max: number; step: number; format: (v: number) => string }[] = [
  { key: 'target_amount', min: 100000, max: 10000000, step: 50000, format: formatCurrency },
  { key: 'years', min: 1, max: 40, step: 1, format: (v) => `${Math.round(v * 10) / 10} years` },
  { key: 'monthly_contribution', min: 0, max: 40000, step: 500, format: (v) => `${formatCurrency(v)} / month` },
  { key: 'annual_return_pct', min: 0, max: 10, step: 0.5, format: (v) => `${v}% / year` },
]

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
    <PageHeading eyebrow="Case C · Follow your goals" title="Am I on track for my goal?"
      lead="A range of possible futures, not a promise. Move the sliders to see what matters most for reaching your goal." />
  )

  if (loading && !g) return <Loading />
  if (error) return <div className="page">{heading}<ErrorState message={error} /></div>
  if (!g) return null

  const status = STATUS[g.status]
  const target = g.inputs.find((i) => i.key === 'target_amount')?.value ?? 0
  const years = g.inputs.find((i) => i.key === 'years')?.value ?? 0
  const monthly = g.inputs.find((i) => i.key === 'monthly_contribution')?.value ?? 0
  const start = g.inputs.find((i) => i.key === 'starting_amount')
  const maxLever = Math.max(1, ...g.levers.map((l) => l.probability_pct))
  const dirty = Object.keys(overrides).length > 0

  return (
    <div className="page" style={{ opacity: loading ? 0.75 : 1, transition: 'opacity .2s' }}>
      {heading}

      <div className="grid grid--main-side">
        <Panel title={g.goal?.name ?? `${selectedCustomer?.first_name ?? 'Your'}'s financial independence (estimate)`}
          subtitle={g.goal ? `Registered ${formatDate(g.goal.created_at)} · target date ${formatDate(g.goal.target_date)}` : 'No goal registered yet: we started from your spending and labelled every estimate.'}
          action={<Pill tone={status.tone}>{status.label}</Pill>}>
          <div className="row" style={{ gap: 28, alignItems: 'center' }}>
            <ProbabilityRing value={g.probability_pct} caption="chance to reach it" />
            <div style={{ flex: 1, minWidth: 220 }} className="kv">
              <div className="kv__row"><span>Goal</span><strong>{formatCurrency(target)}</strong></div>
              <div className="kv__row"><span>Weak market (1 in 10)</span><span>{formatCurrency(g.outcomes.pessimistic)}</span></div>
              <div className="kv__row"><span>Typical outcome</span><strong>{formatCurrency(g.outcomes.median)}</strong></div>
              <div className="kv__row"><span>Strong market (1 in 10)</span><span>{formatCurrency(g.outcomes.optimistic)}</span></div>
            </div>
          </div>
        </Panel>

        <div className="grid">
          {g.plan_check ? (
            <Stat label={`Versus your plan from ${g.plan_check.months_since_start} months ago`}
              value={<span className={g.plan_check.difference >= 0 ? 'delta--pos' : 'delta--neg'}>
                {g.plan_check.verdict === 'on_plan' ? 'On plan' : `${formatSignedCurrency(g.plan_check.difference)} ${g.plan_check.verdict}`}
              </span>}
              sub={`Plan expected ${formatCurrency(g.plan_check.planned_value_today)} by now, you have ${formatCurrency(g.plan_check.actual_value_today)}.`} />
          ) : (
            <Stat label="Versus plan" value="No plan yet" sub="Register a goal to track whether you are ahead or behind." />
          )}
          <Stat label="Needed per month (average returns)" value={formatCurrency(g.required_monthly_contribution)}
            sub={g.required_monthly_contribution > monthly ? `${formatCurrency(g.required_monthly_contribution - monthly)} more than today` : 'You are saving enough today'} />
          <Stat label="At today's pace you get there in"
            value={g.years_needed_at_current_pace ? `${g.years_needed_at_current_pace} years` : '50+ years'}
            sub={`Target is ${Math.round(years * 10) / 10} years`} />
        </div>
      </div>

      <Story lines={g.summary} />

      <div className="grid grid--main-side">
        <Panel title="Your possible futures" subtitle="In today's money, after inflation">
          <FanChart timeline={g.timeline} target={target} />
        </Panel>
        <Panel title="Try it yourself" subtitle={start ? `Starting from ${formatCurrency(start.value)} invested today` : undefined}
          action={dirty ? <button type="button" className="btn" onClick={() => setOverrides({})}>Reset</button> : undefined}>
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

      <Panel title="What makes the biggest difference?" subtitle="Chance of reaching the goal if one thing changes, all else equal">
        <div>
          <div className="lever">
            <strong>Today's plan</strong>
            <span className="lever__bar"><span style={{ width: `${(g.probability_pct / maxLever) * 100}%`, background: 'var(--neutral-mark)' }} /></span>
            <strong style={{ textAlign: 'right' }}>{g.probability_pct}%</strong>
          </div>
          {g.levers.map((l) => (
            <div key={l.id} className="lever">
              <span>{l.label}</span>
              <span className="lever__bar" aria-hidden="true"><span style={{ width: `${(l.probability_pct / maxLever) * 100}%`, background: l.delta_probability_pct < 0 ? 'var(--series-7)' : undefined }} /></span>
              <span style={{ textAlign: 'right' }}>
                <strong>{l.probability_pct}%</strong>{' '}
                <span className={`small ${l.delta_probability_pct >= 0 ? 'delta--pos' : 'delta--neg'}`}>({l.delta_probability_pct >= 0 ? '+' : ''}{l.delta_probability_pct})</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <MethodNote assumptions={g.data_quality.assumptions} limitations={g.data_quality.limitations}
        extra={
          <div style={{ gridColumn: '1 / -1' }}>
            <h4>Where each number comes from</h4>
            <div className="kv">
              {g.inputs.map((i) => (
                <div key={i.key} className="kv__row">
                  <span>{i.label}: <strong style={{ color: 'var(--text)' }}>{i.unit === 'NOK' || i.unit === 'NOK/month' ? formatCurrency(i.value) : `${i.value}${i.unit === '%' ? '%' : ` ${i.unit}`}`}</strong></span>
                  <span className={`source source--${i.source}`}>{SOURCE_LABEL[i.source]}</span>
                </div>
              ))}
            </div>
          </div>
        } />
    </div>
  )
}
