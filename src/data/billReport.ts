/**
 * The demo account: a "Home Energy Report" for June 2026, plus everything that
 * can honestly be derived from it.
 *
 * Framing, which the whole module follows: this is an account's REPORTED
 * FIGURES, not a document that was uploaded and parsed. Nothing here refers to a
 * scan, a page, a file or an extraction step. A utility already holds these
 * numbers in its billing system, so a demo built around reading a photograph of
 * a statement demonstrates the wrong capability — the value is the analysis, not
 * the OCR.
 *
 * The utility is CLIENT_NAME, the app's white-label brand. Everything
 * brand-shaped hangs off it or off `PROVIDER_DOMAIN` below, so a rebrand is one
 * line in `constants.ts`.
 *
 * The split that DOES matter is enforced by the `origin` of every figure:
 *
 *   • REPORTED — on the customer's statement. Nine facts, and no more.
 *   • MODELED  — computed here from the reported figures plus one stated
 *     assumption (see `ASSUMPTIONS`). Cost, carbon, the end-use split, the
 *     twelve-month history and every savings figure are modeled.
 *
 * The UI never blurs the two: every card carries an origin chip and the PDF
 * prints a provenance table. A demo that quietly presents a modeled dollar
 * figure as a billed one is the one thing that would embarrass us in front of a
 * client, so the boundary is data, not a convention someone has to remember.
 *
 * No API, no React, no i18n — a pure module, so the screen and the PDF read the
 * same numbers and can never disagree.
 */

import { CLIENT_NAME } from '@/constants/constants'

/* ========================================================================== *
 *  1. Reported — what the statement says
 * ========================================================================== */

/**
 * Web addresses for the demo utility, derived from the brand rather than typed,
 * so renaming the client does not leave four stale links behind.
 * `XYZ Company` → `xyzcompany.com`.
 */
const PROVIDER_DOMAIN = `${CLIENT_NAME.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`

/**
 * Who the account belongs to, and which report this is.
 *
 * IDENTITY IS FICTIONAL, ON PURPOSE. The report this module is modelled on is a
 * real piece of mail — see `assets/Bills/` — addressed to a named individual at
 * a real street address, with a real account number and a real mailing barcode.
 * Those four fields are the only ones not carried across, and they are held back
 * deliberately: a demo that renders a stranger's name and home address on screen
 * and then bakes them into a downloadable PDF is a privacy incident waiting for
 * someone to hit "share". Everything that is NOT tied to a person — the usage
 * figures, the percentages, the programme terms, the report's own wording — is
 * carried over verbatim, because that is what makes the demo worth showing.
 *
 * The same reasoning covers `printCode` and `mailing`: the report really does
 * carry a print-job code and carrier-route marks, so the model has to represent
 * them, but the values here are BUILT from the demo account rather than copied
 * off the envelope. See `buildPrintCode` below.
 */
export const BILL_META = {
  provider: CLIENT_NAME,
  documentType: 'Home Energy Report',
  reportDate: 'June 25, 2026',
  accountNumber: '4820917355',
  customerName: 'Daniel R. Whitfield',
  serviceAddress: '217 Kestrel Hollow Ct, Columbia, MD 21045-3318',
  /** Statement reference — what a customer quotes on the phone. */
  statementRef: 'HER-20260625-4820917355',
  /** The efficiency scheme behind the rebates, named as a category not a body. */
  partner: 'State Energy Efficiency Program',
  links: {
    report: `${PROVIDER_DOMAIN}/HomeEnergyReport`,
    whatUsesMost: `${PROVIDER_DOMAIN}/WhatUsesMost`,
    /** The report prints a short vanity path for the rewards sign-up, not a full one. */
    connectedRewards: `${PROVIDER_DOMAIN}/CR`,
    /** A separate storefront domain on the report, not a path under the main one. */
    smartEnergy: `${CLIENT_NAME.replace(/[^A-Za-z0-9]/g, '')}SmartEnergy.com`,
  },
  /** The report's own footnote on what a "unit" is. */
  unitDefinition:
    'A unit is a combined measurement of electricity (kWh) and natural gas (therms) use.',
  efficientDefinition:
    'Efficient homes represent the 20% of similar homes in your comparison group that used the least energy this period.',
  /** The line that closes page 1 and sends the reader to the back. */
  pageTurnLine: {
    lead: "Want to reduce your home's energy use?",
    rest: 'Turn over for personalized savings advice.',
  },
  /** The closing service line on the back page. */
  helpLine: "We're here to help",
  /** The rebate storefront promoted beside it. */
  storefrontLine: 'Save more with special rebates and energy-efficient products you can buy at',
} as const

/**
 * The print-job code stamped along the foot of both pages.
 *
 * Reproduced in STRUCTURE, not in content — the fields are the ones the real
 * report carries (job number, provider code, print date, wave, template, insert
 * slot, class, version, sequence) and the values come from this demo account.
 * It is here because a customer service agent reading a printed report back to
 * someone on the phone quotes this code, so a model of the report that cannot
 * represent it cannot answer "which mailing was this?".
 */
