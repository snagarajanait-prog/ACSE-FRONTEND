/**
 * Twelve months of usage: this household against the comparison group.
 *
 * Two series, one axis. The temptation with "units" and "dollars" on the same
 * picture is a second y-scale — that is the single worst thing a chart can do,
 * because the alignment of the two scales is arbitrary and invents a
 * correlation. Dollars live in their own card instead.
 *
 * Rendered at real pixel coordinates from a measured container rather than a
 * scaled viewBox: a `preserveAspectRatio="none"` viewBox stretches strokes and
 * type along with the geometry, and at these sizes that is immediately visible.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MonthPoint } from '@/data/billReport'
import { cn } from '@/utils/cn'

interface TrendChartProps {
  data: MonthPoint[]
  height?: number
  className?: string
}

const PAD = { top: 14, right: 46, bottom: 24, left: 34 }
/** Ticks are rounded to clean numbers — they carry every value not directly labeled. */
const TICK_STEP = 800

export default function TrendChart({ data, height = 190, className }: TrendChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  // Measure, then track. `useLayoutEffect` for the first read so the chart never
  // paints once at zero width and then jumps.
  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    setWidth(el.clientWidth)
  }, [])

  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom

  const peak = Math.max(...data.map((d) => Math.max(d.you, d.similar)))
  const yMax = Math.ceil(peak / TICK_STEP) * TICK_STEP
  const ticks = Array.from({ length: yMax / TICK_STEP + 1 }, (_, i) => i * TICK_STEP)

  const x = (i: number) => PAD.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH

  const line = (key: 'you' | 'similar') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')

  const area = `${line('you')} L${x(data.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`

  const last = data[data.length - 1]
  const active = hover === null ? null : data[hover]

  /** Nearest index to the pointer, so the whole plot is one big hit target. */
  function pick(clientX: number) {
    const el = hostRef.current
    if (!el || plotW <= 0) return
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left - PAD.left) / plotW
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))))
  }

  return (
    // `viz-root` so the chart carries its own palette scope and stays usable
    // outside `ChartFrame` — see the note in `EmphasisBars`.
    <div ref={hostRef} className={cn('viz-root relative w-full', className)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Monthly energy use from ${data[0].label} ${data[0].year} to ${last.label} ${last.year}, this home against similar homes`}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y"
        >
          {/* Grid — solid hairlines, one step off the surface, never dashed. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--viz-grid)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={PAD.left - 7}
                y={y(t) + 3.5}
                textAnchor="end"
                className="tabular-nums"
                fontSize={9.5}
                fill="var(--viz-ink-muted)"
              >
                {t.toLocaleString()}
              </text>
            </g>
          ))}

          {/* Area wash under the subject only — a 10% tint, never a solid block. */}
          <path d={area} fill="var(--viz-accent)" opacity={0.1} />

          <path
            d={line('similar')}
            fill="none"
            stroke="var(--viz-context)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={line('you')}
            fill="none"
            stroke="var(--viz-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair. A solid hairline, and only while pointing. */}
          {active && (
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--viz-axis)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          )}

          {/* End markers, each with a 2px surface ring so they stay legible
              where the two series cross. */}
          {(['similar', 'you'] as const).map((key) => (
            <circle
              key={key}
              cx={x(data.length - 1)}
              cy={y(last[key])}
              r={4.5}
              fill={key === 'you' ? 'var(--viz-accent)' : 'var(--viz-context)'}
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          ))}

          {active && (
            <circle
              cx={x(hover!)}
              cy={y(active.you)}
              r={4.5}
              fill="var(--viz-accent)"
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          )}

          {/* Direct end labels — the endpoint only, never a number per point.
              Text wears ink tokens; the coloured dot beside it carries identity. */}
          <text
            x={x(data.length - 1) + 8}
            y={y(last.you) + 3.5}
            fontSize={10.5}
            fontWeight={700}
            className="tabular-nums"
            fill="var(--viz-ink)"
          >
            {last.you.toLocaleString()}
          </text>
          <text
            x={x(data.length - 1) + 8}
            y={y(last.similar) + 3.5}
            fontSize={10.5}
            fontWeight={600}
            className="tabular-nums"
            fill="var(--viz-ink-muted)"
          >
            {last.similar.toLocaleString()}
          </text>

          {/* Month ticks. Every other label, so they never collide at phone width. */}
          {data.map((d, i) =>
            i % 2 === 0 || i === data.length - 1 ? (
              <text
                key={`${d.label}-${d.year}`}
                x={x(i)}
                y={height - 7}
                textAnchor={i === data.length - 1 ? 'end' : 'middle'}
                fontSize={9.5}
                fill="var(--viz-ink-muted)"
              >
                {d.label}
              </text>
            ) : null,
          )}
        </svg>
      )}

      {/* Tooltip. It enhances — every value here is also in the table view. */}
      {active && width > 0 && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-brand-navy px-2.5 py-1.5 text-white shadow-lg dark:bg-slate-800 dark:ring-1 dark:ring-white/10"
          style={{
            left: Math.min(Math.max(x(hover!), 60), width - 60),
            top: 0,
          }}
        >
          <p className="text-[10.5px] font-semibold">
            {active.label} {active.year}
            {active.reported && <span className="ml-1 font-normal text-brand-cyan">· reported</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--viz-accent)' }} />
            You <span className="ml-auto font-bold tabular-nums">{active.you.toLocaleString()}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[10.5px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--viz-context)' }} />
            Similar{' '}
            <span className="ml-auto font-bold tabular-nums">{active.similar.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  )
}
