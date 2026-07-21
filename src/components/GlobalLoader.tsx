/**
 * The app-wide loading screen.
 *
 * One visual, two entry points: `App.tsx` hands it to <Suspense> for lazy route
 * chunks, and `useGlobalLoader()` shows it for imperative work (sign-in, a slow
 * mutation). Both render THIS component so a route load and a form submit never
 * look like two different products.
 *
 * On `visible === false` it doesn't unmount immediately — it plays the exit
 * first, so the overlay dissolves instead of vanishing mid-frame, and drops
 * itself on whichever comes first: the animation ending, or a fallback timer
 * (see the effect below for why the timer is not optional).
 * `useGlobalLoader` owns the matching minimum-display floor that stops a fast
 * response causing a single-frame flash.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LogoAssembly, { ASSEMBLY_DURATION_MS } from '@/components/LogoAssembly'
import { cn } from '@/utils/cn'

/** Must match the `loader-out` duration in index.css. */
const EXIT_DURATION_MS = 450

export interface GlobalLoaderProps {
  /**
   * Status line under the mark. Keep it short — it sits at small caps width.
   * Omit it to fall back to the translated "Preparing your workspace".
   */
  message?: string
  /**
   * Drives the exit. Defaults to true so the Suspense-fallback case — where the
   * fallback is simply unmounted by React — needs no extra wiring.
   */
  visible?: boolean
  /** Fired after the exit animation finishes, so a host can drop the overlay. */
  onExited?: () => void
  /**
   * Hold off painting for this long. For <Suspense>, where React decides how
   * long the fallback lives, this is what stops a chunk that resolves in 200ms
   * from flashing a half-assembled logo: nothing is painted unless the wait
   * outlasts the delay. Defaults to 0 — callers that already know they want the
   * loader (boot, imperative holds) shouldn't wait.
   */
  appearDelayMs?: number
}

export default function GlobalLoader({
  message,
  visible = true,
  onExited,
  appearDelayMs = 0,
}: GlobalLoaderProps) {
  const { t } = useTranslation('common')
  // Resolved here rather than as a default param — a default can't call a hook.
  const text = message ?? t('loader.preparing')
  const [appeared, setAppeared] = useState(appearDelayMs === 0)

  useEffect(() => {
    if (appearDelayMs === 0) return
    const timer = setTimeout(() => setAppeared(true), appearDelayMs)
    return () => clearTimeout(timer)
  }, [appearDelayMs])
  // Kept separate from `visible`: this stays true through the exit animation.
  const [mounted, setMounted] = useState(true)

  // Guards against the double-finish that `animationend` racing its own
  // fallback timer would otherwise cause. A ref, not the `mounted` state, so it
  // can't fire a side effect from inside a StrictMode-replayed state updater.
  const exited = useRef(false)

  const finish = useCallback(() => {
    if (exited.current) return
    exited.current = true
    setMounted(false)
    onExited?.()
  }, [onExited])

  useEffect(() => {
    if (visible) {
      exited.current = false
      setMounted(true)
      return
    }

    /**
     * `animationend` alone is not safe to hang an unmount on. A CSS animation
     * stays play-pending until the compositor produces a frame, so a stalled or
     * throttled one never fires — and this overlay covers the entire app, so
     * missing that event doesn't degrade the exit, it locks the user out.
     * Whichever of the two lands first wins; `finish` is idempotent.
     */
    const timer = setTimeout(finish, EXIT_DURATION_MS + 120)
    return () => clearTimeout(timer)
  }, [visible, finish])

  if (!mounted || !appeared) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      className={cn(
        'fixed inset-0 z-100 grid place-items-center overflow-hidden bg-background',
        !visible && 'pointer-events-none animate-loader-out',
      )}
      onAnimationEnd={(event) => {
        // Only the overlay's own exit ends the loader — the assembly and the
        // looping ambience bubble their animationend events up here too.
        if (visible || event.target !== event.currentTarget) return
        finish()
      }}
    >
      {/* Brand ambience, matching the app's own backdrop treatment. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(44,165,217,0.12),transparent_66%)] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(60%_55%_at_50%_-8%,rgba(44,165,217,0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(42%_40%_at_100%_100%,rgba(227,57,53,0.05),transparent_70%)] [animation-delay:-8s] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(40%_40%_at_100%_100%,rgba(227,57,53,0.09),transparent_70%)]" />
        <div className="brand-dot-grid absolute inset-0 opacity-0 dark:opacity-[0.35]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_45%,#0d1b2a_100%)] opacity-0 dark:opacity-100" />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center gap-8 px-6">
        <div className="relative w-full">
          {/* Glow behind the mark. Sized off the lockup so it tracks the logo
              at every breakpoint rather than needing its own media queries. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-12 -inset-y-16 rounded-full bg-[radial-gradient(circle,rgba(44,165,217,0.20),transparent_68%)] blur-2xl motion-safe:animate-loader-glow dark:bg-[radial-gradient(circle,rgba(44,165,217,0.30),transparent_68%)]"
            style={{ animationDelay: `${ASSEMBLY_DURATION_MS}ms` }}
          />
          <LogoAssembly className="relative" />
        </div>

        <div className="flex w-full flex-col items-center gap-4">
          <p
            className="flex items-center gap-2 text-center text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase motion-safe:animate-fade-in"
            style={{ animationDelay: `${ASSEMBLY_DURATION_MS}ms`, animationFillMode: 'both' }}
          >
            {text}
            <span aria-hidden className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1 rounded-full bg-brand-cyan motion-safe:animate-loader-spark"
                  style={{ animationDelay: `${ASSEMBLY_DURATION_MS + i * 180}ms` }}
                />
              ))}
            </span>
          </p>

          {/* Indeterminate rail — deliberately not a percentage, since none of
              these loads report real progress. */}
          <div
            className="h-0.5 w-40 overflow-hidden rounded-full bg-border motion-safe:animate-fade-in"
            style={{ animationDelay: `${ASSEMBLY_DURATION_MS}ms`, animationFillMode: 'both' }}
          >
            <div
              className="h-full w-full rounded-full bg-linear-to-r from-brand-cyan to-brand-red motion-safe:animate-loader-rail"
              style={{ animationDelay: `${ASSEMBLY_DURATION_MS}ms` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