function buildPrintCode(): string {
  const providerCode = `${CLIENT_NAME.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}C`
  const printedOn = '20260707'
  const job = BILL_META.accountNumber.slice(0, 7)
  const seq = BILL_META.accountNumber.slice(-4)
  return [
    job,
    providerCode,
    printedOn,
    'B76',
    `[${providerCode}_0056_N10_STD2025]`,
    '{GEN_0000_NO_INSERT}',
    'STANDARD-1-15',
    seq,
  ].join('-')
}

/**
 * The mailing marks: what the print house adds, not what the utility reports.
 *
 * Modelled because they are visibly on the page and a reader will ask what they
 * are — and because being able to say "this is a carrier-route mark, it is not
 * about your energy" is itself an answer the demo should be able to give.
 */
export const MAILING = {
  printCode: buildPrintCode(),
  /** Presort/carrier-route endorsement — postal routing, nothing to do with the account. */
  carrierRoute: 'ECRWSH C-006',
  /** The mail-house's own batch reference. */
  batchRef: 'T161 87768',
  note: 'Print and postal marks added by the mail house. They carry no account information.',
} as const

/** The billing window, and the matching window a year earlier. */
export const PERIOD = {
  label: 'May 28 – Jun 25, 2026',
  short: 'Jun 2026',
  days: 29,
  priorYearLabel: 'May 29 – Jun 26, 2025',
  priorYearShort: 'Jun 2025',
} as const

/**
 * The three comparison figures, in the report's own order.
 *
 * These four numbers — plus the prior-year reading below — are the seed the
 * whole module grows from. Change them and the score, the percentile, every
 * dollar, every kilogram, the plan and the band all recompute; nothing
 * downstream is typed in by hand. That is the property worth protecting when
 * this demo is re-pointed at a different account.
 */
export const PEER_USAGE = {
  efficient: 780,
  similar: 1348,
  you: 2009,
} as const

/** The year-over-year pair. */
export const YEAR_OVER_YEAR = {
  lastYear: 2070,
  thisYear: 2009,
  /**
   * The report rounds to a whole percent and lands on 2; the exact change is
   * −2.9. We print the report's own figure wherever we are quoting the report,
   * and `REPORT.yoy.pct` wherever we are doing our own arithmetic — see the
   * provenance table, which states both.
   */
  statedChangePct: -2,
  direction: 'decreased' as const,
  /** The report's own heading over the explanation, phrased as a question. */
  billQuestion: 'What could have caused your energy use to decrease?',
  billExplanation:
    'Changes in your household this period, like less appliance use or fewer people at home, may have lowered your energy use.',
}

/** The Fair / Good / Great meter, and the band the report marks. */
export const BILL_RATING = {
  title: 'Your energy use at a glance',
  bands: ['Fair', 'Good', 'Great'] as const,
  current: 'Fair' as const,
  headlineComparisonPct: 49,
  headlineComparison: 'higher' as const,
  /** The report's own gloss on what the meter is for. */
  contextNote:
    "This report gives context into how you're doing compared to others in your area.",
  /**
   * The report marks this with a ✗, so it is a FAILED check and not a neutral
   * observation. The flag travels with the sentence — a UI that renders the
   * words without the mark has quietly softened the report.
   */
  verdict: 'You used more energy than efficient homes',
  verdictIsAdverse: true,
}

/** The one tip the report leads with, and the end use its smart meter blames. */
export const BILL_TIP = {
  heading: 'Top recommended tip for you',
  title: 'Clean coils, cooler fridge',
  body:
    'Dusty coils make your fridge work harder and use more energy. Give the condenser coils a quick clean to help your fridge run more efficiently.',
  /** The report's own phrasing is "Appliances use"; the short form indexes END_USES. */
  highestEndUse: 'Appliances',
  highestEndUseLabel: 'Appliances use',
  highestEndUseNote:
    'Based on your smart meter data, your energy use was highest in Appliances use',
}

/** The "What Uses Most" profile, and the questions still unanswered. */
export const PROFILE = {
  name: 'What Uses Most Profile',
  cta: 'Start your What Uses Most Profile',
  completionPct: 0,
  missing: ['Home type', 'Own or Rent', 'Home size', 'More home details'],
  promise:
    'Finish your profile to unlock the most accurate recommendations and home comparisons within this report. Get started now!',
  /**
   * The report prints a QR beside the profile prompt, captioned EASY LOGIN. It
   * is modelled rather than dropped because the whole point of that square is
   * that it removes the typing — a rendition of the report that turns it back
   * into a URL has removed the feature and kept the clutter.
   */
  qr: { caption: 'EASY LOGIN', target: BILL_META.links.whatUsesMost },
}

