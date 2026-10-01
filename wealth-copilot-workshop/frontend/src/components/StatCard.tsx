interface StatCardProps {
  label: string
  value: string
  sublabel?: string
  tone?: 'default' | 'positive' | 'negative'
}

export default function StatCard({ label, value, sublabel, tone = 'default' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {sublabel && <p className="stat-card__sublabel">{sublabel}</p>}
    </div>
  )
}
