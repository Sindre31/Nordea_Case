import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { AllocationSlice } from '../api/types'
import { formatCurrency } from '../utils/format'

// Categorical slots in fixed order (validated for colour-blind separation on
// white). More than 6 slices fold into "Other" - never cycle hues. Every
// slice is also named with its percentage in the legend.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']
const OTHER = '#9aa1b5'

function fold(data: AllocationSlice[]): (AllocationSlice & { color: string })[] {
  if (data.length <= SERIES.length) return data.map((d, i) => ({ ...d, color: SERIES[i] }))
  const head = data.slice(0, SERIES.length - 1).map((d, i) => ({ ...d, color: SERIES[i] }))
  const rest = data.slice(SERIES.length - 1)
  const other = {
    label: 'Other',
    value: rest.reduce((s, d) => s + d.value, 0),
    percentage: Number(rest.reduce((s, d) => s + d.percentage, 0).toFixed(2)),
    color: OTHER,
  }
  return [...head, other]
}

export default function AllocationPieChart({ data, title }: { data: AllocationSlice[]; title: string }) {
  const slices = fold(data)
  return (
    <section className="panel">
      <div className="panel__head"><h2 className="panel__title">{title}</h2></div>
      {slices.length === 0 ? <p className="state">No holdings to display.</p> : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="label" innerRadius={58} outerRadius={86}
                paddingAngle={1.5} stroke="#ffffff" strokeWidth={2} cornerRadius={4}>
                {slices.map((s) => <Cell key={s.label} fill={s.color} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => active && payload?.length ? (
                <div className="chart-tooltip">
                  <div className="chart-tooltip__label">{String(payload[0].payload.label)}</div>
                  <strong>{payload[0].payload.percentage}%</strong> &middot; {formatCurrency(Number(payload[0].payload.value))}
                </div>
              ) : null} />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {slices.map((s) => (
              <span key={s.label} className="legend__item">
                <span className="swatch" style={{ background: s.color }} />{s.label} <strong>{s.percentage}%</strong>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
