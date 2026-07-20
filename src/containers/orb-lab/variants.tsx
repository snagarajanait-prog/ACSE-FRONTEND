/**
 * The candidate orbs, as interchangeable components.
 *
 * Every variant takes the same props and renders into the same box, so the lab
 * can lay them out side by side and the winner can be dropped into the copilot
 * hero by swapping one JSX element.
 *
 * Three of them are NOT defined here — `AssistantOrb` (Orbit) and
 * `AssistantOrbParticles` (Particles), both chosen and promoted to `index.css`,
 * plus `AssistantOrb3D` (the WebGL orb) are the real shipping components,
 * re-exported by `catalog.ts` so the lab shows what actually ships rather than
 * copies that could quietly drift from them.
 *
 * DEMO SCOPE — see the note at the top of `orbs.css`.
 */

import { cn } from '@/utils/cn'
import './orbs.css'

export interface OrbProps {
  /** Rendered size in px. The hero uses 64. */
  size?: number
  className?: string
}

type OrbStyle = React.CSSProperties & { '--orb-size': string }

function orbStyle(size: number): OrbStyle {
  return { '--orb-size': `${size}px` }
}

/** 1 — the orb that shipped before this exercise, kept as the control. */
export function OrbBreathe({ size = 64, className }: OrbProps) {
  return (
    <div className={cn('orb', className)} style={orbStyle(size)}>
      <div className="orb-layer orb-breathe-core" />
    </div>
  )
}

/** 2 — light churning inside a glass shell. */
export function OrbPlasma({ size = 64, className }: OrbProps) {
  return (
    <div className={cn('orb orb-plasma', className)} style={orbStyle(size)}>
      <div className="orb-plasma-blob" />
      <div className="orb-plasma-blob" />
      <div className="orb-plasma-blob" />
      <div className="orb-layer orb-plasma-glass" />
    </div>
  )
}

/** 5 — a latitude/longitude wireframe globe. */
const PARALLELS = [0.32, 0.62, 0.86]
const MERIDIAN_PHASES = [0, 0.33, 0.66]

export function OrbWireframe({ size = 64, className }: OrbProps) {
  return (
    <div className={cn('orb orb-wire', className)} style={orbStyle(size)}>
      <div className="orb-layer orb-wire-glow" />
      <svg className="orb-wire-svg" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" stroke="rgba(127,211,242,0.85)" strokeWidth="1.6" />
        {PARALLELS.map((ratio) => {
          const rx = 46 * Math.sqrt(Math.max(0, 1 - ratio * ratio))
          return (
            <g key={ratio}>
              <ellipse
                cx="50"
                cy={50 - 46 * ratio}
                rx={rx}
                ry={rx * 0.3}
                stroke="rgba(44,165,217,0.5)"
                strokeWidth="1"
              />
              <ellipse
                cx="50"
                cy={50 + 46 * ratio}
                rx={rx}
                ry={rx * 0.3}
                stroke="rgba(44,165,217,0.5)"
                strokeWidth="1"
              />
            </g>
          )
        })}
        <ellipse cx="50" cy="50" rx="46" ry="13" stroke="rgba(44,165,217,0.55)" strokeWidth="1" />
        {MERIDIAN_PHASES.map((phase) => (
          <ellipse
            key={phase}
            className="orb-wire-meridians"
            cx="50"
            cy="50"
            rx="46"
            ry="46"
            stroke="rgba(127,211,242,0.6)"
            strokeWidth="1.2"
            style={{ animationDelay: `${phase * -9}s` }}
          />
        ))}
        <ellipse
          className="orb-wire-scan"
          cx="50"
          cy="50"
          rx="44"
          ry="9"
          fill="rgba(127,211,242,0.22)"
          stroke="rgba(184,236,255,0.9)"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}

/** 6 — an organic morphing blob. */
export function OrbBlob({ size = 64, className }: OrbProps) {
  return (
    <div className={cn('orb orb-blob', className)} style={orbStyle(size)}>
      <div className="orb-layer orb-blob-body" />
      <div className="orb-layer orb-blob-echo" />
      <div className="orb-layer orb-blob-shine" />
    </div>
  )
}

/** 7 — a crisp sphere emitting sonar rings. */
export function OrbSonar({ size = 64, className }: OrbProps) {
  return (
    <div className={cn('orb', className)} style={orbStyle(size)}>
      <div className="orb-sonar-ring" />
      <div className="orb-sonar-ring" />
      <div className="orb-sonar-ring" />
      <div className="orb-layer orb-sonar-core" />
    </div>
  )
}

/** 8 — a glass bead with an iridescent sheen turning behind it. */
export function OrbIridescent({ size = 64, className }: OrbProps) {
  return (
    <div className={cn('orb orb-iris', className)} style={orbStyle(size)}>
      <div className="orb-layer orb-iris-sheen" />
      <div className="orb-layer orb-iris-vignette" />
      <div className="orb-layer orb-iris-shine" />
    </div>
  )
}
