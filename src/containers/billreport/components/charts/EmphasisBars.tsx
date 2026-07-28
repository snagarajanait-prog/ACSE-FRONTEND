/**
 * Horizontal bars where one row is the story and the rest are context.
 *
 * Emphasis, not categorical: the peer comparison is not three peer identities to
 * tell apart, it is "you, against two reference lines" — so the subject takes
 * the accent and everything else takes the de-emphasis gray. The same shape
 * serves the end-use split (appliances is the subject, per the bill's own
 * smart-meter line) and the savings plan.
 *
 * A value ramp is deliberately NOT used here. End uses have no natural order, so
 * shading each bar by its own length would burn the colour channel restating the
 * bar length and would fail the categorical checks by construction.
 *
 * Values sit at the bar's tip, always OUTSIDE it, in a reserved gutter that no
 * bar may grow into. Setting them inside the mark instead is the obvious-looking
 * choice and it fails twice: white on the light context gray measures about
 * 2.6:1 in light mode, and white on the brand cyan fails the same way in dark —
 * so an "inside" label would have to pick its ink from the fill's luminance per
 * mark per theme. Reserving the gutter makes the whole problem disappear and
 * puts the number where the eye already is, at the end of the bar.
 */

import ChartTooltip from '@/containers/billreport/components/charts/ChartTooltip'
import { useChartTooltip } from '@/containers/billreport/components/charts/useChartTooltip'
import { cn } from '@/utils/cn'

export interface BarDatum {
  id: string
  label: string
  value: number
  /** Rendered at the bar's tip. Falls back to the value, thousands-separated. */
  valueLabel?: string
  /** The accent row. Everything else is context gray. */
  emphasis?: boolean
  /** A second line under the label — the share, the effort, the note. */
  caption?: string
  /** Shown on hover and focus. */
  tooltip?: string
}

interface EmphasisBarsProps {
  data: BarDatum[]
  /** Fixes the scale across bars; defaults to the largest value present. */
  max?: number
  /** Bar thickness in px. Capped at 24 — the spec's ceiling for a mark. */
  thickness?: number
  /**
   * Width held for the tip label. Narrow it in a side column, where the default
   * would leave the bars too short to compare — but never below the widest value
   * the chart renders, or the label runs off the card.
   */
  gutter?: number
  className?: string
}

/**
 * Space held to the right of every track for the tip label. Nothing draws into
 * it, so a bar at 100% still leaves its value room to sit clear of the mark.
 * Sized for the longest value these charts produce (a four-digit unit count,
 * or a count plus its share).
 */
const GUTTER = 80

export default function EmphasisBars({
  data,
  max,
  thickness = 16,
  gutter = GUTTER,
  className,
}: EmphasisBarsProps) {
  const scaleMax = max ?? Math.max(...data.map((d) => d.value), 1)
  const barH = Math.min(24, thickness)
  const { tip, onPointer, onFocusMark, hide } = useChartTooltip()

  /** What the readout says for a row — one definition for hover and focus. */
  const contentFor = (d: BarDatum) => ({
    rows: [
      {
        value: d.valueLabel ?? d.value.toLocaleString(),
        label: d.label,
        color: d.emphasis ? 'var(--viz-accent)' : 'var(--viz-context)',
      },
    ],
    note: d.tooltip,
  })

  return (
    // `viz-root` here, not just on `ChartFrame`: the palette lives in that scope,
    // and using this chart bare — as the insights column does — otherwise
    // resolves every fill to nothing and paints invisible bars.
    <ul className={cn('viz-root space-y-3', className)}>
      {data.map((d, i) => {
        const pct = scaleMax === 0 ? 0 : (d.value / scaleMax) * 100
        const color = d.emphasis ? 'var(--viz-accent)' : 'var(--viz-context)'
        const valueText = d.valueLabel ?? d.value.toLocaleString()

        return (
          <li
            key={d.id}
            // The whole row is the hit target, not the bar — a 12px mark is far
            // under the 24px minimum, and the label and caption belong to the
            // same fact. Focusable so the readout is reachable by keyboard.
            className="group relative -mx-1.5 rounded-lg px-1.5 py-1 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/[0.03]"
            tabIndex={0}
            onPointerMove={(e) => onPointer(e, contentFor(d))}
            onPointerLeave={hide}
            onFocus={(e) => onFocusMark(e, contentFor(d))}
            onBlur={hide}
          >
            <span
              className={cn(
                'block truncate text-[12.5px]',
                d.emphasis
                  ? 'font-semibold text-brand-navy dark:text-slate-100'
                  : 'font-medium text-slate-600 dark:text-slate-300',
              )}
            >
              {d.label}
            </span>

            <div className="mt-1.5" style={{ paddingRight: gutter }}>
              <div
                className="relative rounded-sm"
                style={{ height: barH, background: 'var(--viz-grid)' }}
              >
                <div
                  // Square at the baseline, 4px rounded at the data end. The
                  // hovered mark lifts, so the reader can see it responded.
                  className="viz-grow-x absolute inset-y-0 left-0 rounded-r-[4px] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                  style={{
                    width: `${Math.max(pct, d.value > 0 ? 1.5 : 0)}%`,
                    background: color,
                    animationDelay: `${i * 70}ms`,
                  }}
                />
                {/* At the tip, in the reserved gutter. Text wears an ink token —
                    the coloured bar beside it carries the identity. */}
                <span
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] tabular-nums',
                    d.emphasis
                      ? 'font-bold text-brand-navy dark:text-slate-100'
                      : 'font-semibold text-slate-500 dark:text-slate-400',
                  )}
                  style={{ left: `calc(${pct}% + 8px)` }}
                >
                  {valueText}
                </span>
              </div>
            </div>

            {d.caption && (
              <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {d.caption}
              </p>
            )}
          </li>
        )
      })}
      <ChartTooltip tip={tip} />
    </ul>
  )
}
