import { useEffect, useState, type DependencyList } from 'react'
import { useCustomerContext } from '../context/CustomerContext'

// Loads data for the selected customer and re-loads when the customer (or
// any extra dependency) changes. Ignores responses that arrive after the
// customer has been switched, so fast switching never shows stale data.
export function useCustomerData<T>(load: (customerId: string) => Promise<T>, deps: DependencyList = []) {
  const { selectedCustomerId } = useCustomerContext()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCustomerId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    load(selectedCustomerId)
      .then((result) => !cancelled && setData(result))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedCustomerId, ...deps])

  return { data, loading, error }
}
