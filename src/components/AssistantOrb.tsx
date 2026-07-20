/**
 * The assistant orb — the ACSE AI presence mark.
 *
 * A lit core inside three rings, each tilted to its own plane and spinning at
 * its own rate. It stands in for the assistant wherever the assistant speaks
 * first: the full-page copilot hero and the drawer hero.
 *
 * Geometry lives in `index.css` (`.assistant-orb*`) and scales off `--orb-size`,
 * so a caller changes one number rather than restating a layout. The spins are
 * `motion-safe:` here rather than baked into those classes, matching how the
 * rest of the app gates motion — and the global reduced-motion rule in
 * `index.css` catches anything that slips past, leaving a still, correct orb.
 *
 * Decorative by definition: every caller pairs it with a real heading, so it is
 * `aria-hidden` and contributes nothing to the accessibility tree.
 */

import { cn } from '@/utils/cn'

export interface AssistantOrbProps {
  /** Rendered size in px. Page hero uses 64, drawer hero 56. */
  size?: number
  className?: string
}

export default function AssistantOrb({ size = 64, className }: AssistantOrbProps) {
  return (
    <span
      aria-hidden
      className={cn('assistant-orb block', className)}
      style={{ '--orb-size': `${size}px` } as React.CSSProperties}
    >
      <span className="assistant-orb-core motion-safe:animate-orb-core-pulse" />
      <span className="assistant-orb-ring motion-safe:animate-orb-spin-x" />
      <span className="assistant-orb-ring motion-safe:animate-orb-spin-y" />
      <span className="assistant-orb-ring assistant-orb-ring-faint motion-safe:animate-orb-spin-z" />
    </span>
  )
}
