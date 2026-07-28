/**
 * Derived "AI insights" for an account — the data behind the copilot's insights
 * column.
 *
 * NOTHING here is stored. Every figure is derived from the same seed the rest of
 * the demo reads (`customers.ts` plus the 24-month history in `usage.ts`), so an
 * insight can never contradict the account panel sitting on the other side of
 * the conversation. The derivations are deterministic — seeded by the account id
 * through the same PRNG that builds the history — so the panel shows identical
 * figures on every render and every reload.
 *
 * Copy lives in i18n, not here: each result carries an id plus the values to
 * interpolate, and the component looks the sentence up under `insights.*`. That
 * keeps the rules themselves language-independent.
 */

import type { Account, ServiceType } from "@/data/customers"
import { MONTHS, fullHistory, mulberry32, seedFrom, usageStats, type HistPoint } from "@/data/usage"

/**
 * How an insight should read, not what colour it is — the components own the
 * palette. `critical` is "act now", `caution` is "worth a look", `positive` is
 * "this is going well", `neutral` is plain information.
 */
export type InsightTone = "positive" | "caution" | "critical" | "neutral"

/** One bar of the forecast sparkline. The last one is the projection. */
export interface InsightBar {
  label: string
  year: number
  value: number
  projected: boolean
}

export interface EfficiencyInsight {
  /** 0–100 index blending usage trend, steadiness and billing standing. */
  score: number
  /** Movement against the previous quarter, in index points. */
  deltaPts: number
  tone: InsightTone
}

/** How the account compares with similar homes. Null when there's no usage yet. */
export interface BenchmarkInsight {
  /** Absolute gap in the account's own unit. */
  delta: number
  /** True when this account uses LESS than comparable homes. */
  below: boolean
  pct: number
  peerAvg: number
}

export interface ForecastInsight {
  /** Projected usage for the next period, in the account's unit. */
  projected: number
  /** Change against the latest actual month; null when there's no baseline. */
  deltaPct: number | null
  /** What that projection costs at the account's current effective rate. */
  estimatedBill: number
  /** The month being projected, e.g. "Jul". */
  monthLabel: string
  /** The month it is measured against, e.g. "Jun". */
  fromLabel: string
  /** Six actual months followed by the projection. */
  bars: InsightBar[]
}

export interface QualityInsight {
  statusKey: "excellent" | "good"
  score: number
  tone: InsightTone
}

export interface LeakInsight {
  pct: number
  levelKey: "low" | "moderate" | "elevated" | "high"
  tone: InsightTone
}

export type ActivityIcon = "meter" | "bill" | "usage" | "flag"

export interface ActivityItem {
  /** Names the row's copy under `insights.activity.<id>`. */
  id: string
  icon: ActivityIcon
  tone: InsightTone
  /** When it happened — a month label or a due date, straight from the data. */
  when: string
  /** The figure shown on the right, or null for rows that carry no number. */
  amount: number | null
  amountKind: "usage" | "money" | "score"
  /** Values interpolated into the row's title. */
  vars?: Record<string, string | number>
}

export interface Recommendation {
  /** Names the card's copy under `insights.rec.<id>`. */
  id: string
  tone: InsightTone
  /**
   * Values interpolated into the localized title/body. Numeric values are
   * formatted at render: keys prefixed `money` become currency, every other
   * number is thousands-separated. `{{unit}}` is always available.
   */
  vars: Record<string, string | number>
  /** The message sent into the conversation when the action is taken. */
  prompt: string
  /** Storyboard played instead when there's no verified chatbot session. */
  scenarioId: string
}

export interface AccountInsights {
  /**
   * False for an account that has never recorded a read (a service application
   * still in review). Several figures are meaningless without history, and the
   * panel shows an em dash rather than a confidently derived number.
   */
  hasUsage: boolean
  efficiency: EfficiencyInsight
  /** Null when the account has never recorded usage (a pending application). */
  benchmark: BenchmarkInsight | null
  forecast: ForecastInsight
  quality: QualityInsight
  leak: LeakInsight
  activity: ActivityItem[]
  /** At most three, highest priority first. */
  recommendations: Recommendation[]
}

