/**
 * One bar — the subject's own reading — with benchmarks marked on it and the
 * gaps bracketed beneath.
 *
 * The peer comparison used `EmphasisBars`, three bars from zero, which is the
 * textbook emphasis form and reads perfectly well. It has one flaw in this
 * particular section: the number the section is *about* is a difference, and
 * three bars leave the reader to subtract two lengths to find it. A bullet track
 * draws the difference. The bar is this home's reading; the group average and
 * the efficient level are marks on it; the run past the last mark is its own
 * segment in the critical tone; and the brackets under it measure each gap
 * directly, so "nearly double the gap to the average" is something the reader
 * sees rather than takes on trust.
 *
 * The scale's maximum IS the subject's value, so the bar fills the track. That
 * is deliberate: a track with an empty tail invites "what would fill the rest?"
 * and there is no honest answer to it here. Zero is still the origin, so every
 * length and every bracket stays proportional.
 *
 * Two fills sharing one mark have to stay apart under CVD. Accent against
 * critical measures ΔE 13.5 (protan) in light and 15.2 in dark, and both clear
 * 3:1 against their surface — but they are also separated by a surface seam, and
 * `ChartFrame` keys both by name, so nothing here rests on colour alone.
 *
 * `EmphasisBars` stays: the end-use split and the savings plan are genuinely
 * "several rows, one of them the point", which is what that form is for.
 */

import ChartTooltip from '@/containers/billreport/components/charts/ChartTooltip'
import { useChartTooltip } from '@/containers/billreport/components/charts/useChartTooltip'
import { cn } from '@/utils/cn'

export interface TrackMark {
  id: string
  label: string
  value: number
  /** Shown on hover and focus — what this benchmark actually means. */
  tooltip?: string
}

export interface TrackGap {
  id: string
  /** The benchmark this gap is measured from. It always runs to the subject. */
  from: number
  label: string
  /** `critical` matches the overshoot fill; `muted` is the quieter annotation. */
  tone?: 'critical' | 'muted'
}

interface GapTrackProps {
  subject: { label: string; value: number }
  /** Ascending. The LAST mark is where the bar turns critical. */
  marks: TrackMark[]
  /** Brackets under the bar, narrowest first. */
  gaps?: TrackGap[]
  /** Names the two fills in the readout. */
  fills?: [string, string]
  unit?: string
  /**
   * The side-panel setting: the same chart, smaller type. Sized for a ~320px
   * column, where the default labels collide with each other. Shorten the mark
   * and gap labels to match when you set it — this does not do that for you.
   */
  compact?: boolean
  className?: string
}

/**
 * How close to an edge a label may be centred before it is anchored instead.
 * A mark at 4% with a centred label hangs half of it off the left of the plot.
 */
const EDGE = 12

/**
 * The same idea for a bracket's label. CSS cannot measure the text, so this is a
 * threshold rather than the `min(centre, right − halfWidth)` the print version
 * computes: past this midpoint a bracket is narrower than its own label, and
 * centring it would hang the tail off the right of the plot. Anchoring right
 * instead lets it overflow leftwards, into the whitespace under the bar.
 */
const BRACKET_ANCHOR = 82

