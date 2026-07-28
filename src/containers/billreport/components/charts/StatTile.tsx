/**
 * The stat tile and the KPI row it lives in.
 *
 * Most of what this report has to say is a single number, and a single number is
 * not a one-bar bar chart — it is a tile. Contract: label · value · optional
 * signed delta against a named period · optional 12-point sparkline with the
 * current period in the accent.
 *
 * `tone` is a status, so it always ships with a word or an icon somewhere in the
 * tile; it never leaves the colour to do the talking on its own.
 */

import type { ReactNode } from 'react'
import Sparkline from '@/containers/billreport/components/charts/Sparkline'
import { cn } from '@/utils/cn'

export type StatTone = 'neutral' | 'good' | 'warning' | 'critical'

const TONE_VALUE: Record<StatTone, string> = {
  neutral: 'text-brand-navy dark:text-slate-100',
  good: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-300',
  critical: 'text-red-700 dark:text-red-400',
}

const TONE_SURFACE: Record<StatTone, string> = {
  neutral: 'bg-slate-50 ring-slate-200/70 dark:bg-white/[0.04] dark:ring-white/10',
  good: 'bg-emerald-50 ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/25',
  warning: 'bg-amber-50 ring-amber-600/20 dark:bg-amber-400/10 dark:ring-amber-400/25',
  critical: 'bg-red-50 ring-red-600/15 dark:bg-brand-red/10 dark:ring-brand-red/30',
}

export interface StatTileProps {
  label: string
  value: string
  tone?: StatTone
  /** Signed change plus the period it is measured against. */
  delta?: { text: string; good: boolean }
  /** One line of context under the value. */
  hint?: ReactNode
  /** 12 points, oldest first. The last is drawn in the accent. */
  spark?: number[]
  className?: string
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
  delta,
  hint,
  spark,
  className,
}: StatTileProps) {
  return (
    <div className={cn('viz-root rounded-xl p-3 ring-1', TONE_SURFACE[tone], className)}>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {/* Proportional figures: `tabular-nums` on a display-size number makes it
          look loose. Columns of numbers get tabular; this does not. */}
      <p className={cn('mt-1.5 text-[23px] font-bold leading-none', TONE_VALUE[tone])}>{value}</p>

      {delta && (
        <p
          className={cn(
            'mt-1.5 text-[11px] font-semibold',
            delta.good ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
          )}
        >
          {delta.text}
        </p>
      )}

      {hint && (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p>
      )}

      {spark && spark.length > 1 && (
        // The de-emphasis wash is off at 22px: at that height the fill crowds
        // the line it sits under and the tile reads as a solid block.
        <Sparkline points={spark} height={22} area={false} className="mt-2.5" />
      )}
    </div>
  )
}

/** The KPI row. Wraps to two columns on a phone rather than scrolling. */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2.5 md:grid-cols-4', className)}>{children}</div>
  )
}
