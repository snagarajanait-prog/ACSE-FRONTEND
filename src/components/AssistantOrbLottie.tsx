/**
 * The assistant orb, played from a Lottie animation (`assets/lottie/Orb.json`).
 *
 * A designer-authored vector orb rendered by lottie-web's SVG player. The source
 * is pure shapes and gradients — no embedded images, no expressions — so it scales
 * crisply to any `size` and needs only the *light* build of the player (which
 * drops the expression engine we don't use).
 *
 * lottie-web is a heavy dependency for one decorative sphere, so it is pulled in
 * with a dynamic `import()`: the player and the animation data land in their own
 * chunk that only loads when this orb first mounts (the chat hero), never in the
 * initial bundle. This mirrors how `AssistantOrb3D` keeps its cost off the hot
 * path — a decorative element should not tax first paint.
 *
 * Good-citizen motion, same policy as the WebGL orb:
 *   - reduced-motion renders a single representative frame and holds it still;
 *   - otherwise the loop is paused whenever the orb scrolls out of view or the
 *     tab is hidden, so it never burns frames no one is watching.
 *
 * Falls back to the CSS `AssistantOrb` if the lazy chunk ever fails to load, so
 * the hero always has an orb, never a hole — the same guarantee `AssistantOrb3D`
 * makes for WebGL. The CSS orb is sized to the Lottie's ~57% core so the layout
 * around it doesn't shift on the fallback path.
 *
 * Decorative by definition: every caller pairs it with a real heading, so it is
 * `aria-hidden` and contributes nothing to the accessibility tree.
 */

import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web'
import AssistantOrb from '@/components/AssistantOrb'
import orbAnimation from '@/assets/lottie/Orb.json'
import { cn } from '@/utils/cn'

/** Share of the frame the Lottie's orb body fills; the rest is bubbles + glow. */
const CORE_RATIO = 0.57

export interface AssistantOrbLottieProps {
  /** Rendered size in px — the orb fills the square box. */
  size?: number
  className?: string
}

export default function AssistantOrbLottie({ size = 96, className }: AssistantOrbLottieProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let anim: AnimationItem | null = null
    // The import resolves a tick later; if the component unmounts first (or React
    // StrictMode's throwaway first mount does), this flag makes the late callback
    // a no-op so we never attach to a detached node or leak a player.
    let cancelled = false
    let teardownWatchers = () => {}

    import('lottie-web/build/player/lottie_light')
      .then(({ default: lottie }) => {
        if (cancelled || !hostRef.current) return

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        anim = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: true,
          autoplay: !reduced,
          animationData: orbAnimation,
          rendererSettings: {
            // The orb is the whole frame; keep it centred and uncropped at any box.
            preserveAspectRatio: 'xMidYMid meet',
            // Skip painting layers while they're fully transparent — a small render
            // saving over the loop, and harmless since they carry no content there.
            hideOnTransparent: true,
          },
        })

        if (reduced) {
          // One representative frame from the middle of the loop — the ends of a
          // loop tend to sit on a calmer pose than its centre. `animationData` is
          // parsed synchronously, so the frame count is known here already.
          anim.goToAndStop(Math.round(anim.totalFrames * 0.5), true)
          return
        }

        // Pause the loop whenever it isn't actually on screen. The observer's first
        // callback also settles the initial state, so an orb mounted below the fold
        // starts paused rather than spinning unseen.
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!anim) return
            if (entry.isIntersecting && !document.hidden) anim.play()
            else anim.pause()
          },
          { threshold: 0 },
        )
        observer.observe(host)

        const onVisibility = () => {
          if (!anim) return
          if (document.hidden) anim.pause()
          else anim.play()
        }
        document.addEventListener('visibilitychange', onVisibility)

        teardownWatchers = () => {
          observer.disconnect()
          document.removeEventListener('visibilitychange', onVisibility)
        }
      })
      .catch(() => {
        // Chunk failed to load (offline, blocked). Swap in the CSS orb rather than
        // leave a hole where the hero's focal point should be.
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      teardownWatchers()
      anim?.destroy()
      anim = null
    }
  }, [])

  if (failed) return <AssistantOrb size={Math.round(size * CORE_RATIO)} className={className} />

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn('block', className)}
      style={{ width: size, height: size }}
    />
  )
}
