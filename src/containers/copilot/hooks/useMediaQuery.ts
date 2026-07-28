/**
 * A media query as React state.
 *
 * The screens here have layouts that are genuinely different above and below a
 * breakpoint — a docked column versus a modal sheet — and that difference has to
 * be decidable in JS, not only in CSS: a sheet left mounted past its breakpoint
 * strands a scrim over a layout that has room for the panel inline.
 *
 * Seeded synchronously from `matchMedia` so the first paint is already correct.
 * A `useState(false)` + effect would flash the small-screen layout on every load
 * of a desktop browser.
 */

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatches(mq.matches)
    // Re-read on subscribe: the query can have changed between the initial
    // render and this effect, and the listener only fires on future crossings.
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])

  return matches
}
