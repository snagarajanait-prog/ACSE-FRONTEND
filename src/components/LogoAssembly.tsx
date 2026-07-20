/**
 * The ACSE lockup, assembled on screen from its own parts.
 *
 * The source is `ACSE SVG.svg`, the Illustrator export. It arrives already
 * structured — every path is grouped and classed by brand colour — so each part
 * of the mark is lifted straight out as its own cropped SVG by
 * `logo/pieces.tsx`. Nothing is traced, redrawn or re-typeset: the geometry on
 * screen is the artwork's own, so the reassembled lockup is exact by
 * construction.
 *
 * Each piece is an absolutely-positioned <svg> cropped to its own viewBox, laid
 * out with `left/top/width` percentages of the mark's content box. The
 * container is locked to that box's aspect ratio, so the pieces converge at any
 * size. Height is deliberately never set — each crop keeps its own ratio, so a
 * correct width implies a correct height, and setting both would let rounding
 * fight the crop.
 *
 * Animation lives on the wrapping <span>, not the SVG: CSS transforms on an SVG
 * element resolve in *user units*, so a `vw`-based travel would shrink to
 * whatever the viewBox scale happens to be. Transforming the HTML wrapper keeps
 * the choreography in screen space, where it was designed.
 *
 * The wordmark's C is blue while A, S and E are red; that's the real artwork.
 */

import silhouetteUrl from '@/assets/logo/acse-mark-silhouette.svg'
import { LOGO_ASPECT, LOGO_PIECES } from '@/components/logo/pieces'
import { cn } from '@/utils/cn'

export { LOGO_ASPECT }

/**
 * Choreography. Order is the paint order; `delay` is the entrance.
 *
 * The cloud lands first and alone — it's the mark people read as "ACSE" — then
 * the four letters arrive from four different directions, then the supporting
 * type. No piece shares a direction with its neighbour.
 */
const CHOREOGRAPHY: Record<string, { animation: string; delay: number; origin?: string }> = {
  cloud: { animation: 'motion-safe:animate-piece-drop', delay: 0 },
  'letter-a': { animation: 'motion-safe:animate-piece-in-left', delay: 260 },
  'letter-c': { animation: 'motion-safe:animate-piece-in-bottom', delay: 330 },
  'letter-s': { animation: 'motion-safe:animate-piece-in-top', delay: 400 },
  'letter-e': { animation: 'motion-safe:animate-piece-in-right', delay: 470 },
  circuit: { animation: 'motion-safe:animate-piece-trace', delay: 540 },
  solutions: { animation: 'motion-safe:animate-piece-rise', delay: 620 },
}

/** When the last piece has landed — callers use this to time what comes next. */
export const ASSEMBLY_DURATION_MS = 1320

export interface LogoAssemblyProps {
  className?: string
  /** Shifts the whole sequence, for callers staggering the lockup against other content. */
  delayMs?: number
  /** Render the finished lockup with no entrance — for static use of the mark. */
  static?: boolean
}

export default function LogoAssembly({
  className,
  delayMs = 0,
  static: isStatic = false,
}: LogoAssemblyProps) {
  return (
    <div
      role="img"
      aria-label="ACSE Solutions"
      className={cn('relative w-full', className)}
      style={{ aspectRatio: LOGO_ASPECT }}
    >
      {LOGO_PIECES.map(({ key, viewBox, left, top, width, art }) => {
        const step = CHOREOGRAPHY[key]
        return (
          <span
            key={key}
            aria-hidden
            className={cn('absolute block', !isStatic && step?.animation)}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              animationDelay: isStatic ? undefined : `${(step?.delay ?? 0) + delayMs}ms`,
              transformOrigin: step?.origin,
            }}
          >
            <svg viewBox={viewBox} className="block h-auto w-full overflow-visible">
              {art}
            </svg>
          </span>
        )
      })}

      {/*
        A highlight travelling through the mark. `mask-image` is a silhouette of
        the whole lockup cropped to the same content box, so the sweep only
        paints where there is ink — light moving through the letters rather than
        a band crossing a rectangle. It waits for the assembly to land, or it
        would light up space the pieces haven't reached yet.
      */}
      {!isStatic && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 motion-safe:animate-loader-sweep motion-reduce:hidden"
          style={{
            animationDelay: `${ASSEMBLY_DURATION_MS + delayMs}ms`,
            // Intensity lives in the gradient's alpha, not an opacity utility —
            // the keyframe animates opacity, so a base opacity would be overridden.
            backgroundImage:
              'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.62) 50%, transparent 62%)',
            backgroundSize: '250% 100%',
            backgroundRepeat: 'no-repeat',
            maskImage: `url(${silhouetteUrl})`,
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: `url(${silhouetteUrl})`,
            WebkitMaskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
      )}
    </div>
  )
}
