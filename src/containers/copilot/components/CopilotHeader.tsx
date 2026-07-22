/**
 * The copilot's top bar.
 *
 * White-label by design: the CLIENT's brand sits top-left and ACSE is credited
 * as "Powered by" on the right. Swap CLIENT_NAME (and the monogram in
 * `ClientBrand`) for the client's real name / logo artwork.
 */

import { PanelLeft, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { CLIENT_NAME, POWERED_BY_LABEL, ROUTE_PATHS } from '@/constants/constants'
import { cn } from '@/utils/cn'

/** `shrink-0` keeps these square at 320px, where the header runs out of room. */
const ICON_BUTTON_CLASS =
  'grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'

interface CopilotHeaderProps {
  /** Whether a customer/account is in context (controls the panel + reset actions). */
  hasContext: boolean
  playing: boolean
  onOpenPanel: () => void
  onReset: () => void
}

export default function CopilotHeader({
  hasContext,
  playing,
  onOpenPanel,
  onReset,
}: CopilotHeaderProps) {
  const { t } = useTranslation('copilot')
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3 backdrop-blur-xl transition-colors sm:gap-3 md:px-6 dark:border-white/[0.06] dark:bg-brand-navydeep/60">
      <ClientBrand />

      {/* `min-w-0` lets the brand truncate instead of the controls being squeezed. */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <ThemeToggle className="h-8 w-8" />
        {hasContext && (
          <>
            <button
              onClick={onOpenPanel}
              className={cn(ICON_BUTTON_CLASS, 'lg:hidden')}
              aria-label={t('header.openAccountDetails')}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onReset}
              disabled={playing}
              className={cn(ICON_BUTTON_CLASS, 'disabled:opacity-40')}
              aria-label={t('header.newChat')}
              title={t('header.newChat')}
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
  const { t } = useTranslation('copilot')
  return (
    <Link
      to={ROUTE_PATHS.landing}
      title={t('header.backHome')}
      // `py-2 -my-2` grows the hit area to a comfortable 36px without changing
      // how the lockup sits in the header.
      className="-my-2 flex shrink-0 items-center gap-1.5 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
    >
      <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
        {POWERED_BY_LABEL}
      </span>
      <Logo className="h-7" />
    </Link>
  )
}
