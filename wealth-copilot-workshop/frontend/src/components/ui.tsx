// Small presentational building blocks shared by every page.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertIcon, CheckIcon, DataIcon, InfoIcon, SparkIcon } from './Icons'

export function PageHeading({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lead && <p className="page-heading__lead">{lead}</p>}
      </div>
      {children}
    </div>
  )
}

export function Panel({ title, subtitle, action, children, className = '' }: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel__head">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="stat">
      <p className="stat__label">{icon}{label}</p>
      <p className="stat__value">{value}</p>
      {sub && <p className="stat__sub">{sub}</p>}
    </div>
  )
}

// Status is never colour alone: every pill carries an icon and a word.
export type Tone = 'good' | 'warning' | 'critical' | 'accent' | 'neutral'
export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const icon = tone === 'good' ? <CheckIcon size={13} /> : tone === 'warning' || tone === 'critical' ? <AlertIcon size={13} /> : tone === 'accent' ? <InfoIcon size={13} /> : null
  return <span className={`pill pill--${tone}`}>{icon}{children}</span>
}

export function Delta({ value, children }: { value: number; children: ReactNode }) {
  return <span className={value >= 0 ? 'delta--pos' : 'delta--neg'}>{children}</span>
}

// "In plain words" narrative - the main answer to the customer's question.
export function Story({ title = 'In plain words', lines }: { title?: string; lines: string[] }) {
  return (
    <div className="story" aria-live="polite">
      <span className="story__icon"><SparkIcon size={16} /></span>
      <p className="story__title">{title}</p>
      <ul>
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </div>
  )
}

// "How we calculated this" - assumptions and known data gaps, always one
// click away from the numbers they qualify.
export function MethodNote({ assumptions, limitations, extra }: { assumptions: string[]; limitations: string[]; extra?: ReactNode }) {
  return (
    <details className="method">
      <summary><DataIcon size={16} /> How we calculated this &middot; what the data can't tell us</summary>
      <div className="method__body">
        <div>
          <h4>Assumptions</h4>
          <ul>{assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
        <div>
          <h4>Limitations &amp; missing data</h4>
          <ul>{limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        {extra}
      </div>
    </details>
  )
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Counts up to a number on mount / change. Respects reduced motion.
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const initial = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(initial + (value - initial) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{format(display)}</>
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 56, width: '40%' }} />
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: i === 0 ? 180 : 120 }} />)}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel state state--error" role="alert">
      <p><strong>Could not load data.</strong></p>
      <p className="small">{message}</p>
      <p className="small muted" style={{ marginTop: 8 }}>Is the API running? Start it with <code>npm run dev</code>.</p>
    </div>
  )
}
