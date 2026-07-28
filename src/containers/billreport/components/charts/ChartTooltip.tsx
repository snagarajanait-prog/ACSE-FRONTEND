/**
 * The hover layer, shared by every chart on the screen.
 *
 * A chart on a screen is interactive by default — the readout is part of the
 * deliverable, not an upgrade. Before this the charts leaned on the native
 * `title` attribute, which waits a second, renders in the OS's own style, cannot
 * be reached by keyboard and cannot show more than one line. That is not a
 * tooltip, it is a fallback.
 *
 * Rules this follows, and why each one is here:
 *
 *   • VALUE LEADS, label follows. The legend's hierarchy inverted — by the time
 *     someone is hovering they already know which series they are on and want
 *     the number.
 *   • A LINE KEY, not a filled swatch. At tooltip density a block is data-weight
 *     ink doing a label's job.
 *   • KEYBOARD PARITY. `onFocus` shows exactly what `onPointerMove` shows,
 *     anchored to the mark's own box since a focus event carries no coordinates.
 *   • IT NEVER GATES. Everything in here is also on a direct label or in the
 *     table view, so nothing is reachable only by hovering.
 *
 * Positioned `fixed` from viewport coordinates and portalled to the body, so it
 * escapes the scrolling side panels and the cards' `overflow-hidden` instead of
 * being clipped by them.
 */

import { createPortal } from 'react-dom'
import type { TipState } from '@/containers/billreport/components/charts/useChartTooltip'

export interface TipRow {
  label: string
  value: string
  /** Keys the row to its mark. Omit for a plain note line. */
  color?: string
}

export interface TipContent {
  title?: string
  rows: TipRow[]
  /** One quiet line under the rows — the "why", not another number. */
  note?: string
}

/** Renders the current tip, or nothing. Mount once per chart. */
export default function ChartTooltip({ tip }: { tip: TipState | null }) {
  if (typeof document === 'undefined' || !tip) return null

  return createPortal(
    <div
      role="status"
      // `pointer-events-none` is load-bearing: a tooltip that follows the cursor
      // and can be hit will steal the pointer from the mark underneath it and
      // flicker itself in and out forever.
      className="pointer-events-none fixed z-[60] max-w-[240px] -translate-x-1/2 -translate-y-full rounded-lg bg-brand-navy px-2.5 py-1.5 text-white shadow-lg dark:bg-slate-800 dark:ring-1 dark:ring-white/10"
      style={{
        // Clamped to the viewport so a mark near an edge does not push the
        // readout off-screen, and lifted clear of the cursor.
        left: Math.min(Math.max(tip.x, 90), window.innerWidth - 90),
        top: Math.max(tip.y - 10, 44),
      }}
    >
      {tip.title && (
        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-white/60">
          {tip.title}
        </p>
      )}
      {tip.rows.map((row) => (
        <p key={row.label} className="flex items-baseline gap-2 whitespace-nowrap">
          {row.color && (
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 self-center rounded-full"
              style={{ background: row.color }}
            />
          )}
          {/* Value first and loud; the name is the secondary element here. */}
          <span className="text-[13px] font-bold tabular-nums">{row.value}</span>
          <span className="text-[11px] text-white/70">{row.label}</span>
        </p>
      ))}
      {tip.note && (
        <p className="mt-1 max-w-[220px] whitespace-normal text-[10.5px] leading-snug text-white/60">
          {tip.note}
        </p>
      )}
    </div>,
    document.body,
  )
}
