import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCustomers } from '../api/client'
import type { Customer } from '../api/types'

interface CustomerContextValue {
  customers: Customer[]
  selectedCustomerId: string | null
  setSelectedCustomerId: (id: string) => void
  selectedCustomer: Customer | null
  loading: boolean
  error: string | null
}

const CustomerContext = createContext<CustomerContextValue | undefined>(undefined)

// The three workshop personas (see docs/workshop.md) are shown first, then
// the rest of the synthetic customers.
export const PERSONAS = [
  { id: 'CUST-00101', caseLabel: 'Case A', question: 'Why did my portfolio grow?', path: '/performance' },
  { id: 'CUST-00102', caseLabel: 'Case B', question: 'Where does my risk come from?', path: '/risk' },
  { id: 'CUST-00103', caseLabel: 'Case C', question: 'Will I reach my goal?', path: '/goals' },
]
const FEATURED_CUSTOMER_IDS = PERSONAS.map((p) => p.id)
const STORAGE_KEY = 'wealth-copilot:customer'

function readStoredCustomer(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCustomers()
      .then((result) => {
        if (cancelled) return
        const ordered = [
          ...FEATURED_CUSTOMER_IDS.map((id) => result.customers.find((c) => c.customer_id === id)).filter(Boolean),
          ...result.customers.filter((c) => !FEATURED_CUSTOMER_IDS.includes(c.customer_id)),
        ] as Customer[]
        setCustomers(ordered)
        const stored = readStoredCustomer()
        const initial = ordered.find((c) => c.customer_id === stored) ?? ordered[0]
        setSelectedCustomerId(initial?.customer_id ?? null)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.customer_id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  )

  const selectCustomer = (id: string) => {
    setSelectedCustomerId(id)
    try {
      window.localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Storage can be unavailable (private mode); selection still works.
    }
  }

  const value: CustomerContextValue = {
    customers,
    selectedCustomerId,
    setSelectedCustomerId: selectCustomer,
    selectedCustomer,
    loading,
    error,
  }

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

export function useCustomerContext(): CustomerContextValue {
  const context = useContext(CustomerContext)
  if (!context) throw new Error('useCustomerContext must be used within a CustomerProvider')
  return context
}
