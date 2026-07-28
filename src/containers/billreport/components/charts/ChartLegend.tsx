/**
 * The key that says what each mark means.
 *
 * One implementation for every chart on the screen, including the ones that are
 * not wrapped in a `ChartFrame` — the panel charts previously had no key at all,
 * which left the reader to infer that dark-cyan meant "you" and gray meant
 * "everyone else". That inference is usually right and should never have been
 * required.
 *
 * Emphasis charts get a legend too, even though they are technically one series.
 * The spec's "a single series needs no legend" assumes the single series IS the
 * subject; an emphasis chart has a subject AND a context, and which is which is
 * exactly what a reader needs told.
 */

import { cn } from '@/utils/cn'

export interface LegendItem {
  label: string
  /** A CSS colour — normally `var(--viz-accent)` or `var(--viz-context)`. */
  color: string
  /** Lines get a rule, everything else a block. */
  shape?: 'line' | 'block'
}

export default function ChartLegend({
  items,
  className,
}: {
  items: LegendItem[]
  className?: string
}) {
  if (!items.length) return null
  return (
    <ul className={cn('viz-root flex flex-wrap items-center gap-x-3.5 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'shrink-0 rounded-full',
              item.shape === 'line' ? 'h-0.5 w-4' : 'h-2.5 w-2.5',
            )}
            style={{ background: item.color }}
          />
          {/* Text wears an ink token, never the series colour — the swatch
              beside it is what carries the identity. */}
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  )
}
