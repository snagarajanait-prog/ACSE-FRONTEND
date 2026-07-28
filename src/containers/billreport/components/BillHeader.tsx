/**
 * The screen's top bar.
 *
 * Same shape as the copilot header — client brand left, ACSE credited right —
 * with one difference this screen needs: the PDF download promoted to a labelled
 * primary button rather than hidden at the foot of the thread. On a client call
 * the report is the thing being shown, and hunting for the export is not.
 *
 * The language switcher is deliberately absent: this screen's copy is fixed
 * English, and offering a switch that changes the chrome but not a word of the
 * analysis would look broken.
 */

import { Download, Loader2, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { POWERED_BY_LABEL, ROUTE_PATHS } from '@/constants/constants'
import { BILL_META } from '@/data/billReport'
import { cn } from '@/utils/cn'

const ICON_BUTTON_CLASS =
  'grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'

interface BillHeaderProps {
  /**
   * Whether a question has been asked yet. Only "Start over" depends on it —
   * the report and the insights panel are standing account context and are
   * available from the first paint.
   */
  started: boolean
  playing: boolean
  onSkip: () => void
  onReset: () => void
  onDownload: () => void
  downloading: boolean
  /**
   * The AI-insights toggle. One control for both of that panel's presentations —
   * the inline xl+ column and the below-xl overlay — so "insights on / off" is a
   * single idea wherever the viewer is.
   */
  insightsOpen: boolean
  onToggleInsights: () => void
}

export default function BillHeader({
  started,
  playing,
  onSkip,
  onReset,
  onDownload,
  downloading,
  insightsOpen,
  onToggleInsights,
}: BillHeaderProps) {
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3 backdrop-blur-xl transition-colors sm:gap-3 md:px-6 dark:border-white/[0.06] dark:bg-brand-navydeep/60">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-navy text-sm font-bold text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
          {BILL_META.provider.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-brand-navy dark:text-slate-100">
            Bill Intelligence
          </p>
          <p className="hidden truncate text-[11px] leading-tight text-slate-500 sm:block dark:text-slate-400">
            {BILL_META.provider} {BILL_META.documentType} · {BILL_META.reportDate}
          </p>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {playing && (
          <button
            onClick={onSkip}
            className={ICON_BUTTON_CLASS}
            aria-label="Skip to the end of the analysis"
            title="Skip to the end"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={onDownload}
          disabled={downloading}
          className={cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand-cyan px-3 text-[12.5px] font-semibold text-white outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 active:scale-95 disabled:opacity-60 dark:text-brand-navydeep dark:focus-visible:ring-offset-brand-navydeep',
          )}
          title="Download the full report as a PDF"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{downloading ? 'Building…' : 'Download report'}</span>
          <span className="sm:hidden">PDF</span>
        </button>

        <button
          onClick={onToggleInsights}
          aria-pressed={insightsOpen}
          className={cn(
            ICON_BUTTON_CLASS,
            insightsOpen &&
              'bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/15 hover:text-brand-cyan dark:bg-brand-cyan/15 dark:text-brand-cyan dark:hover:text-brand-cyan',
          )}
          aria-label={insightsOpen ? 'Hide AI insights' : 'Show AI insights'}
          title={insightsOpen ? 'Hide AI insights' : 'Show AI insights'}
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <ThemeToggle className="h-8 w-8" />

        {started && (
          <button
            onClick={onReset}
            className={ICON_BUTTON_CLASS}
            aria-label="Start over"
            title="Start over"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />

        <Link
          to={ROUTE_PATHS.landing}
          title="Back to the home page"
          className="-my-2 hidden shrink-0 items-center gap-1.5 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan sm:flex"
        >
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-slate-400 md:inline">
            {POWERED_BY_LABEL}
          </span>
          <Logo className="h-7" />
        </Link>
      </div>
    </header>
  )
}
