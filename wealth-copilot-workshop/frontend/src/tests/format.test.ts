import { describe, expect, it } from 'vitest'
import { formatCurrency, formatPercentage } from '../utils/format'

describe('formatCurrency', () => {
  it('rounds and formats with the default currency', () => {
    expect(formatCurrency(1234.56)).toBe('1,235 NOK')
  })

  it('supports a custom currency', () => {
    expect(formatCurrency(1000, 'USD')).toBe('1,000 USD')
  })
})

describe('formatPercentage', () => {
  it('adds a plus sign for non-negative values', () => {
    expect(formatPercentage(4.2)).toBe('+4.2%')
    expect(formatPercentage(0)).toBe('+0%')
  })

  it('keeps the minus sign for negative values', () => {
    expect(formatPercentage(-3.1)).toBe('-3.1%')
  })
})
