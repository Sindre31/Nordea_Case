import type { Insight } from '../api/types'

const SEVERITY_LABEL: Record<Insight['severity'], string> = {
  info: 'Info',
  notice: 'Notice',
  warning: 'Warning',
}

export default function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`insight-card insight-card--${insight.severity}`}>
      <span className="insight-card__badge">{SEVERITY_LABEL[insight.severity]}</span>
      <h4>{insight.title}</h4>
      <p>{insight.detail}</p>
    </div>
  )
}
