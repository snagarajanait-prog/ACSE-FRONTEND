/**
 * The assistant orb, particle-cloud treatment — the ACSE AI presence mark.
 *
 * A sphere of lit points on a slow turn, over a soft haze that keeps it reading
 * as a body rather than a hollow shell. Chosen out of the orb lab (variant 4)
 * for the full-page copilot hero; the drawer still runs the WebGL orb.
 *
 * Points are placed by the Fibonacci lattice: walking the golden angle while
 * stepping y linearly from +1 to -1 distributes them near-evenly over the
 * sphere, which the naive lat/long nesting does not — that one bunches points at
 * the poles and reads as a lantern. Positions are computed once at module load
 * and the sphere turns via a single `rotateY` on the `preserve-3d` stage, so no
 * JS runs per frame.
 *
 * Geometry lives in `index.css` (`.assistant-orb-particles*`) and scales off
 * `--orb-size`, so a caller changes one number rather than restating a layout.
 * The animations are `motion-safe:` here rather than baked into those classes,
 * matching how the rest of the app gates motion — and the global reduced-motion
 * rule in `index.css` catches anything that slips past, leaving a still sphere.
 *
 * Decorative by definition: every caller pairs it with a real heading, so it is
 * `aria-hidden` and contributes nothing to the accessibility tree.
 */

import { cn } from '@/utils/cn'

export interface AssistantOrbParticlesProps {
  /** Rendered size in px — the sphere fills the box. Copilot hero uses 80. */
  size?: number
  className?: string
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const PARTICLE_COUNT = 54

/** Unit-sphere positions, scaled to `--orb-size` at render. */
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2
  const radius = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = i * GOLDEN_ANGLE
  return {
    x: Math.cos(theta) * radius,
    y,
    z: Math.sin(theta) * radius,
    // Spread the twinkle across the period so the cloud shimmers continuously.
    delay: (i % 12) * 0.25,
  }
})

export default function AssistantOrbParticles({
  size = 80,
  className,
}: AssistantOrbParticlesProps) {
  return (
    <span
      aria-hidden
      className={cn('assistant-orb-particles block', className)}
      style={{ '--orb-size': `${size}px` } as React.CSSProperties}
    >
      <span className="assistant-orb-particles-haze motion-safe:animate-orb-breathe" />
      <span className="assistant-orb-particles-stage motion-safe:animate-orb-spin-globe">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="assistant-orb-particle motion-safe:animate-orb-twinkle"
            style={{
              transform: `translate3d(calc(var(--orb-size) * ${(p.x * 0.46).toFixed(4)}), calc(var(--orb-size) * ${(p.y * 0.46).toFixed(4)}), calc(var(--orb-size) * ${(p.z * 0.46).toFixed(4)}))`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </span>
    </span>
  )
}
