/**
 * The full-width bar across the top of the admin panel.
 *
 * White-label, same convention as the copilot header: the CLIENT's brand sits
 * top-left (a placeholder monogram derived from CLIENT_NAME — swap for real logo
 * artwork on handover) and ACSE is credited "Powered by … AI" on the right.
 */

import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { CLIENT_NAME, ROUTE_PATHS } from '@/constants/constants'

/** Hamburger to reveal the sidebar on phones — shown only below `lg`. */
interface AdminTopbarProps {
  onOpenNav: () => void
}

export default function AdminTopbar({ onOpenNav }: AdminTopbarProps) {
  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl transition-colors md:px-6 dark:border-white/[0.06] dark:bg-brand-navydeep/70">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan lg:hidden dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <MenuGlyph />
      </button>

      <ClientBrand />

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle className="h-9 w-9" />
        <span aria-hidden className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />
        <PoweredBy />
      </div>
    </header>
  )
}

function ClientBrand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-navy text-sm font-bold text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
        {CLIENT_NAME.charAt(0)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[15px] font-semibold tracking-tight text-brand-navy dark:text-slate-100">
          {CLIENT_NAME}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Online
        </p>
      </div>
    </div>
  )
}

/** "Powered by ACSE · AI" attribution, doubling as the way back home. */
function PoweredBy() {
  return (
    <Link
      to={ROUTE_PATHS.landing}
      title="Back to acsesolutions.com"
      className="-my-2 flex shrink-0 items-center gap-1.5 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
    >
      <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
        Powered by
      </span>
      <Logo className="h-7" />
      <span className="text-xs font-bold tracking-tight text-brand-red">AI</span>
    </Link>
  )
}

function MenuGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
