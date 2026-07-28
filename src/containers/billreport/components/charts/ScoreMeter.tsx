/**
 * The efficiency score, presented the way the report does it: a hero number over
 * a three-band meter with a marker on it.
 *
 * The bands are Fair / Good / Great — the bill's own words and the bill's own
 * order — so a customer who knows their report recognises it instantly. What is
 * NOT borrowed is the red/amber/green track: a three-hue ramp for a single
 * ordered magnitude is a rainbow, and it reads as three separate judgements
 * rather than one scale. The track here is the validated single-hue ordinal
 * ramp, light to dark, so "further right is better" is legible before any label
 * is read.
 *
 * The status colour appears exactly once, on the band word, and always beside an
 * icon — a colour never carries the verdict by itself.
 */

import { CircleAlert, CircleCheck, TrendingUp } from 'lucide-react'
import ChartTooltip from '@/containers/billreport/components/charts/ChartTooltip'
import { useChartTooltip } from '@/containers/billreport/components/charts/useChartTooltip'
import type { ScoreBand } from '@/data/billReport'
import { cn } from '@/utils/cn'

interface ScoreMeterProps {
  score: number
  band: ScoreBand
  /** Change in points against the same period last year. */
  deltaPts?: number
  /** A second, ghosted marker — where the score lands once the plan is done. */
  projected?: { score: number; band: ScoreBand }
  className?: string
}

/** Band edges, matching `scoreBand()` in the data module. */
const BANDS: { name: ScoreBand; from: number; to: number; fill: string }[] = [
  { name: 'Fair', from: 0, to: 40, fill: 'var(--viz-ramp-1)' },
  { name: 'Good', from: 40, to: 70, fill: 'var(--viz-ramp-3)' },
  { name: 'Great', from: 70, to: 100, fill: 'var(--viz-ramp-5)' },
]

const BAND_STATUS: Record<ScoreBand, { color: string; Icon: typeof CircleAlert }> = {
  Fair: { color: 'var(--viz-warning)', Icon: CircleAlert },
  Good: { color: 'var(--viz-accent)', Icon: CircleCheck },
  Great: { color: 'var(--viz-good)', Icon: CircleCheck },
}

export default function ScoreMeter({
  score,
  band,
  deltaPts,
  projected,
  className,
}: ScoreMeterProps) {
  const { color, Icon } = BAND_STATUS[band]
  const { tip, onPointer, onFocusMark, hide } = useChartTooltip()

  return (
    <div className={cn('viz-root', className)}>
      <div className="flex items-end gap-3">
        {/* Hero figure: proportional digits, not tabular — at this size equal
            widths make a two-digit number look loose. */}
        <p className="text-[52px] font-bold leading-[0.85] tracking-tight text-brand-navy dark:text-slate-100">
          {score}
          <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">/100</span>
        </p>
        <div className="pb-1">
          <span
            className="inline-flex items-center gap-1 text-[13px] font-bold"
            style={{ color }}
          >
            <Icon className="h-3.5 w-3.5" />
            {band}
          </span>
          {typeof deltaPts === 'number' && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <TrendingUp
                className={cn('h-3 w-3', deltaPts >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'rotate-180 text-red-600 dark:text-red-400')}
              />
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  deltaPts >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
                )}
              >
                {deltaPts >= 0 ? '+' : ''}
                {deltaPts} pts
              </span>
              vs last year
            </p>
          )}
        </div>
      </div>

      {/* The track. Segments are separated by a 2px gap in the surface colour —
          never a stroke drawn around them. */}
      <div className="relative mt-5">
        <div className="flex h-2.5 w-full gap-0.5">
          {BANDS.map((b) => {
            const content = {
              rows: [
                { value: `${b.from}–${b.to}`, label: `${b.name} band`, color: b.fill },
              ],
              note:
                b.name === band
                  ? 'Where this home sits today.'
                  : undefined,
            }
            return (
              <div
                key={b.name}
                className="group relative h-full rounded-[2px] outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:brightness-110"
                style={{ flex: b.to - b.from, background: b.fill }}
                tabIndex={0}
                onPointerMove={(e) => onPointer(e, content)}
                onPointerLeave={hide}
                onFocus={(e) => onFocusMark(e, content)}
                onBlur={hide}
              >
                {/* The hit target, not the mark. A 10px strip is well under the
                    24px minimum, so an invisible child OVERFLOWS the band to
                    catch the pointer — padding would have been the obvious fix
                    and it collapsed the band to nothing, because this box is a
                    10px-tall flex child and 16px of padding leaves it negative. */}
                <span aria-hidden className="absolute -inset-y-2 inset-x-0" />
              </div>
            )
          })}
        </div>

        {projected && (
          <Marker
            value={projected.score}
            tone="ghost"
            label={`Plan → ${projected.score}`}
          />
        )}
        <Marker value={score} tone="solid" label={`You: ${score}`} />
      </div>

      <ChartTooltip tip={tip} />

      <div className="mt-6 flex justify-between">
        {BANDS.map((b) => (
          <span
            key={b.name}
            className={cn(
              'text-[11px]',
              b.name === band
                ? 'font-bold text-brand-navy dark:text-slate-100'
                : 'font-medium text-slate-400 dark:text-slate-500',
            )}
          >
            {b.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * The pin on the track. Clamped a hair inside both ends so a score of 0 or 100
 * keeps its whole head on the bar instead of half of it hanging off the edge.
 */
function Marker({
  value,
  tone,
  label,
}: {
  value: number
  tone: 'solid' | 'ghost'
  label: string
}) {
  const left = `${Math.min(97, Math.max(3, value))}%`
  return (
    // No tooltip here, and that is not an omission: the pin's label is printed
    // directly beneath it, so a hover readout would only repeat what is already
    // on screen. The bands behind it carry the interactive readout.
    <span className="absolute -translate-x-1/2" style={{ left, top: -5 }}>
      <span
        className={cn(
          'block h-[21px] w-[3px] rounded-full',
          tone === 'ghost' && 'opacity-45',
        )}
        style={{
          background: tone === 'solid' ? 'var(--viz-ink)' : 'var(--viz-ink-muted)',
          boxShadow: '0 0 0 2px var(--viz-surface)',
        }}
      />
      <span
        className={cn(
          'absolute left-1/2 top-[23px] -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold',
          tone === 'solid'
            ? 'text-brand-navy dark:text-slate-100'
            : 'text-slate-400 dark:text-slate-500',
        )}
      >
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
