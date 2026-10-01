import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PerformancePoint } from '../api/types'
import { formatCompact, formatCurrency } from '../utils/format'

function shortDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(date))
}

// Single-series value-over-time chart with a crosshair tooltip.
export default function PerformanceChart({ series, height = 260, compact = false }: { series: PerformancePoint[]; height?: number; compact?: boolean }) {
  if (series.length === 0) return <p className="state">No performance history available yet.</p>
  const values = series.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.15 || max * 0.05 || 1
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3987e5" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#3987e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && <CartesianGrid stroke="rgba(138,167,255,0.08)" vertical={false} />}
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={48} hide={compact}
          tick={{ fill: '#8291b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[min - pad, max + pad]} tickFormatter={formatCompact} width={48} hide={compact}
          tick={{ fill: '#8291b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ stroke: '#86b6ef', strokeDasharray: '4 4' }}
          content={({ active, payload, label }) => active && payload?.length ? (
            <div className="chart-tooltip">
              <div className="chart-tooltip__label">{shortDate(String(label))}</div>
              <strong>{formatCurrency(Number(payload[0].value))}</strong>
            </div>
          ) : null}
        />
        <Area type="monotone" dataKey="value" stroke="#86b6ef" strokeWidth={2} fill="url(#valueFill)"
          activeDot={{ r: 5, stroke: '#0e1a3a', strokeWidth: 2, fill: '#86b6ef' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