/** The rewards offer, verbatim in its numbers. */
export const CONNECTED_REWARDS = {
  name: 'Connected Rewards',
  heading: 'Earn up to $120 in bill credits',
  annualCreditUsd: 120,
  requirement: 'A qualified smart thermostat',
  guardrail: 'Your thermostat will never be adjusted by more than 4 degrees',
  exit: 'You can opt out at any time',
  availability: 'Now available year-round',
  rationale: 'The program helps us manage energy demand and lower costs for everyone.',
  signupLine: `Sign up for Connected Rewards at ${BILL_META.links.connectedRewards}`,
}

/* ========================================================================== *
 *  2. Assumptions — the only inputs that are neither reported nor derived
 * ========================================================================== */

/**
 * Everything modeled below rests on these three numbers, so they are named,
 * printed in the UI and printed in the PDF. A reviewer who disagrees with the
 * blended rate can see exactly which figures move.
 *
 * The bill's "unit" deliberately mixes kWh and therms, so no published tariff
 * applies to it directly — the rate is a blended residential figure for the
 * provider's service territory, not a quoted price.
 */
export const ASSUMPTIONS = {
  /** USD per combined unit — blended electricity + gas, regional residential. */
  ratePerUnit: 0.19,
  /** kg CO₂e per combined unit — blended grid + gas combustion. */
  kgCo2PerUnit: 0.42,
  /** kg CO₂ a mature tree sequesters in a year, for the offset equivalence. */
  kgCo2PerTreeYear: 21,
  /** kg CO₂ per mile for an average passenger vehicle. */
  kgCo2PerCarMile: 0.4,
} as const

/* ========================================================================== *
 *  3. Modeled — twelve months of history
 * ========================================================================== */

export interface MonthPoint {
  label: string
  year: number
  /** This household, in combined units. */
  you: number
  /** The comparison group's average for the same month. */
  similar: number
  /** The efficient-homes benchmark, held at the report's own efficient:similar ratio. */
  efficient: number
  /** True for the month the report actually covers — the only reported point. */
  reported: boolean
}

/** The bill's own efficient : similar ratio, reused for every other month. */
const EFFICIENT_RATIO = PEER_USAGE.efficient / PEER_USAGE.similar

/**
 * The seasonal shape, as multiples of the reported June — NOT twelve typed-in
 * readings.
 *
 * This used to be a table of absolute units, which quietly broke the module's
 * one promise: change the reported period and everything recomputes. It did not.
 * The June row moved with `PEER_USAGE` and the other eleven stayed where they
 * were, so re-pointing the demo at a different account left a year of history
 * that no longer joined up with the period it was supposed to be anchored on.
 *
 * Holding the shape as indices fixes that by construction. Mid-Atlantic
 * single-family: a summer cooling peak, a deeper winter heating peak, and mild
 * shoulders either side. The household's own curve swings wider than the group's
 * because a leakier, less efficient home is more exposed to weather — which is
 * the same claim the twelve-month chart is making, so it belongs in the data
 * rather than in the caption.
 */
const SEASONAL: [label: string, year: number, you: number, similar: number][] = [
  ['Jul', 2025, 1.085, 1.091],
  ['Aug', 2025, 1.115, 1.117],
  ['Sep', 2025, 0.951, 0.979],
  ['Oct', 2025, 0.816, 0.876],
  ['Nov', 2025, 0.886, 0.938],
  ['Dec', 2025, 1.055, 1.098],
  ['Jan', 2026, 1.15, 1.184],
  ['Feb', 2026, 1.09, 1.128],
  ['Mar', 2026, 0.936, 0.994],
  ['Apr', 2026, 0.806, 0.883],
  ['May', 2026, 0.876, 0.931],
  // The reported period — index 1 by definition, and the only row here that is
  // a reading rather than a projection of one.
  ['Jun', 2026, 1, 1],
]

export const HISTORY: MonthPoint[] = SEASONAL.map(([label, year, youIdx, similarIdx], i) => {
  const similar = Math.round(PEER_USAGE.similar * similarIdx)
  return {
    label,
    year,
    you: Math.round(PEER_USAGE.you * youIdx),
    similar,
    efficient: Math.round(similar * EFFICIENT_RATIO),
    reported: i === SEASONAL.length - 1,
  }
})

/**
 * Twelve months of each series. Hoisted above the end-use split and the savings
 * plan because both are stated as shares of the year, not of the period.
 */
const annualYou = HISTORY.reduce((sum, m) => sum + m.you, 0)
const annualSimilar = HISTORY.reduce((sum, m) => sum + m.similar, 0)
const annualEfficient = HISTORY.reduce((sum, m) => sum + m.efficient, 0)

/* ========================================================================== *
 *  4. Modeled — the end-use split
 * ========================================================================== */

export interface EndUse {
  id: string
  label: string
  /** This period, in combined units. */
  units: number
  /** Twelve months, in combined units — what the savings plan is sized against. */
  unitsPerYear: number
  sharePct: number
  /** The bill names exactly one end use as the largest; that one is highlighted. */
  isTop: boolean
  note: string
}

