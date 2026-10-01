# Solution: Wealth Copilot – cases A, B and C

This document is the deliverable for `docs/workshop.md`. All three problem areas are
solved as working prototypes on top of the existing API and UI patterns, plus a full
visual redesign of the frontend (optional task 7).

**Try it:** `npm install && npm run dev`, open <http://localhost:5173>, and use the persona
chips in the top bar: **Anne (Case A)**, **Jonas (Case B)**, **Maria (Case C)**.

| Case | Page | Endpoint | Service |
| --- | --- | --- | --- |
| A. Why did my portfolio move? | `/#/performance` | `GET /customers/:id/performance/explain?days=30\|60\|90` | `api/src/services/attribution.ts` |
| B. Where does my risk come from? | `/#/risk` | `GET /customers/:id/risk/explain` | `api/src/services/riskBreakdown.ts` |
| C. Am I on track for my goal? | `/#/goals` | `GET /customers/:id/goals`, `POST /customers/:id/goals/projection` | `api/src/services/goals.ts` |

Every response returns its numbers **and** a `summary` in plain language **and** a
`data_quality` block with the assumptions and known gaps. The UI always shows the summary
first ("In plain words") and keeps the method one click away ("How we calculated this").
All three are deterministic: the same data and inputs always give the same answer.

Shared modelling assumptions per risk profile (share in equities, expected return, typical
yearly swings) live in one readable table, `api/src/services/assumptions.ts`, so an
advisor or risk function can challenge and replace them in one place.

## New synthetic data

Three personas matching the case studies were added to `data/generate.mjs` (`CUST-00101`
to `CUST-00103`). They are appended after the 100 seeded customers and use their own
seed, so the existing data is byte-for-byte unchanged. A new `data/goals.json` holds
Maria's registered goal and the plan she agreed on when she registered it.

