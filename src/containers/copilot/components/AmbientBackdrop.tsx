/**
 * The page's ambient wash.
 *
 * Both palettes share the two drifting brand gradients (dialled up on dark); the
 * dot grid and the vignette that sink the page into navy are dark-only, so they
 * are faded out rather than conditionally rendered — that keeps the transition
 * between palettes continuous instead of popping.
 */

export default function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-6%,rgba(44,165,217,0.12),transparent_66%)] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(60%_55%_at_50%_-12%,rgba(44,165,217,0.20),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(42%_40%_at_100%_100%,rgba(227,57,53,0.05),transparent_70%)] [animation-delay:-8s] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(40%_40%_at_100%_100%,rgba(227,57,53,0.08),transparent_70%)]" />
      <div className="brand-dot-grid absolute inset-0 opacity-0 transition-opacity dark:opacity-[0.35]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_45%,#0d1b2a_100%)] opacity-0 transition-opacity dark:opacity-100" />
    </div>
  )
}
