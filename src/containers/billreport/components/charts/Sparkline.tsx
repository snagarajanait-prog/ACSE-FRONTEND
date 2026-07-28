/**
 * A sparkline: the shape of a series, with no axes and no labels.
 *
 * Deliberately axis-less. A sparkline answers "what shape was the year" and
 * nothing more — the moment it needs a scale to be read, the data deserves the
 * full `TrendChart` instead. So it carries only the line, an optional wash, and
 * a marker on the last point to say where "now" is.
 *
 * Same marks as the trend chart it abbreviates: accent line, 10% wash, end dot
 * ringed in the surface colour. Two charts of the same series should not look
 * like two different systems.
 */

import { useRef, useState } from 'react'
import ChartTooltip from '@/containers/billreport/components/charts/ChartTooltip'
import { useChartTooltip } from '@/containers/billreport/components/charts/useChartTooltip'
import { cn } from '@/utils/cn'

interface SparklineProps {
  /** Oldest first. Needs at least two. */
  points: number[]
  height?: number
  /** The wash under the line. Off for very short strips, where it reads as fill. */
  area?: boolean
  /** A dot on the final point — "you are here". */
  marker?: boolean
  /** Accessible description. Without one the chart is hidden, as decoration. */
  label?: string
  /**
   * One caption per point, for the hover readout. Supply these and the line
   * becomes interactive; omit them and it stays a decorative strip.
   */
  pointLabels?: string[]
  /** Formats a value for the readout. Defaults to a thousands-separated number. */
  formatValue?: (v: number) => string
  /** Names the series in the readout. */
  seriesLabel?: string
  className?: string
}

export default function Sparkline({
  points,
  height = 34,
  area = true,
  marker = true,
  label,
  pointLabels,
  formatValue = (v) => v.toLocaleString(),
  seriesLabel = '',
  className,
}: SparklineProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const { tip, showAt, hide } = useChartTooltip()

  if (points.length < 2) return null

  // A 0–100 box scaled by `preserveAspectRatio="none"`, which is why every
  // stroke below carries `vectorEffect="non-scaling-stroke"` — without it a wide
  // container stretches the line into a wedge.
  const w = 100
  const h = height
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  // 2px of headroom top and bottom so the peak's stroke is not clipped.
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 4)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p).toFixed(2)}`).join(' ')
  const fill = `${line} L${w},${h} L0,${h} Z`

  /**
   * The end marker, drawn as a zero-length round-capped stroke rather than a
   * `<circle>`.
   *
   * `preserveAspectRatio="none"` scales x and y independently, and a circle
   * scaled that way is an ellipse — at these proportions a visibly squashed
   * dash, not a dot. Stroke geometry under `vector-effect="non-scaling-stroke"`
   * is resolved in screen space instead, so a round cap stays perfectly round
   * whatever the box does. Two of them give the dot its surface ring.
   */
  const mx = x(points.length - 1)
  const my = y(points[points.length - 1])
  const dot = `M${mx},${my} L${mx},${my}`

  /** The point nearest the pointer's x — nobody can aim at a 1.5px line. */
  const interactive = Boolean(pointLabels?.length)
  const pick = (clientX: number) => {
    const el = hostRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = (clientX - rect.left) / rect.width
    const i = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))))
    setHover(i)
    showAt(rect.left + (i / (points.length - 1)) * rect.width, rect.top, {
      title: pointLabels?.[i],
      rows: [{ value: formatValue(points[i]), label: seriesLabel, color: 'var(--viz-accent)' }],
    })
  }
  const clear = () => {
    setHover(null)
    hide()
  }

  const hx = hover === null ? 0 : x(hover)
  const hy = hover === null ? 0 : y(points[hover])

  return (
    <div
      ref={hostRef}
      className={cn('viz-root relative', className)}
      onPointerMove={interactive ? (e) => pick(e.clientX) : undefined}
      onPointerLeave={interactive ? clear : undefined}
      // Focusable as a whole: stepping point-by-point through twelve months adds
      // eleven tab stops for a strip whose values are already in the card above.
      tabIndex={interactive ? 0 : undefined}
      onFocus={
        interactive
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect()
              pick(r.left + r.width)
            }
          : undefined
      }
      onBlur={interactive ? clear : undefined}
    >
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      // `overflow-visible` so the end marker is not sliced in half by the right
      // edge it sits on.
      className="w-full overflow-visible"
      style={{ height }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {area && <path d={fill} fill="var(--viz-accent)" opacity={0.1} />}
      <path
        d={line}
        fill="none"
        stroke="var(--viz-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {marker && (
        <>
          <path
            d={dot}
            fill="none"
            stroke="var(--viz-surface)"
            strokeWidth={7}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={dot}
            fill="none"
            stroke="var(--viz-accent)"
            strokeWidth={4.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* Crosshair and hovered point. Same round-cap trick as the end marker —
          a `<circle>` here would be stretched into an ellipse. */}
      {hover !== null && (
        <>
          <line
            x1={hx}
            x2={hx}
            y1={0}
            y2={h}
            stroke="var(--viz-axis)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M${hx},${hy} L${hx},${hy}`}
            fill="none"
            stroke="var(--viz-surface)"
            strokeWidth={7}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M${hx},${hy} L${hx},${hy}`}
            fill="none"
            stroke="var(--viz-accent)"
            strokeWidth={4.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
      <ChartTooltip tip={tip} />
    </div>
  )
}
