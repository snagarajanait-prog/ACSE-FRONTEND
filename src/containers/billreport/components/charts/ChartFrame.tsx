/**
 * The box every chart sits in — title, optional legend, the plot, and the table
 * view that backs it.
 *
 * The table is not a nicety. Several of these charts direct-label marks that sit
 * under 3:1 against their surface (the de-emphasis gray in light mode), and the
 * relief for that is exactly this: a visible label plus a WCAG-clean table twin.
 * Making the frame own it means no chart can be added without one.
 *
 * `.viz-root` is stamped here, so the palette variables resolve for everything
 * inside and no chart has to remember to opt in.
 */

import { useId, useState, type ReactNode } from 'react'
import { Table2, X } from 'lucide-react'
import ChartLegend, { type LegendItem } from '@/containers/billreport/components/charts/ChartLegend'
import { cn } from '@/utils/cn'

export type SeriesKey = LegendItem

export interface TableView {
  columns: string[]
  rows: (string | number)[][]
  /** Marks a row as the subject, so the reader finds it without counting. */
  highlightRow?: number
}

interface ChartFrameProps {
  title: string
  subtitle?: string
  /** Present for two or more series; a single series is named by the title. */
  series?: SeriesKey[]
  table: TableView
  /** Sits under the plot — the "so what" line. */
  footnote?: ReactNode
  children: ReactNode
  className?: string
}

export default function ChartFrame({
  title,
  subtitle,
  series,
  table,
  footnote,
  children,
  className,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()

  return (
    <figure className={cn('viz-root m-0', className)}>
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-brand-navy dark:text-slate-100">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          aria-controls={tableId}
          title={showTable ? 'Back to the chart' : 'Read the values as a table'}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10 dark:hover:text-white"
        >
          {showTable ? <X className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          <span className="sr-only">{showTable ? 'Hide the table' : 'Show the table'}</span>
        </button>
      </figcaption>

      {/* Every chart carries a legend — identity must never rest on
          colour-matching alone. Rendered by the shared `ChartLegend` so the
          framed charts and the bare panel charts key themselves identically. */}
      {series && series.length > 0 && !showTable && (
        <ChartLegend items={series} className="mb-3" />
      )}

      <div id={tableId}>{showTable ? <ValueTable {...table} /> : children}</div>

      {footnote && !showTable && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {footnote}
        </p>
      )}
    </figure>
  )
}

/** The WCAG-clean twin. Numbers align, so `tabular-nums` belongs here. */
function ValueTable({ columns, rows, highlightRow }: TableView) {
  return (
    <div className="scrollbar-slim -mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-left text-[12px]">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  'border-b border-slate-200 pb-1.5 pr-3 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400',
                  i > 0 && 'text-right',
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={cn(
                'border-b border-slate-100 last:border-0 dark:border-white/[0.06]',
                ri === highlightRow && 'bg-brand-cyan/[0.06] dark:bg-brand-cyan/10',
              )}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'py-1.5 pr-3',
                    ci === 0
                      ? 'font-medium text-brand-navy dark:text-slate-100'
                      : 'text-right tabular-nums text-slate-600 dark:text-slate-300',
                    ri === highlightRow && 'font-semibold',
                  )}
                >
                  {typeof cell === 'number' ? cell.toLocaleString() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
