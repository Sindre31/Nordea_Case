import { NavLink, Outlet } from 'react-router-dom'
import CustomerSwitcher, { PersonaChips } from './CustomerSwitcher'
import { useCustomerContext } from '../context/CustomerContext'
import { LogoMark } from './Icons'
import { ErrorState } from './ui'

export default function Layout() {
  const { error } = useCustomerContext()
  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="masthead__inner">
          <NavLink to="/" className="brand" aria-label="Wealth Copilot home">
            <span className="brand__mark"><LogoMark size={20} /></span>
            <span>
              <span className="brand__name">Wealth Copilot</span>
              <br />
              <span className="brand__tag">Private Banking</span>
            </span>
          </NavLink>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>Overview</NavLink>
            <NavLink to="/performance">Performance <span className="nav__case">A</span></NavLink>
            <NavLink to="/risk">Risk <span className="nav__case">B</span></NavLink>
            <NavLink to="/goals">Goals <span className="nav__case">C</span></NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/insights">Insights</NavLink>
            <NavLink to="/copilot">Ask Copilot</NavLink>
          </nav>
          <CustomerSwitcher />
        </div>
      </header>
      <div className="subbar">
        <div className="subbar__inner">
          <span className="subbar__label">Workshop cases</span>
          <PersonaChips />
          <span className="subbar__note">Fictional synthetic data &middot; not financial advice</span>
        </div>
      </div>
      <main className="content">
        {error ? <ErrorState message={error} /> : <Outlet />}
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <span>Wealth Copilot &middot; workshop prototype</span>
          <span>All customers, accounts and holdings are fictional. Figures are illustrations, not advice or promises.</span>
        </div>
      </footer>
    </div>
  )
}
