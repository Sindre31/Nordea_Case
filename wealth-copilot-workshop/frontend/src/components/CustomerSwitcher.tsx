import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PERSONAS, useCustomerContext } from '../context/CustomerContext'
import type { Customer } from '../api/types'
import { ChevronIcon } from './Icons'

export function initials(c: Customer) {
  return `${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`
}

// Quick access to the three case personas.
export function PersonaChips() {
  const { customers, selectedCustomerId, setSelectedCustomerId } = useCustomerContext()
  const navigate = useNavigate()
  return (
    <div className="topbar__personas" role="group" aria-label="Workshop cases">
      {PERSONAS.map((p) => {
        const c = customers.find((x) => x.customer_id === p.id)
        if (!c) return null
        return (
          <button key={p.id} type="button" className="persona-chip" aria-pressed={selectedCustomerId === p.id}
            onClick={() => { setSelectedCustomerId(p.id); navigate(p.path) }} title={p.question}>
            <span className="avatar">{initials(c)}</span>
            <span>{c.first_name} <span className="persona-chip__case">&middot; {p.caseLabel}</span></span>
          </button>
        )
      })}
    </div>
  )
}

// Searchable list of all customers.
export default function CustomerSwitcher() {
  const { customers, selectedCustomer, setSelectedCustomerId, loading } = useCustomerContext()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => `${c.first_name} ${c.last_name} ${c.customer_id} ${c.risk_profile}`.toLowerCase().includes(q))
  }, [customers, query])

  if (loading || !selectedCustomer) return <div className="switcher skeleton" style={{ width: 200, height: 46 }} />

  return (
    <div className="switcher" ref={ref}>
      <button type="button" className="switcher__button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar avatar--lg">{initials(selectedCustomer)}</span>
        <span>
          <span className="switcher__name">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
          <br />
          <span className="switcher__meta">{selectedCustomer.age} y &middot; {selectedCustomer.risk_profile}</span>
        </span>
        <ChevronIcon size={16} />
      </button>
      {open && (
        <div className="switcher__panel">
          <input autoFocus placeholder="Search name, ID or profile..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
          <div className="switcher__list" role="listbox" aria-label="Customers">
            {filtered.map((c) => {
              const persona = PERSONAS.find((p) => p.id === c.customer_id)
              return (
                <button key={c.customer_id} type="button" role="option" aria-selected={c.customer_id === selectedCustomer.customer_id}
                  className="switcher__option" onClick={() => { setSelectedCustomerId(c.customer_id); setOpen(false); setQuery('') }}>
                  <span className="avatar">{initials(c)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="switcher__name">{c.first_name} {c.last_name}</span>
                    <br />
                    <span className="switcher__meta">{c.customer_id} &middot; {c.age} y &middot; {c.risk_profile}</span>
                  </span>
                  {persona && <span className="nav__case">{persona.caseLabel}</span>}
                </button>
              )
            })}
            {filtered.length === 0 && <p className="state small">No customers match.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