/**
 * Shares are a typical Mid-Atlantic single-family split, re-weighted so
 * APPLIANCES lead — which is what the bill's smart-meter line actually asserts.
 * That ordering is the reported part; the percentages are ours.
 *
 * Units are apportioned, never typed. An earlier version carried both a share
 * and a unit count as literals and they disagreed by two units against the
 * period total, which is the sort of thing nobody notices until a customer adds
 * up the donut on the phone. The last row absorbs the rounding remainder so the
 * column reconciles exactly.
 */
const END_USE_SHARES: [id: string, label: string, sharePct: number, note: string][] = [
  [
    'appliances',
    'Appliances',
    31,
    'Named by your smart meter as the largest draw — fridge, laundry, dishwasher and oven together.',
  ],
  [
    'hvac',
    'Heating & cooling',
    26,
    'Second largest, and the one most exposed to the weather either side of this mild period.',
  ],
  [
    'water',
    'Water heating',
    18,
    'Runs continuously — the tank reheats whether anyone is home or not.',
  ],
  [
    'lighting',
    'Lighting',
    10,
    'High for a June period, which points at remaining halogen or incandescent fixtures.',
  ],
  [
    'electronics',
    'Electronics',
    8,
    'Screens, networking and chargers, most of it drawn around the clock.',
  ],
  [
    'other',
    'Everything else',
    7,
    'Pumps, outdoor circuits and standby losses across the rest of the panel.',
  ],
]

/** Apportions a total across the shares, last row taking the remainder. */
const apportion = (total: number): number[] => {
  const head = END_USE_SHARES.slice(0, -1).map(([, , pct]) => Math.round((total * pct) / 100))
  return [...head, total - head.reduce((s, n) => s + n, 0)]
}

const periodUnits = apportion(PEER_USAGE.you)
const yearUnits = apportion(annualYou)

export const END_USES: EndUse[] = END_USE_SHARES.map(([id, label, sharePct, note], i) => ({
  id,
  label,
  units: periodUnits[i],
  unitsPerYear: yearUnits[i],
  sharePct,
  isTop: i === 0,
  note,
}))

/* ========================================================================== *
 *  5. Modeled — the savings plan
 * ========================================================================== */

export type Effort = 'low' | 'medium' | 'high'

export interface SavingAction {
  id: string
  title: string
  /** Two words at most — for chart axes, where the full title will not fit. */
  short: string
  detail: string
  /** How much of its end use the measure removes. The stated basis of the saving. */
  reductionPct: number
  /** Units saved per year — DERIVED from `reductionPct` and the end use's year. */
  unitsPerYear: number
  /** Direct bill credit per year, on top of the units saved (Connected Rewards). */
  creditUsdPerYear: number
  effort: Effort
  /** Upfront spend, 0 for the free ones. */
  upfrontUsd: number
  /** Which end use it acts on — ties each action back to the split above. */
  endUseId: string
  /** True where the action is the bill's own recommendation, not ours. */
  fromBill: boolean
}

/**
 * Each measure states what it removes and from WHERE, and the units follow.
 *
 * These were six typed-in annual figures, which meant the end-use split and the
 * plan were two independent stories that happened to agree. They stopped
 * agreeing the moment the split was re-weighted to put appliances on top: the
 * duct-sealing line went on claiming a saving sized against a heating load that
 * had just shrunk by nine points. Stating the percentage and deriving the units
 * makes that impossible — move a share and every measure resizes with it.
 */
const ACTION_SPECS: Omit<SavingAction, 'unitsPerYear'>[] = [
  {
    id: 'led',
    short: 'LEDs',
    title: 'Finish the LED retrofit',
    detail:
      'Lighting is 10% of your period — roughly double what an all-LED house of this size shows. Swapping the remaining fixtures is the single biggest line in this plan.',
    reductionPct: 48,
    creditUsdPerYear: 0,
    effort: 'low',
    upfrontUsd: 110,
    endUseId: 'lighting',
    fromBill: false,
  },
  {
    id: 'seal',
    short: 'Seal & insulate',
    title: 'Seal and insulate ducts and attic',
    detail:
      'Cuts the heating and cooling load about 12%. That is the second-largest end use here, and the one that swings hardest either side of this mild period. Eligible for a state efficiency rebate, so the quoted upfront cost is the post-rebate figure.',
    reductionPct: 12,
    creditUsdPerYear: 0,
    effort: 'high',
    upfrontUsd: 380,
    endUseId: 'hvac',
    fromBill: false,
  },
  {
    id: 'thermostat',
    short: 'Thermostat',
    title: 'Join Connected Rewards with a smart thermostat',
    detail: `The report offers up to $${CONNECTED_REWARDS.annualCreditUsd} a year in credits, and the setback itself trims about 8% off heating and cooling. Adjustments are capped at 4 degrees and you can opt out at any time.`,
    reductionPct: 8,
    creditUsdPerYear: CONNECTED_REWARDS.annualCreditUsd,
    effort: 'medium',
    upfrontUsd: 140,
    endUseId: 'hvac',
    fromBill: true,
  },
  {
    id: 'phantom',
    short: 'Smart strips',
    title: 'Put always-on electronics on smart strips',
    detail:
      'Electronics hold 8% of the period with almost no daily variation, which is the signature of standby draw rather than use.',
    reductionPct: 25,
    creditUsdPerYear: 0,
    effort: 'low',
    upfrontUsd: 50,
    endUseId: 'electronics',
    fromBill: false,
  },
  {
    id: 'waterheater',
    short: 'Water heater',
    title: 'Drop the water heater to 120°F and jacket the tank',
    detail:
      'Water heating runs flat through the year at 18% of the load. A setback plus an insulating jacket takes about 8% off it.',
    reductionPct: 8,
    creditUsdPerYear: 0,
    effort: 'low',
    upfrontUsd: 35,
    endUseId: 'water',
    fromBill: false,
  },
  {
    id: 'coils',
    short: 'Fridge coils',
    title: 'Clean the fridge condenser coils',
    detail:
      "The report's own top tip. Ten minutes, no spend, and it acts on the end use your smart meter already flagged as the largest — dusty coils make the compressor run longer for the same cold.",
    reductionPct: 3,
    creditUsdPerYear: 0,
    effort: 'low',
    upfrontUsd: 0,
    endUseId: 'appliances',
    fromBill: true,
  },
]

