// Synthetic data generator for the "Build the Wealth Copilot" workshop.
//
// Produces fully fictional customers, accounts, transactions, investments
// and market data as static JSON files under /data. The API simply reads
// these files at startup - there is no real database and no real customer
// data anywhere in this repository.
//
// Uses a seeded PRNG so the dataset is reproducible across machines
// (re-running `npm run generate-data` always produces the same output).
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_INSTRUMENTS } from './instruments.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED = 42
const CUSTOMER_COUNT = 100
const MARKET_DATA_DAYS = 90
const TRANSACTION_MONTHS = 2

// --- Seeded PRNG (mulberry32) --------------------------------------------
function mulberry32(seed) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(SEED)
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const int = (min, max) => Math.floor(rng() * (max - min + 1)) + min
const float = (min, max, decimals = 2) => Number((rng() * (max - min) + min).toFixed(decimals))
const chance = (probability) => rng() < probability

// --- Reference data --------------------------------------------------------
const FIRST_NAMES = [
  'Emma', 'Nora', 'Sofie', 'Ingrid', 'Sara', 'Ida', 'Anna', 'Maja', 'Frida', 'Thea',
  'Jonas', 'Lars', 'Erik', 'Magnus', 'Henrik', 'Andreas', 'Kristian', 'Sander', 'Oskar', 'Emil',
  'Liam', 'Noah', 'Olivia', 'Ava', 'William', 'James', 'Mia', 'Isabella', 'Lucas', 'Elias',
  'Astrid', 'Sigrid', 'Karoline', 'Marte', 'Vilde', 'Tobias', 'Markus', 'Fredrik', 'Daniel', 'Kevin',
]
const LAST_NAMES = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen',
  'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen', 'Jacobsen', 'Dahl', 'Halvorsen', 'Svendsen', 'Eriksen',
  'Solberg', 'Strand', 'Moen', 'Bakke', 'Fossum', 'Lie', 'Vik', 'Aas', 'Bakken', 'Ruud',
]
const COUNTRIES = ['Norway', 'Sweden', 'Denmark', 'Finland', 'Germany', 'United Kingdom', 'Netherlands']
const RISK_PROFILES = ['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive']
const INVESTMENT_HORIZONS = ['1-3 years', '3-5 years', '5-10 years', '10-20 years', '20+ years']

const TX_CATEGORIES = [
  { type: 'credit', category: 'Salary', descriptions: ['Monthly salary'], min: 28000, max: 68000, frequencyPerMonth: 1 },
  { type: 'debit', category: 'Housing', descriptions: ['Mortgage payment', 'Rent payment'], min: 8000, max: 22000, frequencyPerMonth: 1 },
  { type: 'debit', category: 'Groceries', descriptions: ['Grocery store', 'Supermarket'], min: 300, max: 1400, frequencyPerMonth: 3 },
  { type: 'debit', category: 'Utilities', descriptions: ['Electricity bill', 'Water & sewage', 'Internet & mobile'], min: 400, max: 2200, frequencyPerMonth: 1.5 },
  { type: 'debit', category: 'Restaurants', descriptions: ['Restaurant', 'Cafe', 'Food delivery'], min: 150, max: 900, frequencyPerMonth: 2 },
  { type: 'debit', category: 'Travel', descriptions: ['Flight booking', 'Hotel', 'Train ticket'], min: 500, max: 6500, frequencyPerMonth: 0.4 },
  { type: 'debit', category: 'Subscriptions', descriptions: ['Streaming service', 'Gym membership', 'News subscription'], min: 99, max: 799, frequencyPerMonth: 1.5 },
  { type: 'debit', category: 'Shopping', descriptions: ['Clothing store', 'Electronics store', 'Online marketplace'], min: 200, max: 3500, frequencyPerMonth: 1.5 },
  { type: 'transfer', category: 'Investments', descriptions: ['Transfer to investment account', 'Monthly savings plan'], min: 500, max: 8000, frequencyPerMonth: 1 },
  { type: 'transfer', category: 'Transfers', descriptions: ['Transfer to savings', 'Transfer to family member'], min: 200, max: 4000, frequencyPerMonth: 0.6 },
]

