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
  // Separate ids so the hero chart and a page chart never share a gradient.
  const gradientId = compact ? 'valueFillCompact' : 'valueFill'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={compact ? '#dcedff' : '#2a78d6'} stopOpacity={compact ? 0.35 : 0.22} />
            <stop offset="100%" stopColor={compact ? '#dcedff' : '#2a78d6'} stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && <CartesianGrid stroke="#eceef3" vertical={false} />}
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={48} hide={compact}
          tick={{ fill: '#646a85', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[min - pad, max + pad]} tickFormatter={formatCompact} width={48} hide={compact}
          tick={{ fill: '#646a85', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ stroke: compact ? '#dcedff' : '#0000a0', strokeDasharray: '4 4' }}
          content={({ active, payload, label }) => active && payload?.length ? (
            <div className="chart-tooltip">
              <div className="chart-tooltip__label">{shortDate(String(label))}</div>
              <strong>{formatCurrency(Number(payload[0].value))}</strong>
            </div>
          ) : null}
        />
        <Area type="monotone" dataKey="value" stroke={compact ? '#ffffff' : '#2a78d6'} strokeWidth={2} fill={`url(#${gradientId})`}
          activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2, fill: compact ? '#ffffff' : '#2a78d6' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
