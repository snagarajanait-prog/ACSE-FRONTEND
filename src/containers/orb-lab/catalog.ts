/**
 * The candidate list, kept out of `variants.tsx` so that file exports nothing
 * but components — otherwise React Fast Refresh gives up on the whole module
 * and every orb tweak costs a full page reload, which is exactly the loop this
 * screen exists to make fast.
 *
 * DEMO SCOPE — see the note at the top of `orbs.css`.
 */

import AssistantOrb from '@/components/AssistantOrb'
import AssistantOrb3D from '@/components/AssistantOrb3D'
import AssistantOrbParticles from '@/components/AssistantOrbParticles'
import {
  OrbBlob,
  OrbBreathe,
  OrbIridescent,
  OrbPlasma,
  OrbSonar,
  OrbWireframe,
  type OrbProps,
} from './variants'

export interface OrbVariant {
  id: string
  name: string
  /** What it says about the product — the thing to judge, not the technique. */
  note: string
  /**
   * Multiplier from "sphere diameter I asked for" to the component's `size`.
   *
   * The WebGL orb's `size` is its canvas box, of which the lit sphere fills 72%
   * and the rest carries the glow. Without this the 3D orb would be compared at
   * 72% the diameter of every CSS orb beside it and lose on presence alone.
   */
  scale?: number
  Component: (props: OrbProps) => React.JSX.Element
}

export const ORB_VARIANTS: OrbVariant[] = [
  {
    id: 'webgl',
    name: '9 · WebGL 3D  ★ live',
    note: 'Real shader sphere: warped-noise energy, fresnel rim, bloom. Currently in the drawer hero.',
    scale: 1 / 0.72,
    Component: AssistantOrb3D,
  },
  {
    id: 'orbit',
    name: '3 · Orbit  ✓ chosen',
    note: 'Core plus rings spinning on three planes. Your pick; still the WebGL fallback.',
    Component: AssistantOrb,
  },
  {
    id: 'breathe',
    name: '1 · Breathe',
    note: 'The original orb. Calm and cheap, but static enough to read as a decorative dot.',
    Component: OrbBreathe,
  },
  {
    id: 'plasma',
    name: '2 · Plasma',
    note: 'Light churning inside glass. Feels alive and "thinking" without any literal metaphor.',
    Component: OrbPlasma,
  },
  {
    id: 'particles',
    name: '4 · Particles  ★ live',
    note: 'A true 3D point cloud on a slow turn. Says "data" and "model" more than the others. Now in the full-page copilot hero.',
    Component: AssistantOrbParticles,
  },
  {
    id: 'wireframe',
    name: '5 · Wireframe',
    note: 'Lat/long globe with a scan line. Strong utility read; fits a service/coverage product.',
    Component: OrbWireframe,
  },
  {
    id: 'blob',
    name: '6 · Blob',
    note: 'Organic liquid morph. The friendliest and most assistant-like; least corporate.',
    Component: OrbBlob,
  },
  {
    id: 'sonar',
    name: '7 · Sonar',
    note: 'Sphere emitting rings. Reads as actively listening — strongest invitation to speak.',
    Component: OrbSonar,
  },
  {
    id: 'iridescent',
    name: '8 · Iridescent',
    note: 'Glass bead with a colour sheen. Most premium, but pulls outside the brand palette.',
    Component: OrbIridescent,
  },
]
