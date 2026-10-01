import { Link } from 'react-router-dom'
import { useCustomerContext } from '../context/CustomerContext'
import {
  fetchAccounts, fetchGoalProjection, fetchInsights, fetchPerformance, fetchPerformanceExplanation, fetchPortfolio, fetchRiskExplanation,
} from '../api/client'
import { useCustomerData } from '../hooks/useCustomerData'
import PerformanceChart from '../components/PerformanceChart'
import InsightCard from '../components/InsightCard'
import { ArrowIcon, ShieldIcon, TargetIcon, TrendIcon } from '../components/Icons'
import { AnimatedNumber, ErrorState, Loading, Pill, Stat } from '../components/ui'
import { formatCurrency, formatNumber, formatPct, formatSignedCurrency } from '../utils/format'
import { horizonName, profileName } from '../utils/labels'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'God kveld' : h < 10 ? 'God morgen' : h < 12 ? 'God formiddag' : h < 18 ? 'God ettermiddag' : 'God kveld'
}

export default function Dashboard() {
  const { selectedCustomer } = useCustomerContext()
  const { data, loading, error } = useCustomerData((id) => Promise.all([
    fetchAccounts(id), fetchPortfolio(id), fetchPerformance(id), fetchInsights(id),
    fetchPerformanceExplanation(id, 90), fetchRiskExplanation(id), fetchGoalProjection(id),
  ]))

  if (loading && !data) return <Loading rows={4} />
  if (error) return <ErrorState message={error} />
  if (!data) return null
  const [{ accounts }, portfolio, performance, insights, explain, risk, goal] = data

  const bank = accounts.filter((a) => a.account_type === 'Current Account' || a.account_type === 'Savings').reduce((s, a) => s + a.balance, 0)
  const invested = accounts.filter((a) => a.account_type === 'Investment Account' || a.account_type === 'Pension').reduce((s, a) => s + a.balance, 0)
  const netWorth = bank + invested
  const hasInvestments = portfolio.total_value > 0
  const target = goal.inputs.find((i) => i.key === 'target_amount')?.value ?? 0
  const planText = goal.plan_check
    ? goal.plan_check.verdict === 'on_plan'
      ? 'Du er i rute med planen.'
      : `${formatCurrency(Math.abs(goal.plan_check.difference))} ${goal.plan_check.verdict === 'ahead' ? 'foran' : 'bak'} planen.`
    : ''

  const features = [
    {
      to: '/performance', icon: <TrendIcon />, tag: 'Case A', question: 'Hvorfor endret porteføljen seg?',
      answer: hasInvestments ? `${explain.change_value >= 0 ? 'Opp' : 'Ned'} ${formatCurrency(Math.abs(explain.change_value))} på 90 dager. ${explain.summary[1] ?? ''}` : explain.summary[0],
    },
    {
      to: '/risk', icon: <ShieldIcon />, tag: 'Case B', question: 'Hvor kommer risikoen min fra?',
      answer: hasInvestments ? `${risk.by_sector[0]?.label} står for ${formatPct(risk.by_sector[0]?.risk_contribution_pct ?? 0)} av svingningene. ${risk.alignment === 'above' ? 'Mer risiko enn profilen din.' : risk.alignment === 'below' ? 'Roligere enn profilen din.' : 'I tråd med profilen din.'}` : risk.summary[0],
    },
    {
      to: '/goals', icon: <TargetIcon />, tag: 'Case C', question: 'Er jeg i rute til å nå målet mitt?',
      answer: goal.goal
        ? `${goal.probability_pct} % sjanse for å nå ${formatCurrency(target)} for «${goal.goal.name}». ${planText}`
        : 'Du har ikke registrert noe mål ennå. Se hva sparingen din kan vokse til, og hva som skal til for å bli økonomisk uavhengig.',
    },
  ]

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__grid">
          <div>
            <p className="hero__label">{greeting()}, {selectedCustomer?.first_name}. Din samlede formue</p>
            <p className="hero__value"><AnimatedNumber value={netWorth} format={(v) => formatNumber(Math.round(v))} /><small>KR</small></p>
            <div className="hero__chips">
              {hasInvestments && (
                <Pill tone={performance.period_return_pct >= 0 ? 'good' : 'critical'}>
                  {formatPct(performance.period_return_pct, 1, true)} investeringer, 90 dager
                </Pill>
              )}
              {selectedCustomer && <Pill tone="accent">Risikoprofil: {profileName(selectedCustomer.risk_profile)}</Pill>}
              {selectedCustomer && <Pill>Horisont: {horizonName(selectedCustomer.investment_horizon)}</Pill>}
            </div>
          </div>
          <div>{hasInvestments && <PerformanceChart series={performance.series} height={150} compact />}</div>
        </div>
      </section>

      <div className="grid grid--4">
        <Stat label="Bankinnskudd" value={formatCurrency(bank)} sub="Brukskonto og sparekonto" />
        <Stat label="Investeringer og pensjon" value={formatCurrency(invested)} sub={`${portfolio.holding_count} beholdninger`} />
        <Stat label="Urealisert gevinst" value={<span className={portfolio.unrealized_gain_loss >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(portfolio.unrealized_gain_loss)}</span>}
          sub={`${formatPct(portfolio.unrealized_gain_loss_pct, 1, true)} mot kjøpspris`} />
        <Stat label="Spart per måned" value={formatCurrency(insights.savings.averageMonthlySavings)} sub={`${formatPct(insights.savings.savingsRatePct)} av inntekten`} />
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Spørsmålene som betyr noe</p>
        <div className="grid grid--3">
          {features.map((f) => (
            <Link key={f.to} to={f.to} className="feature">
              <div className="feature__top"><span className="feature__icon">{f.icon}</span><span className="nav__case">{f.tag}</span></div>
              <p className="feature__question">{f.question}</p>
              <p className="feature__answer">{f.answer}</p>
              <span className="feature__cta row" style={{ gap: 6 }}>Se hele forklaringen <ArrowIcon size={14} /></span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Verdt å vite</p>
        <div className="grid grid--3">
          {insights.insights.slice(0, 3).map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
      </div>
    </div>
  )
}
