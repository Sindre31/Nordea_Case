// Purpose-built explanation visuals for cases A-C. Plain HTML/SVG where a
// chart library would add more than it gives; recharts for the fan chart.
import { Area, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCompact, formatCurrency, formatSignedCurrency } from '../utils/format'

// --- Diverging bars: what pushed the value up (right) or down (left) -------
export function DivergingBars({ rows }: { rows: { key: string; label: string; detail?: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)))
  return (
    <div className="dbars" role="list">
      {rows.map((r) => {
        const width = `${(Math.abs(r.value) / max) * 50}%`
        return (
          <div key={r.key} className="dbar" role="listitem" title={`${r.label}: ${formatSignedCurrency(r.value)}`}>
            <span className="dbar__name"><strong>{r.label}</strong>{r.detail && <span className="muted"> &middot; {r.detail}</span>}</span>
            <span className="dbar__track" aria-hidden="true">
              <span className={`dbar__fill dbar__fill--${r.value >= 0 ? 'pos' : 'neg'}`} style={{ width }} />
            </span>
            <span className={`dbar__value ${r.value >= 0 ? 'delta--pos' : 'delta--neg'}`}>{formatSignedCurrency(r.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

// --- Range bar: is the result inside the normal band? ----------------------
export function RangeBar({ low, high, value, expected, unit = '%' }: { low: number; high: number; value: number; expected: number; unit?: string }) {
  const span = Math.max(Math.abs(low), Math.abs(high), Math.abs(value)) * 1.35 || 1
  const min = -span
  const pos = (v: number) => `${((v - min) / (2 * span)) * 100}%`
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}${unit}`
  return (
    <div className="range" role="img" aria-label={`Your result ${fmt(value)}. Normal range ${fmt(low)} to ${fmt(high)}.`}>
      <div className="range__track">
        <div className="range__band" style={{ left: pos(low), width: `calc(${pos(high)} - ${pos(low)})` }} />
        <div className="range__marker" style={{ left: pos(value) }}>
          <span className="range__marker-label">You: {fmt(value)}</span>
        </div>
        <span className="range__tick" style={{ left: pos(low) }}>{fmt(low)}</span>
        <span className="range__tick" style={{ left: pos(expected) }}>avg {fmt(expected)}</span>
        <span className="range__tick" style={{ left: pos(high) }}>{fmt(high)}</span>
      </div>
    </div>
  )
}

// --- Paired bars: share of money vs. share of risk (or start vs. now) -----
export function PairBars({ rows, aLabel, bLabel, aClass = 'pair__bar--money', bClass = 'pair__bar--risk' }: {
  rows: { label: string; a: number; b: number }[]
  aLabel: string
  bLabel: string
  aClass?: string
  bClass?: string
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]))
  return (
    <div>
      <div className="pairs">
        {rows.map((r) => (
          <div key={r.label} title={`${r.label}: ${aLabel} ${r.a}%, ${bLabel} ${r.b}%`}>
            <div className="pair__head">
              <span>{r.label}</span>
              <span className="muted">{r.a}% &rarr; <strong style={{ color: 'var(--text)' }}>{r.b}%</strong></span>
            </div>
            <div className="pair__bars" aria-hidden="true">
              <span className={`pair__bar ${aClass}`} style={{ width: `${(r.a / max) * 100}%` }} />
              <span className={`pair__bar ${bClass}`} style={{ width: `${(r.b / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="legend">
        <span className="legend__item"><span className={`swatch ${aClass}`} />{aLabel}</span>
        <span className="legend__item"><span className={`swatch ${bClass}`} />{bLabel}</span>
      </div>
    </div>
  )
}

// --- Gauge: yearly swings vs. the band that fits the risk profile ---------
export function VolGauge({ value, min, max }: { value: number; min: number; max: number }) {
  const scaleMax = Math.max(25, value * 1.2, max * 1.3)
  const angle = (v: number) => Math.PI * (1 - Math.min(v, scaleMax) / scaleMax)
  const pt = (v: number, r: number) => [100 + r * Math.cos(angle(v)), 100 - r * Math.sin(angle(v))]
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r)
    const [x2, y2] = pt(to, r)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }
  const [nx, ny] = pt(value, 64)
  const outside = value > max || value < min
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 118" role="img" aria-label={`Yearly swings ${value}%. Profile range ${min} to ${max}%.`}>
        <path d={arc(0, scaleMax, 80)} stroke="#1a2d5c" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d={arc(min, max, 80)} stroke="#3987e5" strokeWidth={14} fill="none" />
        <line x1={100} y1={100} x2={nx} y2={ny} stroke={outside ? '#f07a7a' : '#ffffff'} strokeWidth={4} strokeLinecap="round" />
        <circle cx={100} cy={100} r={8} fill="#ffffff" stroke="#0e1a3a" strokeWidth={3} />
        <text x={20} y={116} fill="#8291b8" fontSize={10} textAnchor="middle">0%</text>
        <text x={180} y={116} fill="#8291b8" fontSize={10} textAnchor="middle">{Math.round(scaleMax)}%</text>
      </svg>
      <div className="legend" style={{ marginTop: 0 }}>
        <span className="legend__item"><span className="swatch" style={{ background: '#3987e5' }} />Fits your profile ({min}-{max}%)</span>
        <span className="legend__item"><span className="swatch" style={{ background: outside ? '#f07a7a' : '#fff' }} />You ({value}%)</span>
      </div>
    </div>
  )
}

// --- Probability ring ------------------------------------------------------
export function ProbabilityRing({ value, caption }: { value: number; caption: string }) {
  const r = 70
  const c = 2 * Math.PI * r
  const color = value >= 75 ? '#3fcf6a' : value >= 50 ? '#86b6ef' : value >= 25 ? '#fab219' : '#f07a7a'
  return (
    <div className="ring" role="img" aria-label={`${value}% ${caption}`}>
      <svg width="168" height="168" viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={r} stroke="#1a2d5c" strokeWidth="14" fill="none" />
        <circle cx="84" cy="84" r={r} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="ring__label">
        <div>
          <div className="ring__value">{value}%</div>
          <div className="ring__caption">{caption}</div>
        </div>
      </div>
    </div>
  )
}

// --- Fan chart: range of outcomes over time --------------------------------
export function FanChart({ timeline, target }: {
  timeline: { year: number; p10: number; p50: number; p90: number; contributed: number }[]
  target: number
}) {
  const data = timeline.map((t) => ({ ...t, band: [t.p10, t.p90] as [number, number] }))
  const yMax = Math.max(target * 1.1, ...timeline.map((t) => t.p90))
  return (
    <div>
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3987e5" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3987e5" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(138,167,255,0.08)" vertical={false} />
          <XAxis dataKey="year" type="number" domain={[0, 'dataMax']} tickFormatter={(v: number) => `${Math.round(v)}y`}
            tick={{ fill: '#8291b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis domain={[0, yMax]} tickFormatter={formatCompact} width={52}
            tick={{ fill: '#8291b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: '#86b6ef', strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <div className="chart-tooltip">
                  <div className="chart-tooltip__label">After {p.year} years</div>
                  <div>Strong market: <strong>{formatCurrency(p.p90)}</strong></div>
                  <div>Typical: <strong>{formatCurrency(p.p50)}</strong></div>
                  <div>Weak market: <strong>{formatCurrency(p.p10)}</strong></div>
                  <div className="muted">You paid in: {formatCurrency(p.contributed)}</div>
                </div>
              )
            }}
          />
          <Area dataKey="band" stroke="none" fill="url(#fanFill)" isAnimationActive />
          <Line dataKey="contributed" stroke="#8291b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          <Line dataKey="p50" stroke="#ffffff" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#fff', stroke: '#0e1a3a', strokeWidth: 2 }} />
          <ReferenceLine y={target} stroke="#c98500" strokeWidth={2} strokeDasharray="6 4"
            label={{ value: `Goal ${formatCompact(target)}`, fill: '#ffd98a', fontSize: 12, position: 'insideTopLeft' }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="legend">
        <span className="legend__item"><span className="swatch" style={{ background: 'rgba(57,135,229,0.6)' }} />8 in 10 outcomes land here</span>
        <span className="legend__item"><span className="swatch" style={{ background: '#fff' }} />Typical outcome</span>
        <span className="legend__item"><span className="swatch" style={{ background: '#8291b8' }} />What you pay in</span>
        <span className="legend__item"><span className="swatch" style={{ background: '#c98500' }} />Your goal</span>
      </div>
    </div>
  )
}
