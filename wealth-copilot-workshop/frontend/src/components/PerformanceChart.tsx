import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PerformancePoint } from '../api/types'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(date))
}

export default function PerformanceChart({ series }: { series: PerformancePoint[] }) {
  if (series.length === 0) {
    return <p className="empty-state">No performance history available yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={series}>
        <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={40} />
        <YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} width={50} />
        <Tooltip
          labelFormatter={(label: string) => formatDate(label)}
          formatter={(value: number) => [`${value.toLocaleString('en-US')} NOK`, 'Portfolio value']}
        />
        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
