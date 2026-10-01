import { describe, expect, it } from 'vitest'
import { formatCompact, formatCurrency, formatDate, formatPct, formatPercentage, formatSignedCurrency } from '../utils/format'
import { horizonName, profileName, sectorName } from '../utils/labels'

// nb-NO groups thousands with a no-break space; normalise for readable assertions.
const n = (s: string) => s.replace(/\s/g, ' ')

describe('formatCurrency', () => {
  it('rounds and formats as Norwegian kroner', () => {
    expect(n(formatCurrency(1234.56))).toBe('1 235 kr')
    expect(n(formatCurrency(-5913.4))).toBe('-5 913 kr')
  })

  it('supports a custom currency', () => {
    expect(n(formatCurrency(1000, 'USD'))).toBe('1 000 USD')
  })
})

describe('formatSignedCurrency', () => {
  it('always shows the sign', () => {
    expect(n(formatSignedCurrency(12375))).toBe('+12 375 kr')
    expect(n(formatSignedCurrency(-5913.4))).toBe('-5 913 kr')
  })
})

describe('formatPct / formatPercentage', () => {
  it('uses a decimal comma and a space before %', () => {
    expect(n(formatPct(4.86))).toBe('4,9 %')
    expect(n(formatPct(-3.14, 1, true))).toBe('-3,1 %')
    expect(n(formatPercentage(4.2))).toBe('+4,2 %')
    expect(n(formatPercentage(0))).toBe('+0,0 %')
  })
})

describe('formatCompact', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCompact(340_000)).toBe('340k')
    expect(n(formatCompact(1_250_000))).toBe('1,3 mill.')
    expect(formatCompact(-5_913)).toBe('-6k')
    expect(formatCompact(512)).toBe('512')
  })
})

describe('formatDate', () => {
  it('formats dates in Norwegian', () => {
    expect(formatDate('2026-06-09')).toBe('9. juni 2026')
  })
})

describe('labels', () => {
  it('translates codes from the data model', () => {
    expect(sectorName('Technology')).toBe('Teknologi')
    expect(profileName('Balanced')).toBe('Balansert')
    expect(horizonName('10-20 years')).toBe('10–20 år')
  })
})