/**
 * Fallback unit price, used only when the account carries no balance to infer a
 * real one from. Rough US residential averages — this is illustrative data.
 */
const FALLBACK_RATE: Record<ServiceType, number> = { Water: 0.009, Electric: 0.22, Gas: 1.35 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** The month label after a given point, wrapping the year. */
function nextMonth(point: HistPoint): { label: string; year: number } {
  const mi = (point.monthIndex + 1) % 12
  return { label: MONTHS[mi], year: point.monthIndex === 11 ? point.year + 1 : point.year }
}

export function accountInsights(account: Account): AccountInsights {
  const hist = fullHistory(account)
  const stats = usageStats(account)
  const values = hist.map((p) => p.value)
  const recent6 = hist.slice(-6)
  const latest = hist[hist.length - 1]
  const avg = stats.avgMonthly
  // Seeded off the id — but with its own salt, so the insight jitter is
  // independent of the noise `usage.ts` already drew from the same id.
  const rnd = mulberry32(seedFrom(`${account.id}:insights`))

  const hasUsage = stats.total2y > 0
  const zeroRun = countTrailingZeros(recent6)

  const efficiency = deriveEfficiency(account, stats, hist, values)
  const benchmark = hasUsage ? deriveBenchmark(stats, avg, rnd) : null
  const forecast = deriveForecast(account, stats, hist, values, recent6, latest)
  const quality = deriveQuality(rnd)
  const leak = deriveLeak(stats, avg, recent6, latest, rnd)

  return {
    hasUsage,
    efficiency,
    benchmark,
    forecast,
    quality,
    leak,
    activity: deriveActivity(account, stats, latest, avg, zeroRun, hasUsage, efficiency),
    recommendations: deriveRecommendations({
      account,
      stats,
      avg,
      latest,
      zeroRun,
      hasUsage,
      leak,
      forecast,
      benchmark,
      recent6,
    }),
  }
}

/** How many of the trailing months read zero — the classic dead-meter signature. */
function countTrailingZeros(recent: HistPoint[]): number {
  let n = 0
  for (let i = recent.length - 1; i >= 0 && recent[i].value === 0; i--) n++
  return n
}

/**
 * A 0–100 index: usage trend against last year, how steady the draw is, and
 * whether the account is current and on autopay. Deliberately NOT a percentage
 * of anything — it's a composite, and the UI labels it as a score.
 */
function deriveEfficiency(
  account: Account,
  stats: ReturnType<typeof usageStats>,
  hist: HistPoint[],
  values: number[],
): EfficiencyInsight {
  let score = 76
  if (stats.yoyPct !== null) score -= clamp(stats.yoyPct, -30, 45) * 0.55
  score += account.autopay ? 6 : -5
  score += account.balance === 0 ? 5 : account.balance > 120 ? -9 : -2

  // Steadiness — a spiky series is what a "wasteful" pattern actually looks
  // like in meter data, so the coefficient of variation carries real weight.
  const active = hist.slice(12).filter((p) => p.value > 0)
  const m = mean(active.map((p) => p.value))
  const sd = m ? Math.sqrt(mean(active.map((p) => (p.value - m) ** 2))) : 0
  score -= Math.min(18, (m ? sd / m : 0) * 45)

  // Quarter over quarter, expressed in index points: using less earns points.
  const q1 = mean(values.slice(-6, -3))
  const q2 = mean(values.slice(-3))
  const qoq = q1 > 0 ? ((q2 - q1) / q1) * 100 : 0

  const final = clamp(Math.round(score), 38, 99)
  return {
    score: final,
    deltaPts: Math.round(clamp(-qoq * 0.35, -12, 12)),
    tone: final >= 82 ? "positive" : final >= 62 ? "neutral" : "caution",
  }
}

/**
 * "Similar homes" is modelled off the account's OWN prior-year baseline with a
 * deterministic spread, so an account trending upward lands above its peers and
 * a steady one lands below — the comparison stays coherent with the chart.
 */
function deriveBenchmark(
  stats: ReturnType<typeof usageStats>,
  avg: number,
  rnd: () => number,
): BenchmarkInsight {
  const base = Math.round(stats.lastYear / 12) || avg
  const peerAvg = Math.max(1, Math.round(base * (0.98 + rnd() * 0.22)))
  const delta = peerAvg - avg
  return {
    delta: Math.abs(delta),
    below: delta >= 0,
    pct: Math.round((Math.abs(delta) / peerAvg) * 100),
    peerAvg,
  }
}

/**
 * Next month's usage: recent momentum blended 60/40 with what the same calendar
 * month did a year ago, so a summer spike is projected forward without the
 * trend running away from the season.
 */
function deriveForecast(
  account: Account,
  stats: ReturnType<typeof usageStats>,
  hist: HistPoint[],
  values: number[],
  recent6: HistPoint[],
  latest: HistPoint,
): ForecastInsight {
  const a = mean(values.slice(-3))
  const b = mean(values.slice(-6, -3))
  const momentum = b > 0 ? clamp(a / b, 0.6, 1.6) : 1
  // Index 12 of the 24-point history is the month AFTER the last one, a year ago.
  const seasonalRef = hist[12]?.value ?? a
  const yoyFactor = stats.lastYear > 0 ? clamp(stats.thisYear / stats.lastYear, 0.6, 1.8) : 1
  const projected = Math.max(0, Math.round(0.6 * (a * momentum) + 0.4 * (seasonalRef * yoyFactor)))

  // The account's own effective rate beats any table of averages — it is exactly
  // the number the balance beside it was produced from.
  const rate =
    account.balance > 0 && latest.value > 0
      ? account.balance / latest.value
      : FALLBACK_RATE[account.type]

  const next = nextMonth(latest)
  return {
    projected,
    deltaPct: latest.value > 0 ? ((projected - latest.value) / latest.value) * 100 : null,
    estimatedBill: Math.round(projected * rate * 100) / 100,
    monthLabel: next.label,
    fromLabel: latest.label,
    bars: [
      ...recent6.map((p) => ({ label: p.label, year: p.year, value: p.value, projected: false })),
      { label: next.label, year: next.year, value: projected, projected: true },
    ],
  }
}

/**
 * Supply quality for the service area. Stable per account, and deliberately
 * floored at "good": the card's own note says there are no advisories, and a
 * lower grade beside that line would be a contradiction the demo can't explain.
 */
function deriveQuality(rnd: () => number): QualityInsight {
  const score = Math.round(92 + rnd() * 8)
  return { score, statusKey: score >= 96 ? "excellent" : "good", tone: "positive" }
}

/**
 * Leak likelihood from the three signatures a utility actually watches for: a
 * sustained year-over-year rise, a month well clear of the account's own
 * average, and a floor that never drops (continuous flow).
 */
function deriveLeak(
  stats: ReturnType<typeof usageStats>,
  avg: number,
  recent6: HistPoint[],
  latest: HistPoint,
  rnd: () => number,
): LeakInsight {
  let risk = 5
  if (stats.yoyPct !== null && stats.yoyPct > 15) risk += (stats.yoyPct - 15) * 0.45
  if (avg > 0 && latest.value > avg * 1.35) risk += 22
  if (avg > 0 && latest.value > avg * 1.8) risk += 12
  const floor = Math.min(...recent6.map((p) => p.value))
  if (floor > 0 && avg > 0 && floor > avg * 0.92) risk += 8
  risk += rnd() * 4
  // No flow at all can't be a leak — a dead meter is a different finding, and
  // the recommendation rules raise that one instead.
  if (recent6.every((p) => p.value === 0)) risk = 1

  const pct = clamp(Math.round(risk), 1, 92)
  const levelKey = pct < 10 ? "low" : pct < 25 ? "moderate" : pct < 45 ? "elevated" : "high"
  return {
    pct,
    levelKey,
    tone: pct < 10 ? "positive" : pct < 25 ? "neutral" : pct < 45 ? "caution" : "critical",
  }
}

/** Up to four dated facts about the account, newest concern first. */
function deriveActivity(
  account: Account,
  stats: ReturnType<typeof usageStats>,
  latest: HistPoint,
  avg: number,
  zeroRun: number,
  hasUsage: boolean,
  efficiency: EfficiencyInsight,
): ActivityItem[] {
  const items: ActivityItem[] = []
  const latestWhen = `${latest.label} ${latest.year}`

  if (!hasUsage) {
    // An account awaiting connection has no meter to have read zero — saying so
    // is the fact, and "0 gal recorded" would invent a reading that never happened.
    items.push({
      id: "no-reads",
      icon: "meter",
      tone: "neutral",
      when: latestWhen,
      amount: null,
      amountKind: "usage",
    })
  } else if (zeroRun >= 2) {
    items.push({
      id: "zero-read",
      icon: "flag",
      tone: "critical",
      when: latestWhen,
      // The count belongs in the sentence ("3 consecutive zero reads"), not in
      // the value column — "0 gal" on the right is the point being made.
      amount: 0,
      amountKind: "usage",
      vars: { months: zeroRun },
    })
  } else {
    items.push({
      id: "meter-read",
      icon: "meter",
      tone: "neutral",
      when: latestWhen,
      amount: latest.value,
      amountKind: "usage",
    })
  }

  if (account.balance > 0) {
    items.push({
      id: account.autopay ? "autopay" : "statement",
      icon: "bill",
      tone: account.autopay ? "positive" : "caution",
      when: account.dueDate,
      amount: account.balance,
      amountKind: "money",
    })
  } else {
    items.push({
      id: "settled",
      icon: "bill",
      tone: "positive",
      when: latestWhen,
      amount: 0,
      amountKind: "money",
    })
  }

  if (stats.peak && stats.peak.value > 0) {
    items.push({
      id: "peak",
      icon: "usage",
      tone: avg > 0 && stats.peak.value > avg * 1.3 ? "caution" : "neutral",
      when: `${stats.peak.label} ${stats.peak.year}`,
      amount: stats.peak.value,
      amountKind: "usage",
    })
  }

  items.push({
    id:
      account.status === "Pending"
        ? "application"
        : account.status === "Final"
          ? "move-out"
          : "score",
    icon: "flag",
    tone: account.status === "Active" ? "neutral" : "caution",
    when: latestWhen,
    amount: account.status === "Active" ? efficiency.score : null,
    amountKind: "score",
  })

  return items.slice(0, 4)
}

/**
 * The recommendation rules, highest priority first — the first three that match
 * are what the panel shows. Ordering is the whole design here: a dead meter or a
 * past-due balance has to outrank a savings tip, and the closing rules are
 * unconditional so the panel is never empty.
 */
function deriveRecommendations(ctx: {
  account: Account
  stats: ReturnType<typeof usageStats>
  avg: number
  latest: HistPoint
  zeroRun: number
  hasUsage: boolean
  leak: LeakInsight
  forecast: ForecastInsight
  benchmark: BenchmarkInsight | null
  recent6: HistPoint[]
}): Recommendation[] {
  const { account, stats, avg, latest, zeroRun, hasUsage, leak, forecast, benchmark, recent6 } = ctx
  const out: Recommendation[] = []

  const priorAvg = mean(recent6.slice(0, 3).map((p) => p.value))
  const abovePct = priorAvg > 0 ? Math.round(((latest.value - priorAvg) / priorAvg) * 100) : 0

  // Only an account that HAS reported can have stopped reporting: a pending
  // application reads zero because there is no meter yet, not because one broke.
  if (zeroRun >= 2 && hasUsage && account.status === "Active") {
    out.push({
      id: "zero-reads",
      tone: "critical",
      vars: { months: zeroRun },
      prompt: "My meter has been reading zero for months — can you check whether it's faulty?",
      scenarioId: "report-outage",
    })
  }

  if (account.balance > 120 && !account.autopay) {
    out.push({
      id: "past-due",
      tone: "critical",
      vars: { moneyBalance: account.balance, date: account.dueDate },
      prompt: "Can I set up a payment arrangement for my balance?",
      scenarioId: "payment-arrangement",
    })
  }

  if (leak.pct >= 25) {
    out.push({
      id: "leak-check",
      tone: leak.pct >= 45 ? "critical" : "caution",
      vars: { pct: leak.pct },
      prompt: "My usage pattern suggests a possible leak — can you help me check?",
      scenarioId: "report-leak",
    })
  }

  if (abovePct >= 30 && account.type === "Water") {
    out.push({
      id: "outdoor-usage",
      tone: "caution",
      vars: { pct: abovePct, month: latest.label },
      prompt: "Why is my water usage so much higher this month?",
      scenarioId: "high-bill",
    })
  } else if (abovePct >= 30) {
    out.push({
      id: "high-usage",
      tone: "caution",
      vars: { pct: abovePct, month: latest.label },
      prompt: "Why is my usage so much higher this month?",
      scenarioId: "high-bill",
    })
  }

  if (account.status === "Pending") {
    out.push({
      id: "application",
      tone: "neutral",
      vars: {},
      prompt: "What's the status of my new service application?",
      scenarioId: "start-service",
    })
  }

  if (account.status === "Final") {
    out.push({
      id: "final-bill",
      tone: "caution",
      vars: { moneyBalance: account.balance },
      prompt: "Can you walk me through my final bill?",
      scenarioId: "stop-service",
    })
  }

  if (!account.autopay && account.status === "Active") {
    out.push({
      id: "autopay",
      tone: "caution",
      vars: { date: account.dueDate },
      prompt: "I'd like to enrol in autopay for this account.",
      scenarioId: "update-contact",
    })
  }

  // Savings tip: a tenth off the projection, which is roughly what a fixture
  // check and a schedule change realistically return. Water gets the irrigation
  // framing; a gas or electric account would find that copy nonsensical, so it
  // takes the neutral variant. Skipped when a tenth rounds to nothing.
  const saving = Math.round(forecast.projected * 0.1)
  if (saving >= 1) {
    out.push({
      id: account.type === "Water" ? "seasonal-save" : "usage-save",
      tone: "positive",
      vars: { amount: saving, moneySaving: forecast.estimatedBill * 0.1 },
      prompt: "How can I lower my usage and my next bill?",
      scenarioId: "high-bill",
    })
  }

  // Level pay is the honest answer to a series that swings hard month to month.
  if (avg > 0 && stats.peak && stats.peak.value > avg * 1.5) {
    out.push({
      id: "budget-billing",
      tone: "neutral",
      vars: { month: stats.peak.label },
      prompt: "Can I switch to budget billing to even out my monthly bills?",
      scenarioId: "payment-arrangement",
    })
  }

  // A standing alert is the one thing this panel can't do for itself: it only
  // looks when you look at it. Offered to any open account with history, so it
  // usually lands third — genuinely useful rather than filler.
  if (hasUsage && account.status === "Active") {
    out.push({
      id: "usage-alert",
      tone: "neutral",
      vars: { amount: Math.round(avg * 1.3) },
      prompt: "Can you alert me if my usage goes above normal?",
      scenarioId: "update-contact",
    })
  }

  // Closers — unconditional, so the panel is never empty. "Well managed" is the
  // strongest claim here and has to earn all of it: under comparable homes AND
  // nothing owed AND the account actually open. Anything short of that gets the
  // neutral "worth a look", and an account with no history gets neither, since
  // both of them would be describing usage that doesn't exist.
  if (!hasUsage) {
    out.push({
      id: "new-account",
      tone: "neutral",
      vars: {},
      prompt: "What can you help me with on this account?",
      scenarioId: "start-service",
    })
  } else if (benchmark?.below && account.balance === 0 && account.status === "Active") {
    out.push({
      id: "well-managed",
      tone: "positive",
      vars: { pct: benchmark.pct },
      prompt: "Can you summarise how my account is doing?",
      scenarioId: "high-bill",
    })
  } else {
    // Two ids rather than one with a "direction" token: an above/under word
    // dropped into a sentence is exactly the kind of interpolation that reads
    // fine in English and falls apart in every other locale.
    out.push({
      id: benchmark?.below ? "review-steady" : "review",
      tone: "neutral",
      vars: { pct: benchmark?.pct ?? 0 },
      prompt: "Can you summarise how my account is doing?",
      scenarioId: "high-bill",
    })
  }

  return out.slice(0, 3)
}
