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
          <NavLink to="/" className="brand" aria-label="Wealth Copilot forside">
            <span className="brand__mark"><LogoMark size={20} /></span>
            <span>
              <span className="brand__name">Wealth Copilot</span>
              <br />
              <span className="brand__tag">Private Banking</span>
            </span>
          </NavLink>
          <nav className="nav" aria-label="Hovedmeny">
            <NavLink to="/" end>Oversikt</NavLink>
            <NavLink to="/performance">Utvikling <span className="nav__case">A</span></NavLink>
            <NavLink to="/risk">Risiko <span className="nav__case">B</span></NavLink>
            <NavLink to="/goals">Mål <span className="nav__case">C</span></NavLink>
            <NavLink to="/portfolio">Portefølje</NavLink>
            <NavLink to="/insights">Innsikter</NavLink>
            <NavLink to="/copilot">Spør Copilot</NavLink>
          </nav>
          <CustomerSwitcher />
        </div>
      </header>
      <div className="subbar">
        <div className="subbar__inner">
          <span className="subbar__label">Workshop-caser</span>
          <PersonaChips />
          <span className="subbar__note">Fiktive, syntetiske data &middot; ikke finansiell rådgivning</span>
        </div>
      </div>
      <main className="content">
        {error ? <ErrorState message={error} /> : <Outlet />}
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <span>Wealth Copilot &middot; workshop-prototype</span>
          <span>Alle kunder, kontoer og beholdninger er fiktive. Tallene er illustrasjoner, ikke råd eller løfter.</span>
        </div>
      </footer>
    </div>
  )
}
