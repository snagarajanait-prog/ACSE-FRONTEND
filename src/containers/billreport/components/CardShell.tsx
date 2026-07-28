/**
 * The frame every analysis card wears, and the provenance chip that rides its
 * header.
 *
 * The chip is the point. Nine figures in this report are reported by the utility
 * and the rest are computed from them, and a demo that lets a modeled dollar
 * amount pass for a billed one is worse than a demo with fewer numbers. So
 * `origin` is a required prop: a card cannot be written without saying where its
 * numbers came from.
 */

import type { ReactNode } from 'react'
import { FileText, Sigma } from 'lucide-react'
import { cn } from '@/utils/cn'

export type Origin = 'bill' | 'modeled' | 'mixed'

const ORIGIN_META: Record<Origin, { label: string; Icon: typeof FileText; className: string }> = {
  bill: {
    label: 'From the bill',
    Icon: FileText,
    className:
      'bg-brand-cyan/10 text-[#0f5b7c] ring-brand-cyan/25 dark:bg-brand-cyan/15 dark:text-brand-cyan dark:ring-brand-cyan/30',
  },
  modeled: {
    label: 'Modeled',
    Icon: Sigma,
    className:
      'bg-slate-100 text-slate-600 ring-slate-300/70 dark:bg-white/[0.07] dark:text-slate-300 dark:ring-white/15',
  },
  mixed: {
    label: 'Bill + model',
    Icon: Sigma,
    className:
      'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/25',
  },
}

export function OriginChip({ origin, className }: { origin: Origin; className?: string }) {
  const { label, Icon, className: tone } = ORIGIN_META[origin]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
        tone,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

interface CardShellProps {
  /** The icon chip at the card's head. */
  icon: typeof FileText
  title: string
  /** One line saying what the card answers. */
  kicker?: string
  origin: Origin
  children: ReactNode
  /** A tinted strip closing the card — the takeaway, not a repeat of the data. */
  footer?: ReactNode
  className?: string
}

export default function CardShell({
  icon: Icon,
  title,
  kicker,
  origin,
  children,
  footer,
  className,
}: CardShellProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10 dark:backdrop-blur-xl',
        className,
      )}
    >
      <header className="flex items-start gap-2.5 px-4 pb-3 pt-3.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-[#0f5b7c] text-white shadow-sm dark:shadow-none">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[13.5px] font-semibold leading-tight text-brand-navy dark:text-slate-100">
              {title}
            </h3>
            <OriginChip origin={origin} />
          </div>
          {kicker && (
            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
              {kicker}
            </p>
          )}
        </div>
      </header>

      <div className="px-4 pb-4">{children}</div>

      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-[12px] leading-relaxed text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-300">
          {footer}
        </div>
      )}
    </section>
  )
}

/**
 * A labelled figure inside a card body — used where a full stat tile would be
 * too much furniture (inside a footer, beside a chart).
 */
export function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warning'
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-[15px] font-bold leading-none',
          tone === 'good' && 'text-emerald-700 dark:text-emerald-400',
          tone === 'warning' && 'text-amber-700 dark:text-amber-300',
          tone === 'default' && 'text-brand-navy dark:text-slate-100',
        )}
      >
        {value}
      </p>
    </div>
  )
}