const endUseYear = (id: string): number => {
  const found = END_USES.find((e) => e.id === id)
  if (!found) throw new Error(`Saving action points at unknown end use "${id}"`)
  return found.unitsPerYear
}

export const SAVING_ACTIONS: SavingAction[] = ACTION_SPECS.map((spec) => ({
  ...spec,
  unitsPerYear: Math.round((endUseYear(spec.endUseId) * spec.reductionPct) / 100),
}))

/* ========================================================================== *
 *  6. Derivation
 * ========================================================================== */

const round = (n: number, dp = 0) => {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

/** Money from units, at the stated blended rate. */
export const usd = (units: number) => round(units * ASSUMPTIONS.ratePerUnit, 2)

/** kg CO₂e from units, at the stated blended factor. */
export const kgCo2 = (units: number) => round(units * ASSUMPTIONS.kgCo2PerUnit, 1)

/**
 * The 0–100 efficiency score.
 *
 * Anchored on the report's own two benchmarks rather than invented: the efficient
 * homes figure scores 100, the similar-homes average scores 70, and the line
 * through those two points is extended in both directions. That is what makes
 * the result land on "Fair" — the same band the report itself marks — instead of
 * being a number we chose because it looked right.
 */
const SCORE_AT_EFFICIENT = 100
const SCORE_AT_SIMILAR = 70
const SCORE_SLOPE =
  (SCORE_AT_SIMILAR - SCORE_AT_EFFICIENT) / (PEER_USAGE.similar - PEER_USAGE.efficient)

export function efficiencyScore(units: number): number {
  const raw = SCORE_AT_EFFICIENT + (units - PEER_USAGE.efficient) * SCORE_SLOPE
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export type ScoreBand = 'Fair' | 'Good' | 'Great'

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return 'Great'
  if (score >= 40) return 'Good'
  return 'Fair'
}

/**
 * Where this home sits in the comparison group.
 *
 * The bill gives two points of the peer distribution — its mean (1,348) and its
 * 20th percentile (780, by the "efficient homes" definition) — which is enough
 * to fit a normal and read a percentile off it. Approximate by construction, so
 * the UI rounds it and says "about".
 */
const Z_AT_P20 = 0.8416
const PEER_SIGMA = (PEER_USAGE.similar - PEER_USAGE.efficient) / Z_AT_P20

/** Standard normal CDF (Abramowitz & Stegun 26.2.17). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (1.330274 * t ** 4 - 1.821256 * t ** 3 + 1.781478 * t ** 2 - 0.356538 * t + 0.3193815)
  return z > 0 ? 1 - p : p
}

export function peerPercentile(units: number): number {
  return Math.round(normalCdf((units - PEER_USAGE.similar) / PEER_SIGMA) * 100)
}

/* ------------------------------- the report ------------------------------- */

const gapVsSimilar = PEER_USAGE.you - PEER_USAGE.similar
const gapVsEfficient = PEER_USAGE.you - PEER_USAGE.efficient
const annualGapVsSimilar = annualYou - annualSimilar

const score = efficiencyScore(PEER_USAGE.you)
const lastYearScore = efficiencyScore(YEAR_OVER_YEAR.lastYear)

const planUnits = SAVING_ACTIONS.reduce((s, a) => s + a.unitsPerYear, 0)
const planCredits = SAVING_ACTIONS.reduce((s, a) => s + a.creditUsdPerYear, 0)
const planUpfront = SAVING_ACTIONS.reduce((s, a) => s + a.upfrontUsd, 0)
const planSavingsUsd = round(usd(planUnits) + planCredits, 2)

/** The reported period re-run as if a given annual saving were already in place. */
const periodAfter = (unitsPerYear: number) =>
  Math.round(PEER_USAGE.you * (1 - unitsPerYear / annualYou))

const periodAfterPlan = periodAfter(planUnits)

/**
 * The low-effort subset — everything a householder can do themselves in an
 * afternoon, no contractor.
 *
 * This exists because the obvious claim ("the free actions alone get you out of
 * Fair") is FALSE against this model, and it is exactly the kind of claim a demo
 * drifts into. The band boundary is 40 and the one free action reaches 36; the
 * two cheapest reach 38. The four low-effort ones reach 45, which is both true
 * and a better story. Deriving it here rather than asserting it in copy is what
 * stops the two going out of step again.
 */
const lowEffort = SAVING_ACTIONS.filter((a) => a.effort === 'low')
const quickUnits = lowEffort.reduce((s, a) => s + a.unitsPerYear, 0)
const quickUpfront = lowEffort.reduce((s, a) => s + a.upfrontUsd, 0)

/**
 * Where the cheapest routes actually land.
 *
 * These exist because the copy kept asserting them from memory — "the free tip
 * reaches 36, the two cheapest reach 38" was hardcoded in three places and went
 * stale the moment any figure moved. Deriving them means the sentence and the
 * arithmetic cannot disagree again.
 */
const byUpfront = [...SAVING_ACTIONS].sort((a, b) => a.upfrontUsd - b.upfrontUsd)
const freeUnits = SAVING_ACTIONS.filter((a) => a.upfrontUsd === 0).reduce(
  (s, a) => s + a.unitsPerYear,
  0,
)
const twoCheapestUnits = byUpfront.slice(0, 2).reduce((s, a) => s + a.unitsPerYear, 0)

/**
 * Next period's projection: last July's reading carried forward on the observed
 * year-over-year rate. One month, one method, stated plainly — anything cleverer
 * would be false precision on a single sourced data point.
 */
const yoyRate = YEAR_OVER_YEAR.thisYear / YEAR_OVER_YEAR.lastYear
const forecastUnits = Math.round(HISTORY[0].you * yoyRate)

export const REPORT = {
  /* ----- headline ----- */
  score,
  band: scoreBand(score),
  lastYearScore,
  scoreDeltaPts: score - lastYearScore,
  percentile: peerPercentile(PEER_USAGE.you),

  /* ----- the period ----- */
  period: {
    units: PEER_USAGE.you,
    perDay: round(PEER_USAGE.you / PERIOD.days, 1),
    cost: usd(PEER_USAGE.you),
    co2Kg: kgCo2(PEER_USAGE.you),
  },

  /* ----- the gaps ----- */
  vsSimilar: {
    units: gapVsSimilar,
    pct: round((gapVsSimilar / PEER_USAGE.similar) * 100, 1),
    cost: usd(gapVsSimilar),
  },
  vsEfficient: {
    units: gapVsEfficient,
    pct: round((gapVsEfficient / PEER_USAGE.efficient) * 100, 1),
    cost: usd(gapVsEfficient),
  },

  /* ----- year over year ----- */
  yoy: {
    units: YEAR_OVER_YEAR.thisYear - YEAR_OVER_YEAR.lastYear,
    pct: round(((YEAR_OVER_YEAR.thisYear - YEAR_OVER_YEAR.lastYear) / YEAR_OVER_YEAR.lastYear) * 100, 1),
    costSaved: usd(YEAR_OVER_YEAR.lastYear - YEAR_OVER_YEAR.thisYear),
  },

  /* ----- twelve months ----- */
  annual: {
    you: annualYou,
    similar: annualSimilar,
    efficient: annualEfficient,
    gapUnits: annualGapVsSimilar,
    gapPct: round((annualGapVsSimilar / annualSimilar) * 100, 1),
    cost: usd(annualYou),
    similarCost: usd(annualSimilar),
    efficientCost: usd(annualEfficient),
    /** The headline dollar figure: a year of running above the group. */
    excessCost: usd(annualGapVsSimilar),
    excessVsEfficientCost: usd(annualYou - annualEfficient),
  },

  /* ----- carbon ----- */
  carbon: {
    annualKg: kgCo2(annualYou),
    annualTonnes: round(kgCo2(annualYou) / 1000, 2),
    excessKg: kgCo2(annualGapVsSimilar),
    excessTonnes: round(kgCo2(annualGapVsSimilar) / 1000, 2),
    treesToOffsetExcess: Math.round(kgCo2(annualGapVsSimilar) / ASSUMPTIONS.kgCo2PerTreeYear),
    carMilesEquivalent: Math.round(kgCo2(annualGapVsSimilar) / ASSUMPTIONS.kgCo2PerCarMile),
  },

  /* ----- the plan ----- */
  plan: {
    unitsPerYear: planUnits,
    savingsUsdPerYear: planSavingsUsd,
    creditsUsdPerYear: planCredits,
    upfrontUsd: planUpfront,
    /** Months for the upfront spend to pay itself back. */
    paybackMonths: round(planUpfront / (planSavingsUsd / 12), 1),
    /** How much of the gap to similar homes the plan closes. */
    gapClosedPct: round((planUnits / annualGapVsSimilar) * 100, 0),
    projectedScore: efficiencyScore(periodAfterPlan),
    projectedBand: scoreBand(efficiencyScore(periodAfterPlan)),
    projectedPeriodUnits: periodAfterPlan,
    freeActions: SAVING_ACTIONS.filter((a) => a.upfrontUsd === 0).length,
  },

  /** The do-it-yourself subset, and where it lands on its own. */
  quickWins: {
    count: lowEffort.length,
    ids: lowEffort.map((a) => a.id),
    unitsPerYear: quickUnits,
    savingsUsdPerYear: usd(quickUnits),
    upfrontUsd: quickUpfront,
    projectedScore: efficiencyScore(periodAfter(quickUnits)),
    projectedBand: scoreBand(efficiencyScore(periodAfter(quickUnits))),
  },

  /** The score the band boundary demands, and what it costs to get there. */
  threshold: {
    goodBandAt: 40,
    /** Period units that would score exactly 40. */
    periodUnitsNeeded: Math.ceil(PEER_USAGE.efficient + (100 - 40) / -SCORE_SLOPE),
    /** Where the free action alone lands — short of the boundary, and said so. */
    freeOnlyScore: efficiencyScore(periodAfter(freeUnits)),
    /** And the two cheapest together. Also short, on current figures. */
    twoCheapestScore: efficiencyScore(periodAfter(twoCheapestUnits)),
  },

  /* ----- next period ----- */
  forecast: {
    month: 'Jul 2026',
    units: forecastUnits,
    cost: usd(forecastUnits),
    basis: `Jul 2025 carried forward at this period's ${YEAR_OVER_YEAR.statedChangePct}% year-over-year change`,
  },
} as const

/* ========================================================================== *
 *  7. Provenance
 * ========================================================================== */

/** The sections a reported value belongs to — how the statement groups them. */
export type FieldGroup = 'Account' | 'This period' | 'Comparison' | 'Programs' | 'Mailing'

export interface ExtractedField {
  label: string
  value: string
  group: FieldGroup
}

/**
 * Every figure the statement reports, grouped as the statement groups them.
 *
 * Grouped by MEANING, not by where it sat on a page. The two are easy to
 * confuse and only one of them is useful: "Comparison" tells a reader which
 * numbers belong to the peer story, whereas a position on a page only tells
 * them about a layout they are not looking at.
 */
export const EXTRACTED_FIELDS: ExtractedField[] = [
  { label: 'Provider', value: BILL_META.provider, group: 'Account' },
  { label: 'Report', value: BILL_META.documentType, group: 'Account' },
  { label: 'Report date', value: BILL_META.reportDate, group: 'Account' },
  { label: 'Account number', value: `#${BILL_META.accountNumber}`, group: 'Account' },
  { label: 'Customer', value: BILL_META.customerName, group: 'Account' },
  { label: 'Service address', value: BILL_META.serviceAddress, group: 'Account' },
  { label: 'Statement reference', value: BILL_META.statementRef, group: 'Account' },
  { label: 'Billing period', value: `${PERIOD.label} (${PERIOD.days} days)`, group: 'This period' },
  { label: 'Your usage', value: `${PEER_USAGE.you.toLocaleString()} units`, group: 'This period' },
  { label: 'Rating band', value: BILL_RATING.current, group: 'This period' },
  { label: 'Rating scale', value: BILL_RATING.bands.join(' · '), group: 'This period' },
  { label: 'Efficient-homes check', value: `Failed — ${BILL_RATING.verdict.toLowerCase()}`, group: 'This period' },
  { label: 'Highest end use', value: BILL_TIP.highestEndUseLabel, group: 'This period' },
  { label: 'Top recommended tip', value: BILL_TIP.title, group: 'This period' },
  { label: 'Similar homes', value: `${PEER_USAGE.similar.toLocaleString()} units`, group: 'Comparison' },
  { label: 'Efficient homes', value: `${PEER_USAGE.efficient.toLocaleString()} units`, group: 'Comparison' },
  { label: 'Gap vs similar homes', value: `${BILL_RATING.headlineComparisonPct}% ${BILL_RATING.headlineComparison}`, group: 'Comparison' },
  { label: 'Prior-year period', value: PERIOD.priorYearLabel, group: 'Comparison' },
  { label: 'Prior-year usage', value: `${YEAR_OVER_YEAR.lastYear.toLocaleString()} units`, group: 'Comparison' },
  { label: 'Year-over-year change', value: `${YEAR_OVER_YEAR.statedChangePct}% (${YEAR_OVER_YEAR.direction})`, group: 'Comparison' },
  { label: 'Rewards offer', value: `Up to $${CONNECTED_REWARDS.annualCreditUsd} a year in bill credits`, group: 'Programs' },
  { label: 'Rewards sign-up', value: BILL_META.links.connectedRewards, group: 'Programs' },
  { label: 'Profile completion', value: `${PROFILE.completionPct}%`, group: 'Programs' },
  { label: 'Profile questions outstanding', value: PROFILE.missing.join(', '), group: 'Programs' },
  { label: 'Profile sign-in', value: `QR · ${PROFILE.qr.caption}`, group: 'Programs' },
  { label: 'Rebate storefront', value: BILL_META.links.smartEnergy, group: 'Programs' },
  { label: 'Print code', value: MAILING.printCode, group: 'Mailing' },
  { label: 'Carrier route', value: MAILING.carrierRoute, group: 'Mailing' },
  { label: 'Mail batch', value: MAILING.batchRef, group: 'Mailing' },
]

/** The groups in display order, each with its fields. */
export const FIELD_GROUPS: { group: FieldGroup; fields: ExtractedField[] }[] = (
  ['Account', 'This period', 'Comparison', 'Programs', 'Mailing'] as FieldGroup[]
).map((group) => ({ group, fields: EXTRACTED_FIELDS.filter((f) => f.group === group) }))

export interface ProvenanceRow {
  figure: string
  origin: 'Reported' | 'Modeled'
  basis: string
}

/** The honesty table — printed on screen and in the PDF. */
export const PROVENANCE: ProvenanceRow[] = [
  { figure: 'Usage, peers, efficient homes', origin: 'Reported', basis: "This period's reported figures" },
  { figure: 'Year-over-year change', origin: 'Reported', basis: 'Reported against the same window last year' },
  { figure: 'Rating band, largest end use, top tip', origin: 'Reported', basis: 'Reported from smart-meter data' },
  { figure: 'Rewards offer and profile completion', origin: 'Reported', basis: 'Account programme record' },
  { figure: 'Print, postal and batch codes', origin: 'Reported', basis: 'Mail-house marks; structure modelled, values from this account' },
  { figure: 'Exact year-over-year change', origin: 'Modeled', basis: `${round(((YEAR_OVER_YEAR.thisYear - YEAR_OVER_YEAR.lastYear) / YEAR_OVER_YEAR.lastYear) * 100, 1)}% computed; the report states ${YEAR_OVER_YEAR.statedChangePct}%, rounded` },
  { figure: 'Efficiency score', origin: 'Modeled', basis: `Linear fit through the report's own two benchmarks (${PEER_USAGE.efficient.toLocaleString()} = 100, ${PEER_USAGE.similar.toLocaleString()} = 70)` },
  { figure: 'Percentile in the group', origin: 'Modeled', basis: 'Normal fitted to the mean and 20th percentile the bill gives' },
  { figure: 'Every dollar figure', origin: 'Modeled', basis: `$${ASSUMPTIONS.ratePerUnit.toFixed(2)} per combined unit, blended residential` },
  { figure: 'Every carbon figure', origin: 'Modeled', basis: `${ASSUMPTIONS.kgCo2PerUnit} kg CO₂e per combined unit, blended` },
  { figure: 'End-use split', origin: 'Modeled', basis: `Only the ORDER is reported — the report names ${BILL_TIP.highestEndUse.toLowerCase()} largest and nothing else. The percentages are a regional split re-weighted to match it` },
  { figure: 'Twelve-month history', origin: 'Modeled', basis: 'Seasonal profile anchored on the one reported period' },
  { figure: 'Savings plan and payback', origin: 'Modeled', basis: 'Published measure savings applied to the end-use split' },
]

/* ========================================================================== *
 *  8. Formatting
 * ========================================================================== */

/**
 * Look-ups for prose that has to quote one specific row.
 *
 * Copy that hardcodes "the fridge coils" or "$120 a year" goes stale the moment
 * the underlying figures move — which is exactly what happened across three
 * files last time. Prose reaches for these instead.
 */
export const actionById = (id: string): SavingAction => {
  const found = SAVING_ACTIONS.find((a) => a.id === id)
  if (!found) throw new Error(`No saving action "${id}"`)
  return found
}

export const endUseById = (id: string): EndUse => {
  const found = END_USES.find((e) => e.id === id)
  if (!found) throw new Error(`No end use "${id}"`)
  return found
}

/** The two largest end uses and their combined share — a recurring claim. */
export const TOP_TWO_END_USES = {
  labels: END_USES.slice(0, 2).map((e) => e.label),
  sharePct: END_USES.slice(0, 2).reduce((s, e) => s + e.sharePct, 0),
}

export const fmtUsd = (n: number, dp = 0) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp })

export const fmtUnits = (n: number) => n.toLocaleString('en-US')

export const fmtSignedPct = (n: number, dp = 0) => `${n > 0 ? '+' : ''}${n.toFixed(dp)}%`