function makeCustomerId(index) {
  return `CUST-${String(index).padStart(5, '0')}`
}

// --- Customers ---------------------------------------------------------
const customers = []
for (let i = 1; i <= CUSTOMER_COUNT; i += 1) {
  const age = int(22, 78)
  const customerSinceYear = 2026 - int(0, Math.min(20, age - 18))
  customers.push({
    customer_id: makeCustomerId(i),
    first_name: pick(FIRST_NAMES),
    last_name: pick(LAST_NAMES),
    age,
    country: pick(COUNTRIES),
    risk_profile: pick(RISK_PROFILES),
    investment_horizon: pick(INVESTMENT_HORIZONS),
    annual_income: int(320, 1850) * 1000,
    customer_since: `${customerSinceYear}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
  })
}

// --- Accounts ------------------------------------------------------------
const accounts = []
let accountCounter = 1
function addAccount(customerId, accountType, currency, balance) {
  const account = {
    account_id: `ACC-${String(accountCounter).padStart(6, '0')}`,
    customer_id: customerId,
    account_type: accountType,
    currency,
    balance: Number(balance.toFixed(2)),
  }
  accountCounter += 1
  accounts.push(account)
  return account
}

const accountsByCustomer = new Map()
for (const customer of customers) {
  const list = []
  list.push(addAccount(customer.customer_id, 'Current Account', 'NOK', float(4000, 85000)))
  if (chance(0.85)) list.push(addAccount(customer.customer_id, 'Savings', 'NOK', float(10000, 650000)))
  const hasInvestmentAccount = chance(0.7)
  // Keep consuming the seeded placeholder values so unrelated generated data remains stable.
  if (hasInvestmentAccount) list.push(addAccount(customer.customer_id, 'Investment Account', 'NOK', float(0, 20000)))
  const hasPension = customer.age >= 25 && chance(0.6)
  if (hasPension) list.push(addAccount(customer.customer_id, 'Pension', 'NOK', float(20000, 900000)))
  accountsByCustomer.set(customer.customer_id, { list, hasInvestmentAccount, hasPension })
}

// --- Market data -----------------------------------------------------------
// One year of daily prices per instrument, generated as a bounded random
// walk so portfolio performance calculations have something meaningful to
// show. Purely synthetic - not derived from any real market feed.
const today = new Date('2026-09-06T00:00:00Z')
const marketData = []
const latestPriceByTicker = new Map()
for (const instrument of ALL_INSTRUMENTS) {
  let price = instrument.basePrice
  const dailyPrices = []
  for (let d = MARKET_DATA_DAYS - 1; d >= 0; d -= 1) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - d)
    let dailyReturn = 0
    if (instrument.assetType === 'Cash') {
      dailyReturn = 0
    } else if (instrument.assetType === 'Bond') {
      dailyReturn = float(-0.15, 0.18, 4) / 100
    } else {
      dailyReturn = float(-2.2, 2.3, 4) / 100
    }
    price = Math.max(0.5, price * (1 + dailyReturn))
    dailyPrices.push({
      ticker: instrument.ticker,
      date: date.toISOString().slice(0, 10),
      price: Number(price.toFixed(2)),
      daily_return: Number((dailyReturn * 100).toFixed(4)),
      sector: instrument.sector,
      geography: instrument.geography,
    })
  }
  marketData.push(...dailyPrices)
  latestPriceByTicker.set(instrument.ticker, price)
}

// --- Investments -------------------------------------------------------
const investments = []
let investmentCounter = 1
for (const customer of customers) {
  const info = accountsByCustomer.get(customer.customer_id)
  if (!info.hasInvestmentAccount && !info.hasPension) continue

  const investmentAccounts = info.list.filter(
    (account) => account.account_type === 'Investment Account' || account.account_type === 'Pension',
  )
  const holdingCount = int(3, 10)
  const chosen = new Set()
  while (chosen.size < holdingCount) {
    chosen.add(pick(ALL_INSTRUMENTS).ticker)
  }
  let holdingIndex = 0
  for (const ticker of chosen) {
    const instrument = ALL_INSTRUMENTS.find((i) => i.ticker === ticker)
    const currentPrice = latestPriceByTicker.get(ticker)
    // Purchase price: some historical variance vs. today's price to create
    // realistic unrealized gains/losses.
    const purchasePrice = Number((currentPrice * float(0.65, 1.25, 4)).toFixed(2))
    const quantity = instrument.assetType === 'Cash'
      ? int(5000, 150000)
      : int(2, 400)
    investments.push({
      investment_id: `INV-${String(investmentCounter).padStart(6, '0')}`,
      customer_id: customer.customer_id,
      account_id: investmentAccounts[holdingIndex % investmentAccounts.length].account_id,
      asset_type: instrument.assetType,
      ticker: instrument.ticker,
      name: instrument.name,
      quantity,
      purchase_price: purchasePrice,
      current_price: currentPrice,
      currency: 'NOK',
      sector: instrument.sector,
      geography: instrument.geography,
    })
    investmentCounter += 1
    holdingIndex += 1
  }
}

// Investment and pension account balances are derived from their positions.
const investmentValueByAccount = new Map()
for (const investment of investments) {
  const value = investment.quantity * investment.current_price
  investmentValueByAccount.set(
    investment.account_id,
    (investmentValueByAccount.get(investment.account_id) ?? 0) + value,
  )
}
for (const account of accounts) {
  if (account.account_type === 'Investment Account' || account.account_type === 'Pension') {
    account.balance = Number((investmentValueByAccount.get(account.account_id) ?? 0).toFixed(2))
  }
}

// --- Transactions --------------------------------------------------------
const transactions = []
let transactionCounter = 1
for (const customer of customers) {
  const info = accountsByCustomer.get(customer.customer_id)
  const currentAccount = info.list.find((a) => a.account_type === 'Current Account')
  const investmentAccount = info.list.find((a) => a.account_type === 'Investment Account')
  const savingsAccount = info.list.find((a) => a.account_type === 'Savings')

  for (let monthOffset = TRANSACTION_MONTHS - 1; monthOffset >= 0; monthOffset -= 1) {
    const monthDate = new Date(today)
    monthDate.setUTCMonth(monthDate.getUTCMonth() - monthOffset)

    for (const rule of TX_CATEGORIES) {
      if (rule.category === 'Investments' && !investmentAccount) continue
      const occurrences = rng() < (rule.frequencyPerMonth % 1) ? Math.ceil(rule.frequencyPerMonth) : Math.floor(rule.frequencyPerMonth)
      for (let occurrence = 0; occurrence < occurrences; occurrence += 1) {
        const day = int(1, 28)
        const date = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day))
        const amountMagnitude = float(rule.min, rule.max)
        const signedAmount = rule.type === 'credit' ? amountMagnitude : -amountMagnitude
        const targetAccount = rule.category === 'Investments'
          ? investmentAccount
          : rule.category === 'Transfers' && savingsAccount && chance(0.5)
            ? savingsAccount
            : currentAccount
        transactions.push({
          transaction_id: `TXN-${String(transactionCounter).padStart(7, '0')}`,
          customer_id: customer.customer_id,
          account_id: targetAccount.account_id,
          date: date.toISOString().slice(0, 10),
          type: rule.type,
          category: rule.category,
          description: pick(rule.descriptions),
          amount: Number(signedAmount.toFixed(2)),
          currency: 'NOK',
        })
        transactionCounter += 1
      }
    }
  }
}
transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

// --- Write output ----------------------------------------------------------
async function writeJson(fileName, value) {
  const filePath = path.join(__dirname, fileName)
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${fileName}: ${Array.isArray(value) ? value.length : 'n/a'} records`)
}

await writeJson('customers.json', customers)
await writeJson('accounts.json', accounts)
await writeJson('transactions.json', transactions)
await writeJson('investments.json', investments)
await writeJson('market_data.json', marketData)

console.log('Done. All data is 100% synthetic / fictional.')
