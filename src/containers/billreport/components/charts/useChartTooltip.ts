/**
 * State for the shared chart hover layer.
 *
 * Split from `ChartTooltip.tsx` so that file exports a component and nothing
 * else — a module mixing a component with a hook loses React Fast Refresh for
 * the component, and these are the files edited while a demo is on screen.
 */

import { useCallback, useState } from 'react'
import type { TipContent } from '@/containers/billreport/components/charts/ChartTooltip'

export interface TipState extends TipContent {
  x: number
  y: number
}

export function useChartTooltip() {
  const [tip, setTip] = useState<TipState | null>(null)

  const showAt = useCallback((x: number, y: number, content: TipContent) => {
    setTip({ x, y, ...content })
  }, [])

  /** From a pointer event — the readout follows the cursor. */
  const onPointer = useCallback(
    (e: { clientX: number; clientY: number }, content: TipContent) =>
      showAt(e.clientX, e.clientY, content),
    [showAt],
  )

  /**
   * From a focus event — anchored to the top-centre of the focused mark, since
   * a focus event carries no coordinates of its own. This is what gives the
   * keyboard the same readout the pointer gets.
   */
  const onFocusMark = useCallback(
    (e: { currentTarget: Element }, content: TipContent) => {
      const r = e.currentTarget.getBoundingClientRect()
      showAt(r.left + r.width / 2, r.top, content)
    },
    [showAt],
  )

  const hide = useCallback(() => setTip(null), [])

  return { tip, showAt, onPointer, onFocusMark, hide }
}
