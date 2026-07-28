/**
 * Longer usage history + summary stats derived from an account.
 *
 * The seed data (`account.usage`) only carries the trailing six months. To let
 * the demo surface "1-year / 2-year history — how much they've used", we extend
 * that backwards to a full 24 months *deterministically* (seeded by the account
 * id) so the series is stable across renders and reloads, and so the most recent
 * six months always match the numbers the scripted storyboards talk about.
 */
import type { Account } from "@/data/customers"

export type UsageRange = "6M" | "1Y" | "2Y"
export const USAGE_RANGES: UsageRange[] = ["6M", "1Y", "2Y"]
export const RANGE_LABEL: Record<UsageRange, string> = {
  "6M": "6 months",
  "1Y": "1 year",
  "2Y": "2 years",
}
const RANGE_MONTHS: Record<UsageRange, number> = { "6M": 6, "1Y": 12, "2Y": 24 }

/** Exported for `insights.ts`, which has to name the month AFTER the last one. */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// The demo's "current" period — the newest usage month the seed data represents.
const END_MONTH = 5 // Jun
const END_YEAR = 2026

export interface HistPoint {
  /** e.g. "Jun" */
  label: string
  value: number
  year: number
  monthIndex: number
}

/**
 * FNV-1a hash → 32-bit seed.
 *
 * Exported alongside `mulberry32` because `insights.ts` derives its own figures
 * from the same account and MUST use the same seeding, or the two derived layers
 * would disagree about the same account between renders.
 */
export function seedFrom(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small deterministic PRNG (mulberry32). See `seedFrom` for why it's exported. */
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 24 monthly points, oldest → newest; the last six equal `account.usage`. */
export function fullHistory(account: Account): HistPoint[] {
  const recent = account.usage.map((u) => u.value) // 6, oldest → newest
  const nonZero = recent.filter((v) => v > 0)
  const base = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0

  const rnd = mulberry32(seedFrom(account.id))
  const earlier: number[] = []
  for (let i = 0; i < 18; i++) {
    if (base === 0) {
      earlier.push(0)
      continue
    }
    const seasonal = 1 + 0.18 * Math.sin((i / 12) * Math.PI * 2)
    const noise = 0.85 + rnd() * 0.3
    earlier.push(Math.max(0, Math.round(base * seasonal * noise)))
  }

  const values = [...earlier, ...recent] // 24, oldest → newest
  const points: HistPoint[] = []
  for (let k = 0; k < 24; k++) {
    const offsetFromEnd = 23 - k
    let mi = END_MONTH - offsetFromEnd
    let yr = END_YEAR
    while (mi < 0) {
      mi += 12
      yr -= 1
    }
    points.push({ label: MONTHS[mi], value: values[k], year: yr, monthIndex: mi })
  }
  return points
}

/** The most recent N months for the requested range. */
export function rangeSeries(account: Account, range: UsageRange): HistPoint[] {
  const all = fullHistory(account)
  return all.slice(all.length - RANGE_MONTHS[range])
}

export interface UsageStats {
  thisYear: number
  lastYear: number
  /** Year-over-year change as a %, or null when there's no prior-year baseline. */
  yoyPct: number | null
  avgMonthly: number
  peak: HistPoint | null
  total2y: number
}

export function usageStats(account: Account): UsageStats {
  const all = fullHistory(account)
  const last12 = all.slice(12)
  const prev12 = all.slice(0, 12)
  const sum = (pts: HistPoint[]) => pts.reduce((a, p) => a + p.value, 0)
  const thisYear = sum(last12)
  const lastYear = sum(prev12)
  const peak = last12.reduce<HistPoint | null>(
    (p, c) => (c.value > (p?.value ?? -1) ? c : p),
    null
  )
  return {
    thisYear,
    lastYear,
    yoyPct: lastYear > 0 ? ((thisYear - lastYear) / lastYear) * 100 : null,
    avgMonthly: Math.round(thisYear / 12),
    peak,
    total2y: thisYear + lastYear,
  }
}