| Persona | Designed so that… |
| --- | --- |
| Anne Lie (52, Balanced) | A mixed portfolio with clear winners (Nordic equity fund, US healthcare) and one loser (Bergen Maritime), plus monthly transfers into her investment account. |
| Jonas Berg (36, Moderate) | About 80% of his portfolio is technology shares and tech funds, much more than his profile suggests. |
| Maria Dahl (29, Growth) | She saves 7,000 NOK a month towards "Financial freedom by 39" (1.5 MNOK in today's money, enough to work 60% from age 39). The goal was registered 12 months ago. |

---

## A. Understand why the portfolio develops

**What Anne should understand afterwards:** which investments moved her total, how much
came from the market as a whole versus her own choices, and whether this is normal for
her risk profile, without needing financial jargon.

**What the feature shows**

1. **Contribution per investment, sector and type**, in NOK: a diverging bar chart where
   bars to the right pushed the value up and bars to the left pulled it down.
2. **Market vs. own choices.** "The market" is a simple reference mix with the same
   equity/bond split as her profile (Balanced: 50% global equity fund, 50% Nordic bonds).
   Market effect = start value × reference return. Own choices = everything else.
   The two always add up to the total change.
3. **Was it expected?** A normal range for her profile over a period of the same length:
   expected return ± 1.645 × typical swings × √(years). That covers about 9 in 10
   periods. A marker shows where she landed.

**Data used:** current holdings, daily market prices, transfers to her investment account,
and her risk profile.

**Missing data and how we handle it**

| Gap | Effect | What we do |
| --- | --- | --- |
| No trade history | New money looks like growth | Today's holdings are held constant. We sum her transfers to the investment account in the period and say so explicitly ("You moved 16,000 NOK into investments…"). |
| Only 90 days of prices | Cannot explain a half-year (the 7% in the case) | Periods of 30/60/90 days. The limitation is stated. |
| Missing price on a date | Wrong contribution | Falls back to today's price and flags the number of affected holdings. |

**Expected value and how to test it:** Anne gets an answer to "why" rather than just a
total. To test: ask customers to explain their own development back in their own words
after 2 minutes on the page (comprehension test). Compare how many "why did my portfolio
change" questions advisors get before and after.

**Risks:** customers may read "your choices" as praise or blame for skill, when it can be
luck. The wording says "which investments you hold", not "your skill". The reference mix
is a simplification and must be approved by the investment function before real use.

---

## B. Make investment risk visible and understandable

**What Jonas should understand afterwards:** how much his portfolio typically swings, that
technology drives most of it, what a bad month can cost in NOK, and that this is more
than a moderate profile implies.

**What the feature shows**

1. **Gauge: yearly swings vs. the band that fits his profile.** Jonas is at 18% against
   4–10% for Moderate, labelled "Riskier than your profile".
2. **Share of money vs. share of risk** per sector, investment or region. This is the key
   "aha": Technology is 80% of his money but 85% of his risk.
3. **A bad month in NOK** (a loss he would expect to exceed in about 1 in 20 months).
4. **Stress tests:** tech sell-off, broad market fall, rising rates and a Nordic downturn,
   shown as NOK impact.
5. **Drift:** how sector weights changed through price moves alone. Winners grow into a
   bigger share without the customer buying anything.
6. **What-if:** moving half of the biggest risk driver into a bond fund, with the new
   swings and the new bad month. This is clearly labelled as an illustration, not advice.

**Method (risk contributions):** each holding's own swings come from its daily price
changes. How holdings move *together* uses transparent rules of thumb: shares start at
0.5, +0.3 for the same sector, +0.15 for broad funds, +0.1 for the same region, capped
at 0.9. Bonds with bonds are 0.6, shares with bonds 0.1, and cash 0. Risk contribution
= wᵢ(Σw)ᵢ / σ²ₚ, so the shares always sum to 100%. We use rules of thumb because the
synthetic prices are generated independently per instrument. Measured correlations would
be about 0, which would make an all-tech portfolio look well diversified. This is the
same reason a real system would use a factor model rather than raw 90-day correlations.

**Missing data:** there is no history of past trades, so we cannot show how Jonas'
*purchases* shifted the mix. The drift view shows the price-driven part only, and the
page says so. Ninety days of prices is too short for a reliable risk estimate.

**Consistency:** the existing "risk differs from your profile" insight now uses the same
model, so the insight list and the Risk page never contradict each other.

**Expected value and how to test it:** Jonas is warned *before* the next market fall, in
NOK rather than a score. To test: show customers the page and ask "if markets fall 20%,
roughly how much could you lose?" and "what drives most of your risk?" Measure accuracy
against the page.

**Risks:** a risk number can feel like a recommendation. Every what-if is labelled "not
advice", and the page points to the advisor. Stress scenarios are illustrations, not
forecasts. The model is educational and not a suitability assessment (MiFID II).

---

## C. Follow financial goals

**What Maria should understand afterwards:** her chance of reaching her goal on today's
plan, the realistic range of outcomes, whether she is ahead of or behind her own plan,
and which levers matter most.

**What the feature shows**

1. **Chance to reach the goal** (26% on today's plan: "At risk") with weak, typical and
   strong outcomes.
2. **A fan chart** of 8 in 10 outcomes over time, with the typical path, what she pays
   in, and the goal line.
3. **Versus plan:** where her registered plan said she would be today (210,329 NOK)
   compared with what she has (203,852 NOK), so she is 6,477 NOK behind.
4. **Levers:** +1,000/month gives 40% (+14 points), +3,000/month gives 66%, three more
   years gives 62%, an early 25% crash gives 20%, and returns 2 points lower give 14%.
5. **Try it yourself:** sliders for target, years, monthly saving and expected return.
   The projection re-runs live.

**Where each number comes from.** The response labels every input with its source, and
the UI shows it as a badge:

| Input | Source, in order of priority |
| --- | --- |
| Target amount | Her input → registered goal → **25 × yearly spending** (the "4% rule") from her transactions |
| Years | Her input → goal date → assumption: 15 years |
| Monthly saving | Her input → average transfers to investments → average monthly surplus |
| Invested today | Her input → current market value |
| Return and swings | Her input → assumption for her risk profile |

**Method:** 2,000 simulated market paths with monthly lognormal returns and a **fixed
random seed**, so the same inputs always give the same answer and levers differ only by
the lever. All amounts are in today's money (returns minus 2% assumed inflation). The
required monthly saving and "years needed at current pace" use the closed-form
future-value formula with average returns.

**Missing data:** Maria's goal is now registered in `goals.json`. For every other customer
there is no goal, so the page starts from labelled estimates and says so. Transactions
cover only 2 months, so monthly saving is a rough estimate. Tax, fees and income changes
are not modelled.

**Expected value and how to test it:** Maria gets a concrete answer ("save about 1,258
NOK more per month") instead of a single misleading number. To test: check whether users
correctly understand that 26% is *not* a promise (comprehension), and whether
goal-setters adjust savings after using the levers (behaviour).

**Risks:** a projection can be read as a promise. The page always shows a range, uses
"scenarios" and "typical", never "will", and names the assumptions. A low probability can
be demotivating, so the page pairs it with the levers that improve it.

---

## Copilot

The deterministic Copilot gained three intents that reuse the services above
("Why did my portfolio change?", "Where does my risk come from?", "Am I on track for my
goal?", plus a few Norwegian keywords). Every reply now includes:

- **`sources`:** the customer data the answer was built from, shown as "Why am I seeing
  this?". This addresses the personal-data transparency scenario.
- **`follow_ups`:** suggested next questions.

The `CopilotEngine` interface is unchanged, so an LLM can still be plugged in later. In
that case the LLM should only *phrase* the deterministic numbers from these services,
never compute them.

## Optional scenario: wrong AI insight

Because every number comes from a deterministic service with tests, a wrong insight can
be reproduced exactly from (customer, data snapshot, code version). We propose to:

1. Log each served answer's `matched_intent` and `sources`.
2. Add a "this looks wrong" button that creates a ticket with that log entry.
3. Have the service owner fix the rule or data and add a regression test.
4. Notify affected customers if the insight was investment-related, with compliance
   informed.

## Design (task 7)

A complete redesign in a deep Nordic blue: a sidebar with the three cases as primary
navigation, glass cards, a hero card with an animated net worth, and a searchable customer
switcher with persona shortcuts. The layout is responsive down to phone width and respects
reduced-motion settings. Chart colours use a categorical palette validated for
colour-blind separation and ≥3:1 contrast on the card surface. Status is never shown by
colour alone: every status pill has an icon and a word.

## Tests

- `api/tests/cases.test.ts`: contributions add up to the total change, market and choices
  add up, risk contributions sum to 100%, Jonas exceeds his profile, projections are
  deterministic and respond to levers, invalid input is rejected (400), customers without
  investments are handled, and Copilot intents return sources.
- `api/tests/vercel.test.ts`: the `/api` prefix handling for the Vercel deployment.
