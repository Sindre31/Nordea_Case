// Shared, explicitly-labelled modelling assumptions per risk profile.
//
// Everything that explains performance (case A), risk (case B) or goals
// (case C) needs some notion of "what is normal for this kind of investor".
// Keeping those numbers in ONE readable table makes them easy to show to the
// customer ("this is what we assumed") and easy for an advisor or risk
// function to challenge and replace. They are illustrative workshop values,
// not house views or capital market assumptions from a real bank.

export type RiskProfile = 'Conservative' | 'Moderate' | 'Balanced' | 'Growth' | 'Aggressive'

export interface ProfileAssumption {
  // Share of a typical portfolio for this profile held in shares/equity funds.
  equity_share_pct: number
  // Long-run expected yearly return before inflation (nominal).
  expected_annual_return_pct: number
  // Typical yearly swings (standard deviation) for such a portfolio.
  expected_annual_volatility_pct: number
  // Range of yearly swings we consider "in line" with the profile.
  volatility_band_pct: { min: number; max: number }
  plain_language: string
}

export const PROFILE_ASSUMPTIONS: Record<RiskProfile, ProfileAssumption> = {
  Conservative: {
    equity_share_pct: 20,
    expected_annual_return_pct: 3,
    expected_annual_volatility_pct: 4,
    volatility_band_pct: { min: 0, max: 6 },
    plain_language: 'mest tryggere investeringer, små og sjeldne svingninger',
  },
  Moderate: {
    equity_share_pct: 35,
    expected_annual_return_pct: 4,
    expected_annual_volatility_pct: 7,
    volatility_band_pct: { min: 4, max: 10 },
    plain_language: 'en blanding med vekt på tryggere investeringer, moderate svingninger',
  },
  Balanced: {
    equity_share_pct: 50,
    expected_annual_return_pct: 5,
    expected_annual_volatility_pct: 10,
    volatility_band_pct: { min: 7, max: 13 },
    plain_language: 'en jevn blanding av aksjer og tryggere investeringer',
  },
  Growth: {
    equity_share_pct: 70,
    expected_annual_return_pct: 6,
    expected_annual_volatility_pct: 13,
    volatility_band_pct: { min: 10, max: 17 },
    plain_language: 'mest aksjer, og aksept for merkbare opp- og nedturer',
  },
  Aggressive: {
    equity_share_pct: 85,
    expected_annual_return_pct: 7,
    expected_annual_volatility_pct: 16,
    volatility_band_pct: { min: 13, max: 25 },
    plain_language: 'nesten bare aksjer, og aksept for store opp- og nedturer',
  },
}

// Assumed yearly inflation, used to express goal projections in today's money.
export const ASSUMED_INFLATION_PCT = 2

export function profileAssumption(profile: string | undefined): { profile: RiskProfile; assumption: ProfileAssumption } {
  const key = (profile && profile in PROFILE_ASSUMPTIONS ? profile : 'Balanced') as RiskProfile
  return { profile: key, assumption: PROFILE_ASSUMPTIONS[key] }
}

// Instruments that behave like shares (as opposed to bonds and cash).
export function isEquityLike(assetType: string, sector: string): boolean {
  if (assetType === 'Cash' || assetType === 'Bond') return false
  return !sector.includes('Bond')
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

