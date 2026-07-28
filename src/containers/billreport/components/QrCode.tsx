/**
 * A QR code as a CSS grid of divs.
 *
 * Not a canvas and not an <img>. A canvas would need a ref, an effect and a
 * device-pixel-ratio dance to stay crisp on a retina screen, and a data-URI
 * image would need the same raster produced somewhere. A grid of background
 * colours is resolution-independent for free, inherits the theme tokens, and
 * prints from the browser at whatever the printer's resolution happens to be.
 *
 * A version-3 symbol is 29×29, so this mounts ~840 divs. That sounds worse than
 * it is — they are static, never re-render, and cost about the same as one small
 * icon set. If a call site ever needs a much larger symbol, that is the point to
 * reach for a canvas, not before.
 *
 * The quiet zone is part of the component and not the caller's problem. Four
 * modules of surface on every side is what the standard requires, and a code
 * butted against a coloured panel is the classic reason a phone will not lock on.
 */

import { useMemo } from 'react'
import { qrMatrix } from '@/utils/qr'
import { cn } from '@/utils/cn'

interface QrCodeProps {
  /** What the code encodes. Keep it short — this is sized for links. */
  value: string
  /** Total edge length in px, quiet zone included. */
  size?: number
  /** Printed under the code, as the report prints EASY LOGIN under its own. */
  caption?: string
  className?: string
}

/** Modules of surface on each side. Four is the standard's minimum. */
const QUIET = 4

export default function QrCode({ value, size = 96, caption, className }: QrCodeProps) {
  const matrix = useMemo(() => qrMatrix(value), [value])
  const modules = matrix.length
  const total = modules + QUIET * 2

  return (
    <figure className={cn('m-0 flex flex-col items-center gap-1.5', className)}>
      <div
        // The code is decoration to a screen reader — the caption and the link
        // beside it carry the meaning, and reading out 841 modules would not.
        aria-hidden
        className="rounded-md bg-white p-0 shadow-sm ring-1 ring-slate-200 dark:ring-white/15"
        style={{
          display: 'grid',
          // Tracks count MODULES, not `total` — the quiet zone is the padding
          // below, so the content box is already the symbol's own width.
          gridTemplateColumns: `repeat(${modules}, 1fr)`,
          gridTemplateRows: `repeat(${modules}, 1fr)`,
          width: size,
          height: size,
          // The quiet zone is drawn as padding in the same white the modules sit
          // on, so the code keeps its margin on a tinted panel or in dark mode.
          padding: (size * QUIET) / total,
          background: '#ffffff',
        }}
      >
        {matrix.flatMap((row, r) =>
          row.map((on, c) => (
            <span
              key={`${r}-${c}`}
              style={{ background: on ? '#0a1e35' : 'transparent' }}
            />
          )),
        )}
      </div>
      {caption && (
        <figcaption className="text-[9px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
