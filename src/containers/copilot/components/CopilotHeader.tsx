/**
 * The copilot's top bar.
 *
 * White-label by design: the CLIENT's brand sits top-left and ACSE is credited
 * as "Powered by" on the right. Swap CLIENT_NAME (and the monogram in
 * `ClientBrand`) for the client's real name / logo artwork.
 */

import { FlaskConical, PanelLeft, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { ROUTE_PATHS } from '@/constants/constants'
import { cn } from '@/utils/cn'

const CLIENT_NAME = 'XYZ Company'

/** `shrink-0` keeps these square at 320px, where the header runs out of room. */
const ICON_BUTTON_CLASS =
  'grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'

interface CopilotHeaderProps {
  /** Whether a customer/account is in context (controls the panel + reset actions). */
  hasContext: boolean
  source: string
  sourceSystem: string
  sourceShort: string
  playing: boolean
  onOpenPanel: () => void
  onReset: () => void
}

export default function CopilotHeader({
  hasContext,
  source,
  sourceSystem,
  sourceShort,
  playing,
  onOpenPanel,
  onReset,
}: CopilotHeaderProps) {
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3 backdrop-blur-xl transition-colors sm:gap-3 md:px-6 dark:border-white/[0.06] dark:bg-brand-navydeep/60">
      <ClientBrand />

      {/* `min-w-0` lets the brand truncate instead of the controls being squeezed. */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <SourcePill source={source} system={sourceSystem} short={sourceShort} />
        <ThemeToggle className="h-8 w-8" />
        {hasContext && (
          <>
            <button
              onClick={onOpenPanel}
              className={cn(ICON_BUTTON_CLASS, 'lg:hidden')}
              aria-label="Open account details"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onReset}
              disabled={playing}
              className={cn(ICON_BUTTON_CLASS, 'disabled:opacity-40')}
              aria-label="New chat"
              title="New chat"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </>
        )}
        <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />
        <PoweredBy />
      </div>
    </header>
  )
}

/**
 * The client's own brand, top-left (white-label). The mark is a placeholder
 * monogram derived from CLIENT_NAME — replace it with an `<img>` of the client's
 * real logo when supplied.
 */
function ClientBrand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-navy text-sm font-bold text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
        {CLIENT_NAME.charAt(0)}
      </span>
      {/* Truncates rather than pushing the controls off the header on phones. */}
      <span className="truncate text-[15px] font-semibold tracking-tight text-brand-navy dark:text-slate-100">
        {CLIENT_NAME}
      </span>
    </div>
  )
}

/** "Powered by ACSE" attribution, top-right. Doubles as the way back home. */
function PoweredBy() {
  return (
    <Link
      to={ROUTE_PATHS.landing}
      title="Back to acsesolutions.com"
      // `py-2 -my-2` grows the hit area to a comfortable 36px without changing
      // how the lockup sits in the header.
      className="-my-2 flex shrink-0 items-center gap-1.5 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
    >
      <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
        Powered by
      </span>
      <Logo className="h-7" />
    </Link>
  )
}

function SourcePill({ source, system, short }: { source: string; system: string; short: string }) {
  const isLive = source === 'C2M'
  return (
    <span
      aria-label={`Assistant mode: ${system}`}
      className={cn(
        'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 sm:inline-flex',
        isLive
          ? 'bg-brand-red/5 text-brand-red ring-brand-red/25 dark:bg-brand-red/10 dark:ring-brand-red/40'
          : 'bg-brand-cyan/5 text-brand-navy ring-brand-cyan/25 dark:bg-brand-cyan/10 dark:text-brand-cyan dark:ring-brand-cyan/30',
      )}
    >
      {isLive ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-red" />
        </span>
      ) : (
        <FlaskConical className="h-3 w-3 text-brand-cyan" />
      )}
      Mode · {short}
    </span>
  )
}
