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
import { formatCurrency, formatSignedCurrency } from '../utils/format'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
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

  const features = [
    {
      to: '/performance', icon: <TrendIcon />, tag: 'Case A', question: 'Why did my portfolio move?',
      answer: hasInvestments ? `${explain.change_value >= 0 ? 'Up' : 'Down'} ${formatSignedCurrency(explain.change_value).slice(1)} in 90 days. ${explain.summary[1] ?? ''}` : explain.summary[0],
    },
    {
      to: '/risk', icon: <ShieldIcon />, tag: 'Case B', question: 'Where does my risk come from?',
      answer: hasInvestments ? `${risk.by_sector[0]?.label} accounts for ${risk.by_sector[0]?.risk_contribution_pct}% of your swings. ${risk.alignment === 'above' ? 'Riskier than your profile.' : risk.alignment === 'below' ? 'Calmer than your profile.' : 'In line with your profile.'}` : risk.summary[0],
    },
    {
      to: '/goals', icon: <TargetIcon />, tag: 'Case C', question: 'Am I on track for my goal?',
      answer: goal.goal
        ? `${goal.probability_pct}% chance to reach ${formatCurrency(goal.inputs.find((i) => i.key === 'target_amount')?.value ?? 0)} for "${goal.goal.name}". ${goal.plan_check ? `${formatCurrency(Math.abs(goal.plan_check.difference))} ${goal.plan_check.verdict === 'on_plan' ? 'from' : goal.plan_check.verdict} plan.` : ''}`
        : 'No goal registered yet. Explore what your saving could grow into and what it takes to become financially independent.',
    },
  ]

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__grid">
          <div>
            <p className="hero__label">{greeting()}, {selectedCustomer?.first_name}. Your total wealth</p>
            <p className="hero__value"><AnimatedNumber value={netWorth} format={(v) => Math.round(v).toLocaleString('en-US')} /><small>NOK</small></p>
            <div className="hero__chips">
              {hasInvestments && (
                <Pill tone={performance.period_return_pct >= 0 ? 'good' : 'critical'}>
                  {performance.period_return_pct >= 0 ? '+' : ''}{performance.period_return_pct}% investments, 90 days
                </Pill>
              )}
              <Pill tone="accent">{selectedCustomer?.risk_profile} profile</Pill>
              <Pill>{selectedCustomer?.investment_horizon}</Pill>
            </div>
          </div>
          <div>{hasInvestments && <PerformanceChart series={performance.series} height={150} compact />}</div>
        </div>
      </section>

      <div className="grid grid--4">
        <Stat label="Bank deposits" value={formatCurrency(bank)} sub="Current and savings accounts" />
        <Stat label="Investments & pension" value={formatCurrency(invested)} sub={`${portfolio.holding_count} holdings`} />
        <Stat label="Unrealised gain" value={<span className={portfolio.unrealized_gain_loss >= 0 ? 'delta--pos' : 'delta--neg'}>{formatSignedCurrency(portfolio.unrealized_gain_loss)}</span>}
          sub={`${portfolio.unrealized_gain_loss_pct}% vs. purchase price`} />
        <Stat label="Saved per month" value={formatCurrency(insights.savings.averageMonthlySavings)} sub={`${insights.savings.savingsRatePct}% of income`} />
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Ask the questions that matter</p>
        <div className="grid grid--3">
          {features.map((f) => (
            <Link key={f.to} to={f.to} className="feature">
              <div className="feature__top"><span className="feature__icon">{f.icon}</span><span className="nav__case">{f.tag}</span></div>
              <p className="feature__question">{f.question}</p>
              <p className="feature__answer">{f.answer}</p>
              <span className="feature__cta row" style={{ gap: 6 }}>See the full explanation <ArrowIcon size={14} /></span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Worth knowing</p>
        <div className="grid grid--3">
          {insights.insights.slice(0, 3).map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
      </div>
    </div>
  )
}
