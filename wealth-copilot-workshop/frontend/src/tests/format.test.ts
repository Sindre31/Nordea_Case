import { describe, expect, it } from 'vitest'
import { formatCompact, formatCurrency, formatPercentage, formatSignedCurrency } from '../utils/format'

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

describe('formatCompact', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCompact(340_000)).toBe('340k')
    expect(formatCompact(1_250_000)).toBe('1.3M')
    expect(formatCompact(-5_913)).toBe('-6k')
    expect(formatCompact(512)).toBe('512')
  })
})

describe('formatSignedCurrency', () => {
  it('always shows the sign', () => {
    expect(formatSignedCurrency(12375)).toBe('+12,375 NOK')
    expect(formatSignedCurrency(-5913.4)).toBe('-5,913 NOK')
  })
})
