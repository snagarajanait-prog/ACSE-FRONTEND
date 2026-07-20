/**
 * The branded entry moment — the logo assembly, played once when the app boots.
 *
 * Why this exists as its own thing rather than just being the <Suspense>
 * fallback: React owns how long a fallback stays mounted, and a lazy route
 * chunk resolves in a few hundred milliseconds. The fallback was being torn
 * down while the cloud was still off-screen, so in practice nobody ever saw the
 * loader. Time here is held by THIS component instead, so the assembly is
 * guaranteed to play through regardless of how fast the chunk arrives.
 *
 * It runs on app boot only. Mounted above the router, it never sees a client
 * navigation, so moving between screens doesn't replay it — a full page load
 * does.
 */

import { useEffect, useState } from 'react'
import GlobalLoader from '@/components/GlobalLoader'
import { ASSEMBLY_DURATION_MS } from '@/components/LogoAssembly'

/**
 * Long enough for the lockup to finish assembling and for one highlight to
 * sweep through it — cutting it at the assembly leaves the mark feeling
 * unfinished. The exit animation plays on top of this.
 */
const BOOT_SPLASH_MS = ASSEMBLY_DURATION_MS + 640

export interface BootSplashProps {
  /** Escape hatch for tuning or for screens that want to skip the splash. */
  durationMs?: number
}

export default function BootSplash({ durationMs = BOOT_SPLASH_MS }: BootSplashProps) {
  const [visible, setVisible] = useState(true)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), durationMs)
    return () => clearTimeout(timer)
  }, [durationMs])

  if (finished) return null

  return <GlobalLoader visible={visible} onExited={() => setFinished(true)} />
}
