/**
 * The two legend keys used across several charts, named once.
 *
 * Split out of `ChartLegend.tsx` so that file exports a component and nothing
 * else — a module mixing a component with plain constants loses React Fast
 * Refresh for the component.
 */

import type { LegendItem } from '@/containers/billreport/components/charts/ChartLegend'

export const YOU_VS_GROUP: LegendItem[] = [
  { label: 'You', color: 'var(--viz-accent)' },
  { label: 'Comparison group', color: 'var(--viz-context)' },
]

/**
 * The peer comparison's two fills. Critical here is the status colour doing its
 * own job — the overshoot IS the adverse state — not a third series hue, and it
 * ships with this label rather than resting on the red alone.
 */
export const USE_VS_EXCESS: LegendItem[] = [
  { label: 'Up to the group average', color: 'var(--viz-accent)' },
  { label: 'Above the group average', color: 'var(--viz-critical)' },
]

export const LARGEST_VS_REST: LegendItem[] = [
  { label: 'Largest draw', color: 'var(--viz-accent)' },
  { label: 'Other end uses', color: 'var(--viz-context)' },
]
