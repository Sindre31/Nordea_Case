import type { Insight } from '../api/types'
import { AlertIcon, BulbIcon, InfoIcon } from './Icons'

const SEVERITY: Record<Insight['severity'], { label: string; icon: JSX.Element }> = {
  info: { label: 'Good to know', icon: <InfoIcon /> },
  notice: { label: 'Worth a look', icon: <BulbIcon /> },
  warning: { label: 'Needs attention', icon: <AlertIcon /> },
}

export default function InsightCard({ insight }: { insight: Insight }) {
  const s = SEVERITY[insight.severity]
  return (
    <div className={`insight insight--${insight.severity}`}>
      <span className="insight__icon">{s.icon}</span>
      <div>
        <span className="insight__tag">{s.label}</span>
        <h4>{insight.title}</h4>
        <p>{insight.detail}</p>
      </div>
    </div>
  )
}
