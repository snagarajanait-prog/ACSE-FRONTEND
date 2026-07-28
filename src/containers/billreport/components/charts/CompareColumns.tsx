/**
 * Before → after, as two columns with the change called out between them.
 *
 * One item, two readings, so this is the dumbbell's simpler cousin: one hue in
 * two shades — the earlier reading in a light step of the ordinal ramp, the
 * current one in the accent. Two categorical hues here would claim the two
 * periods are different *kinds* of thing rather than the same measure moved.
 *
 * The report draws this exact pair itself, which is why it keeps the
 * two-column form instead of collapsing to a stat tile.
 */

import type { ReactNode } from 'react'
import ChartTooltip from '@/containers/billreport/components/charts/ChartTooltip'
import { useChartTooltip } from '@/containers/billreport/components/charts/useChartTooltip'
import { cn } from '@/utils/cn'

export interface ColumnDatum {
  id: string
  /** The period, e.g. "May 29 – Jun 26, 2025". Wraps to two lines under the bar. */
  label: string
  value: number
  valueLabel?: string
  /** The current reading takes the accent; the rest a light step of the ramp. */
  current?: boolean
}

interface CompareColumnsProps {
  data: ColumnDatum[]
  height?: number
  /** The verdict between the columns — the change and what it means. */
  callout?: ReactNode
  className?: string
}

export default function CompareColumns({
  data,
  height = 132,
  callout,
  className,
}: CompareColumnsProps) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const { tip, onPointer, onFocusMark, hide } = useChartTooltip()

  const contentFor = (d: ColumnDatum) => ({
    rows: [
      {
        value: d.valueLabel ?? `${d.value.toLocaleString()} units`,
        label: d.label,
        color: d.current ? 'var(--viz-accent)' : 'var(--viz-ramp-1)',
      },
    ],
  })

  return (
    <div className={cn('viz-root flex items-end gap-5', className)}>
      <div className="flex shrink-0 items-end gap-4" style={{ height: height + 46 }}>
        {data.map((d, i) => {
          const h = Math.max(8, Math.round((d.value / max) * height))
          return (
            <div
              key={d.id}
              // The column plus its two captions is the hit target; the bar
              // alone is narrower than the 24px minimum on a phone.
              className="group flex w-[74px] flex-col items-center justify-end rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
              tabIndex={0}
              onPointerMove={(e) => onPointer(e, contentFor(d))}
              onPointerLeave={hide}
              onFocus={(e) => onFocusMark(e, contentFor(d))}
              onBlur={hide}
            >
              {/* Value on the cap — a column's direct label goes above it. */}
              <span
                className={cn(
                  'mb-1.5 text-[12px] tabular-nums',
                  d.current
                    ? 'font-bold text-brand-navy dark:text-slate-100'
                    : 'font-semibold text-slate-500 dark:text-slate-400',
                )}
              >
                {d.valueLabel ?? d.value.toLocaleString()}
              </span>
              <div
                // Square at the baseline, 4px rounded at the data end. Lifts on
                // hover and focus so the mark visibly answers the pointer.
                className="viz-grow-y w-full rounded-t-[4px] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                style={{
                  height: h,
                  background: d.current ? 'var(--viz-accent)' : 'var(--viz-ramp-1)',
                  animationDelay: `${i * 90}ms`,
                }}
              />
              <span className="mt-2 text-center text-[10.5px] leading-tight text-slate-500 dark:text-slate-400">
                {d.label}
              </span>
            </div>
          )
        })}
      </div>

      {callout && <div className="min-w-0 flex-1 pb-10">{callout}</div>}
      <ChartTooltip tip={tip} />
    </div>
  )
}
