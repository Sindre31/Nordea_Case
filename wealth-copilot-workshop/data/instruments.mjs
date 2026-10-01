// Fictional investment universe used to generate synthetic holdings and
// market data. None of these tickers/companies are real financial
// instruments - names are deliberately invented for the workshop.
export const EQUITIES = [
  { ticker: 'NRSK', name: 'Norsk Fjord Energy AS', sector: 'Energy', geography: 'Norway', basePrice: 185 },
  { ticker: 'FJEL', name: 'Fjellblå Seafood ASA', sector: 'Consumer Staples', geography: 'Norway', basePrice: 92 },
  { ticker: 'BRGN', name: 'Bergen Maritime Holdings', sector: 'Industrials', geography: 'Norway', basePrice: 310 },
  { ticker: 'OSLC', name: 'Oslo Cloud Systems ASA', sector: 'Technology', geography: 'Norway', basePrice: 140 },
  { ticker: 'NRDX', name: 'NordicRx Pharma', sector: 'Healthcare', geography: 'Nordics', basePrice: 415 },
  { ticker: 'VIKB', name: 'Viking Bank Group', sector: 'Financials', geography: 'Nordics', basePrice: 68 },
  { ticker: 'SVEA', name: 'Svea Green Materials', sector: 'Materials', geography: 'Sweden', basePrice: 220 },
  { ticker: 'HELS', name: 'Helsinki Circuit Technologies', sector: 'Technology', geography: 'Finland', basePrice: 76 },
  { ticker: 'DANM', name: 'Danmark Wind Partners', sector: 'Utilities', geography: 'Denmark', basePrice: 152 },
  { ticker: 'EURX', name: 'EuroSpan Logistics SE', sector: 'Industrials', geography: 'Europe', basePrice: 58 },
  { ticker: 'ATLX', name: 'Atlantic Retail Group', sector: 'Consumer Discretionary', geography: 'Europe', basePrice: 44 },
  { ticker: 'USTK', name: 'US TechCore Inc.', sector: 'Technology', geography: 'United States', basePrice: 265 },
  { ticker: 'USHL', name: 'US HealthLine Corp', sector: 'Healthcare', geography: 'United States', basePrice: 132 },
  { ticker: 'USFN', name: 'US Federal Financial Corp', sector: 'Financials', geography: 'United States', basePrice: 88 },
  { ticker: 'ASIP', name: 'AsiaPac Innovations Ltd', sector: 'Technology', geography: 'Asia Pacific', basePrice: 51 },
  { ticker: 'ASIM', name: 'AsiaPac Manufacturing Ltd', sector: 'Industrials', geography: 'Asia Pacific', basePrice: 33 },
  { ticker: 'EMKT', name: 'Emerging Markets Growth Co', sector: 'Consumer Discretionary', geography: 'Emerging Markets', basePrice: 21 },
]

export const ETFS = [
  { ticker: 'GLBEQ', name: 'Global Equity Index Fund (Fictional)', sector: 'Diversified', geography: 'Global', basePrice: 102 },
  { ticker: 'NRDEQ', name: 'Nordic Equity Index Fund (Fictional)', sector: 'Diversified', geography: 'Nordics', basePrice: 145 },
  { ticker: 'EMGEQ', name: 'Emerging Markets Index Fund (Fictional)', sector: 'Diversified', geography: 'Emerging Markets', basePrice: 54 },
  { ticker: 'TECHF', name: 'Global Technology Fund (Fictional)', sector: 'Technology', geography: 'Global', basePrice: 210 },
  { ticker: 'GRNEF', name: 'Green Energy Transition Fund (Fictional)', sector: 'Utilities', geography: 'Global', basePrice: 78 },
]

export const MUTUAL_FUNDS = [
  { ticker: 'MFBAL', name: 'Balanced Growth Mutual Fund (Fictional)', sector: 'Diversified', geography: 'Global', basePrice: 150 },
  { ticker: 'MFCON', name: 'Conservative Income Mutual Fund (Fictional)', sector: 'Diversified', geography: 'Global', basePrice: 118 },
  { ticker: 'MFPEN', name: 'Pension Growth Mutual Fund (Fictional)', sector: 'Diversified', geography: 'Nordics', basePrice: 132 },
]

export const BONDS = [
  { ticker: 'GOVNO', name: 'Norway Government Bond 10Y (Fictional)', sector: 'Government Bonds', geography: 'Norway', basePrice: 101 },
  { ticker: 'GOVEU', name: 'Euro Government Bond Index (Fictional)', sector: 'Government Bonds', geography: 'Europe', basePrice: 99 },
  { ticker: 'CORPB', name: 'Nordic Corporate Bond Fund (Fictional)', sector: 'Corporate Bonds', geography: 'Nordics', basePrice: 104 },
]

export const CASH = [
  { ticker: 'CASHNOK', name: 'Cash (NOK)', sector: 'Cash', geography: 'Norway', basePrice: 1 },
]

export const ALL_INSTRUMENTS = [
  ...EQUITIES.map((i) => ({ ...i, assetType: 'Equity' })),
  ...ETFS.map((i) => ({ ...i, assetType: 'ETF' })),
  ...MUTUAL_FUNDS.map((i) => ({ ...i, assetType: 'Mutual Fund' })),
  ...BONDS.map((i) => ({ ...i, assetType: 'Bond' })),
  ...CASH.map((i) => ({ ...i, assetType: 'Cash' })),
]
