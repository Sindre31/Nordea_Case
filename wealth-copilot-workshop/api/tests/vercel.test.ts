import { describe, expect, it } from 'vitest'
import { stripApiPrefix } from '../src/vercel.js'

describe('stripApiPrefix (Vercel entry point)', () => {
  it.each([
    ['/api/customers', '/customers'],
    ['/api/customers/CUST-00101/performance/explain?days=30', '/customers/CUST-00101/performance/explain?days=30'],
    ['/api', '/'],
    ['/api?x=1', '/?x=1'],
    ['/apiary', '/apiary'],
    ['/health', '/health'],
  ])('%s -> %s', (input, expected) => {
    expect(stripApiPrefix(input)).toBe(expected)
  })
})