export default function GapTrack({
  subject,
  marks,
  gaps = [],
  fills = ['Up to the benchmark', 'Above it'],
  unit = 'units',
  compact = false,
  className,
}: GapTrackProps) {
  const max = Math.max(subject.value, ...marks.map((m) => m.value), 1)
  const pct = (v: number) => (v / max) * 100
  const split = marks[marks.length - 1]
  const { tip, onPointer, onFocusMark, hide } = useChartTooltip()

  const fmt = (n: number) => n.toLocaleString()

  // 24px is the spec's ceiling for a mark; the compact bar goes under it and
  // wins the hit-target minimum back with `HIT` below.
  const barH = compact ? 18 : 24

  /**
   * Extends a fill's hit area 4px past the mark top and bottom, so the compact
   * bar still answers a pointer aimed at it. Cheaper than wrapping each
   * absolutely-positioned segment in a padded box of its own.
   */
  const HIT = "after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"

  // Line heights are pinned rather than left to the cascade. The readings row
  // has to be given a fixed height — its contents are absolutely positioned, so
  // it has no intrinsic one — and an inherited 1.5 leading on the subject's
  // 18px value overran that height and printed the number across the bar.
  const nameClass = cn(
    'block whitespace-nowrap font-medium uppercase leading-[1.15] tracking-[0.055em] text-slate-500 dark:text-slate-400',
    compact ? 'text-[9px]' : 'text-[10px]',
  )
  /** Tallest reading (the subject's) plus clearance, so no number touches the bar. */
  const readingsH = compact ? 31 : 38

  /** Centred on its own point, unless that would push it off an edge. */
  const anchor = (p: number) =>
    p <= EDGE
      ? { style: { left: 0 }, className: 'text-left' }
      : p >= 100 - EDGE
        ? { style: { right: 0 }, className: 'text-right' }
        : { style: { left: `${p}%`, transform: 'translateX(-50%)' }, className: 'text-center' }

  /** What the readout says for each fill — one definition for hover and focus. */
  const fillContent = (index: 0 | 1) =>
    index === 0
      ? {
          rows: [
            {
              value: `${fmt(split.value)} ${unit}`,
              label: fills[0],
              color: 'var(--viz-accent)',
            },
          ],
        }
      : {
          rows: [
            {
              value: `+${fmt(subject.value - split.value)} ${unit}`,
              label: fills[1],
              color: 'var(--viz-critical)',
            },
          ],
          note: `${fmt(subject.value)} ${unit} in total, against a benchmark of ${fmt(split.value)}.`,
        }

  return (
    // `viz-root` here and not only on `ChartFrame`: the palette lives in that
    // scope, and a bare use of this chart would otherwise paint nothing at all.
    <div className={cn('viz-root', className)}>
      {/* ------------------------- the readings, above ------------------------ */}
      <div className="relative" style={{ height: readingsH }}>
        {marks.map((m) => {
          const p = pct(m.value)
          const a = anchor(p)
          const content = {
            rows: [{ value: `${fmt(m.value)} ${unit}`, label: m.label, color: 'var(--viz-context)' }],
            note: m.tooltip,
          }
          return (
            <div
              key={m.id}
              // The reading is the hit target, not the notch beneath it — a 2px
              // notch is nowhere near the 24px minimum, and the label and the
              // mark are the same fact anyway.
              className={cn(
                'absolute top-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
                a.className,
              )}
              style={a.style}
              tabIndex={0}
              onPointerMove={(e) => onPointer(e, content)}
              onPointerLeave={hide}
              onFocus={(e) => onFocusMark(e, content)}
              onBlur={hide}
            >
              <span className={nameClass}>{m.label}</span>
              <span
                className={cn(
                  'block whitespace-nowrap font-semibold leading-[1.1] tabular-nums text-slate-600 dark:text-slate-300',
                  compact ? 'text-[12px]' : 'text-[15px]',
                )}
              >
                {fmt(m.value)}
              </span>
            </div>
          )
        })}

        {/* The subject is the reading, so it is set larger and in the ink the
            rest of the card uses for its own numbers. */}
        <div className="absolute right-0 top-0 text-right">
          <span className={nameClass}>{subject.label}</span>
          <span
            className={cn(
              'block whitespace-nowrap font-bold leading-[1.1] tabular-nums text-brand-navy dark:text-slate-100',
              compact ? 'text-[14px]' : 'text-[18px]',
            )}
          >
            {fmt(subject.value)}
          </span>
        </div>
      </div>

      {/* ------------------------------- the bar ------------------------------ */}
      {/* `origin-left` on both fills: `viz-grow-x` is a scaleX and the shared
          keyframe has no origin of its own, so the default centre origin would
          grow each segment out of its own middle. Zero is the origin of this
          chart, and the overshoot's origin is the mark it runs past. */}
      <div className="relative" style={{ height: barH }}>
        {/* Zero. For a horizontal bar the baseline is the left edge, not a rule
            underneath it. */}
        <span
          aria-hidden
          className="absolute -top-1 left-0 w-px"
          style={{ height: barH + 8, background: 'var(--viz-axis)' }}
        />

        <div
          className={cn(
            'viz-grow-x origin-left absolute inset-y-0 left-0 rounded-l-sm rounded-r-[4px] outline-none transition-[filter] hover:brightness-110 focus-visible:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan',
            HIT,
          )}
          style={{
            // Two pixels short of the mark, so the seam between the fills is the
            // surface showing through rather than a stroke drawn over them.
            width: `calc(${pct(split.value)}% - 2px)`,
            background: 'var(--viz-accent)',
          }}
          tabIndex={0}
          onPointerMove={(e) => onPointer(e, fillContent(0))}
          onPointerLeave={hide}
          onFocus={(e) => onFocusMark(e, fillContent(0))}
          onBlur={hide}
        />
        <div
          className={cn(
            'viz-grow-x origin-left absolute inset-y-0 right-0 rounded-r-[4px] outline-none transition-[filter] hover:brightness-110 focus-visible:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan',
            HIT,
          )}
          style={{
            left: `${pct(split.value)}%`,
            background: 'var(--viz-critical)',
            animationDelay: '90ms',
          }}
          tabIndex={0}
          onPointerMove={(e) => onPointer(e, fillContent(1))}
          onPointerLeave={hide}
          onFocus={(e) => onFocusMark(e, fillContent(1))}
          onBlur={hide}
        />

        {/* Interior marks are notched out of the fill in the surface colour. A
            rule drawn ON the bar is one more ink weight to read; a gap is not. */}
        {marks.slice(0, -1).map((m) => (
          <span
            key={m.id}
            aria-hidden
            className="absolute inset-y-0 w-0.5"
            style={{ left: `calc(${pct(m.value)}% - 1px)`, background: 'var(--viz-surface)' }}
          />
        ))}
      </div>

      {/* ---------------------------- the gap brackets ------------------------ */}
      {gaps.map((g) => {
        const from = pct(g.from)
        const mid = (from + 100) / 2
        const color = g.tone === 'critical' ? 'var(--viz-critical)' : 'var(--viz-ink-muted)'
        return (
          <div key={g.id} className={cn('relative', compact ? 'mt-2 h-5.5' : 'mt-2.5 h-6.5')}>
            <span
              aria-hidden
              className="absolute top-0 border-t"
              style={{ left: `${from}%`, right: 0, borderColor: color }}
            />
            <span
              aria-hidden
              className="absolute top-0 h-1.5 w-px"
              style={{ left: `${from}%`, background: color }}
            />
            <span
              aria-hidden
              className="absolute right-0 top-0 h-1.5 w-px"
              style={{ background: color }}
            />
            <span
              className={cn(
                'absolute top-2 whitespace-nowrap font-semibold leading-[1.2] tabular-nums',
                compact ? 'text-[10px]' : 'text-[11.5px]',
              )}
              style={
                mid >= BRACKET_ANCHOR
                  ? { right: 0, color }
                  : { left: `${mid}%`, transform: 'translateX(-50%)', color }
              }
            >
              {g.label}
            </span>
          </div>
        )
      })}

      <ChartTooltip tip={tip} />
    </div>
  )
}
