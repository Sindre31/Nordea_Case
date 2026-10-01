import { NavLink, Outlet } from 'react-router-dom'
import CustomerSwitcher, { PersonaChips } from './CustomerSwitcher'
import { useCustomerContext } from '../context/CustomerContext'
import { BulbIcon, HomeIcon, LogoMark, PieIcon, ShieldIcon, SparkIcon, TargetIcon, TrendIcon } from './Icons'
import { ErrorState } from './ui'

export default function Layout() {
  const { error } = useCustomerContext()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="Wealth Copilot home">
          <span className="brand__mark"><LogoMark /></span>
          <span>
            <span className="brand__name">Wealth Copilot</span>
            <br />
            <span className="brand__tag">Private Banking &middot; demo</span>
          </span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          <span className="nav__section">Overview</span>
          <NavLink to="/" end><HomeIcon /> Overview</NavLink>
          <span className="nav__section">Understand</span>
          <NavLink to="/performance"><TrendIcon /> Performance <span className="nav__case">A</span></NavLink>
          <NavLink to="/risk"><ShieldIcon /> Risk <span className="nav__case">B</span></NavLink>
          <NavLink to="/goals"><TargetIcon /> Goals <span className="nav__case">C</span></NavLink>
          <span className="nav__section">Explore</span>
          <NavLink to="/portfolio"><PieIcon /> Portfolio</NavLink>
          <NavLink to="/insights"><BulbIcon /> Insights</NavLink>
          <NavLink to="/copilot"><SparkIcon /> Ask Copilot</NavLink>
        </nav>
        <p className="sidebar__footer">All customers, accounts and holdings are fictional synthetic data. Educational demo, not financial advice.</p>
      </aside>
      <div className="main">
        <header className="topbar">
          <PersonaChips />
          <CustomerSwitcher />
        </header>
        <main className="content">
          {error ? <ErrorState message={error} /> : <Outlet />}
        </main>
      </div>
    </div>
  )
}
