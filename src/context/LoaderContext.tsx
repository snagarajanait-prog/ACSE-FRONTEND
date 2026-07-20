/**
 * Global loader provider — owns whether the app-wide loading screen is up.
 *
 * Two behaviours make this more than a boolean, and both exist to stop the
 * loader being annoying:
 *
 *   1. Holds are REF-COUNTED. Two concurrent callers can each show/hide without
 *      the first one to finish yanking the overlay out from under the second.
 *   2. The overlay is rate-limited at both ends. It doesn't appear until a task
 *      has run past SHOW_DELAY_MS — so quick work never flashes an overlay — and
 *      once up it stays for MIN_VISIBLE_MS so it can't appear and leave inside a
 *      couple of frames.
 *
 * Suspense doesn't come through here: React mounts and unmounts the fallback
 * itself, so `App.tsx` renders <GlobalLoader /> directly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import GlobalLoader from '@/components/GlobalLoader'
import { ASSEMBLY_DURATION_MS } from '@/components/LogoAssembly'
import { LoaderContext } from '@/context/loader.context'

/** Work faster than this never shows a loader at all. */
const SHOW_DELAY_MS = 180

/**
 * Once shown, hold for a full assembly. The logo flying together is the point of
 * this screen — cutting it at 400ms shows a half-built lockup, which reads as a
 * glitch rather than a brand moment.
 */
const MIN_VISIBLE_MS = ASSEMBLY_DURATION_MS

export function LoaderProvider({ children }: { children: ReactNode }) {
  // `runId` keys the overlay: a fresh id remounts GlobalLoader, which is what
  // replays the assembly. Without it, a show() that lands while the previous
  // overlay is still exiting would reuse the mounted instance and reveal an
  // already-assembled logo with no entrance.
  const [overlay, setOverlay] = useState<{ runId: number; visible: boolean; message?: string } | null>(null)

  const runId = useRef(0)
  const holds = useRef(0)
  const shownAt = useRef(0)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    showTimer.current = null
    hideTimer.current = null
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const show = useCallback((message?: string) => {
    holds.current += 1
    if (holds.current > 1) {
      // Already showing (or pending) — a later caller may still retitle it.
      if (message) setOverlay((current) => (current ? { ...current, message } : current))
      return
    }

    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }

    showTimer.current = setTimeout(() => {
      // Clearing the ref is load-bearing, not tidiness: `hide()` reads it to tell
      // "still waiting to appear" from "already on screen". Leaving a spent id
      // here makes every hide take the never-painted path and rips the overlay
      // out with no minimum duration and no exit animation.
      showTimer.current = null
      shownAt.current = Date.now()
      runId.current += 1
      setOverlay({ runId: runId.current, visible: true, message })
    }, SHOW_DELAY_MS)
  }, [])

  const hide = useCallback(() => {
    holds.current = Math.max(0, holds.current - 1)
    if (holds.current > 0) return

    // Never made it past the show delay — drop it before anything was painted.
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
      setOverlay(null)
      return
    }

    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current))
    hideTimer.current = setTimeout(() => {
      // A new hold may have arrived while we waited out the floor.
      if (holds.current === 0) setOverlay((current) => (current ? { ...current, visible: false } : null))
    }, remaining)
  }, [])

  const withLoader = useCallback(
    async <T,>(task: () => Promise<T>, message?: string): Promise<T> => {
      show(message)
      try {
        return await task()
      } finally {
        hide()
      }
    },
    [show, hide],
  )

  const value = useMemo(
    () => ({ isLoading: overlay?.visible ?? false, show, hide, withLoader }),
    [overlay?.visible, show, hide, withLoader],
  )

  return (
    <LoaderContext.Provider value={value}>
      {children}
      {overlay && (
        <GlobalLoader
          key={overlay.runId}
          message={overlay.message}
          visible={overlay.visible}
          onExited={() =>
            // A show() can land while this exit is still playing. Only clear the
            // overlay if it is still the one that was exiting and nothing has
            // taken a new hold in the meantime.
            setOverlay((current) =>
              current && current.runId === overlay.runId && holds.current === 0 ? null : current,
            )
          }
        />
      )}
    </LoaderContext.Provider>
  )
}
