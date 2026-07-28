/**
 * "Bill Intelligence" — the demo screen at `/bill-intelligence`.
 *
 * The copilot's three-column conversation layout, turned on one account:
 *
 *   left   — the account and every REPORTED figure
 *   middle — the conversation, which plays a scripted analysis
 *   right  — the AI insights, every MODELED figure, with actions that post
 *            real questions back into the conversation
 *
 * The left/right split is the reported/modeled boundary the whole demo is about,
 * so the layout itself carries the distinction rather than leaving it to labels.
 *
 * Public, and wired to nothing. No API call, no store, no auth — which is the
 * point: it can be opened on any laptop in front of a client and it behaves
 * identically every time.
 */

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PanelLeftClose, PanelLeftOpen, Receipt, X } from 'lucide-react'
import { toast } from 'sonner'
import AssistantOrbLottie from '@/components/AssistantOrbLottie'
import BillAccountPanel from '@/containers/billreport/components/BillAccountPanel'
import BillComposer from '@/containers/billreport/components/BillComposer'
import BillHeader from '@/containers/billreport/components/BillHeader'
import BillInsightsPanel, {
  BillInsightsOverlay,
} from '@/containers/billreport/components/BillInsightsPanel'
import BillThread from '@/containers/billreport/components/BillThread'
import { useBillChat } from '@/containers/billreport/hooks/useBillChat'
import { useMediaQuery } from '@/containers/copilot/hooks/useMediaQuery'
import { STORAGE_KEYS } from '@/constants/constants'
import { BILL_META, PERIOD } from '@/data/billReport'
import { storage } from '@/utils/storage'
import { downloadBillReportPdf } from '@/utils/billReportPdf'
import { cn } from '@/utils/cn'

export default function BillReport() {
  const chat = useBillChat()

  const [accountExpanded, setAccountExpanded] = useState(true)
  const [accountSheet, setAccountSheet] = useState(false)
  const [downloading, setDownloading] = useState(false)

  /**
   * Insights have two presentations and they need DIFFERENT defaults: the xl+
   * column is on by default and its state is remembered, while below xl it is an
   * overlay that must never be the thing greeting you on load. Hence two pieces
   * of state and one control that writes to whichever is in play.
   */
  const wideEnoughForInsights = useMediaQuery('(min-width: 1280px)')
  const [insightsColumn, setInsightsColumn] = useState<boolean>(
    () => storage.get<boolean>(STORAGE_KEYS.billInsights) ?? true,
  )
  const [insightsOverlay, setInsightsOverlay] = useState(false)

  const insightsOpen = wideEnoughForInsights ? insightsColumn : insightsOverlay

  const toggleInsights = useCallback(() => {
    // The overlay is transient and deliberately NOT persisted — reopening the
    // demo should never land on a modal sheet.
    if (!wideEnoughForInsights) {
      setInsightsOverlay((prev) => !prev)
      return
    }
    const next = !insightsColumn
    setInsightsColumn(next)
    storage.set(STORAGE_KEYS.billInsights, next)
  }, [wideEnoughForInsights, insightsColumn])

  // Growing past xl turns the overlay into the column — leaving it mounted would
  // strand a modal scrim over a layout that has room for the panel inline.
  useEffect(() => {
    if (wideEnoughForInsights) setInsightsOverlay(false)
  }, [wideEnoughForInsights])

  /**
   * An insight's action IS a conversation turn. On the overlay that also means
   * getting out of the way — the answer arrives in the thread now under the sheet.
   */
  const askFromInsight = useCallback(
    (id: string) => {
      setInsightsOverlay(false)
      chat.askById(id)
    },
    [chat],
  )

  const download = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadBillReportPdf()
      toast.success('Report downloaded', {
        description: 'Two pages — where you stand, and what to do about it.',
      })
    } catch (error) {
      // A failed download gives no signal of its own — this is the only feedback.
      console.error('[bill-report] export failed', error)
      toast.error("The report couldn't be built", { description: 'Please try again.' })
    } finally {
      setDownloading(false)
    }
  }, [])

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white font-sans text-brand-navy antialiased transition-colors duration-300 dark:bg-brand-navydeep dark:text-slate-100">
      <Backdrop />

      <BillHeader
        started={chat.started}
        playing={chat.playing}
        onSkip={chat.skip}
        onReset={chat.reset}
        onDownload={download}
        downloading={downloading}
        insightsOpen={insightsOpen}
        onToggleInsights={toggleInsights}
      />

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Account column — lg+ only. Its width animates so collapse and expand
            glide, and one handle rides the divider line. */}
        <div className="relative hidden min-h-0 shrink-0 lg:flex">
          <div
            className={cn(
              'relative min-h-0 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 transition-[width] duration-300 ease-in-out dark:border-white/10 dark:bg-[#0c1c2c]',
              accountExpanded ? 'w-[340px]' : 'w-0 border-r-0',
            )}
            aria-hidden={!accountExpanded}
            inert={!accountExpanded}
          >
            {/* Holds its full width while the parent animates, so the content
                slides out of view rather than reflowing on every frame. */}
            <div className="h-full w-[340px]">
              <BillAccountPanel />
            </div>
          </div>

          <button
            onClick={() => setAccountExpanded((v) => !v)}
            aria-expanded={accountExpanded}
            aria-label={accountExpanded ? 'Hide the account panel' : 'Show the account panel'}
            title={accountExpanded ? 'Hide the account panel' : 'Show the account panel'}
            className={cn(
              // `top-3` puts an h-8 button's centre on 28px — the centre of the
              // panel's own 56px header row (py-3 around a 32px badge), so the
              // handle reads as part of that row instead of floating at
              // mid-height against nothing.
              'absolute top-3 z-20 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-colors hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:border-white/10 dark:bg-brand-navy dark:text-slate-300 dark:hover:text-white',
              // Expanded, the handle straddles the divider. Collapsed, the
              // container is zero-width, so straddling it would put half the
              // button off the left edge of the screen — it has to sit fully
              // inside instead, or the only way to bring the panel back is
              // clipped in half.
              accountExpanded ? 'right-0 translate-x-1/2' : 'left-1.5',
            )}
          >
            {accountExpanded ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Conversation.
            `min-w-0` is load-bearing: a flex item defaults to `min-width: auto`,
            so without it this column refuses to shrink below the thread's
            intrinsic width and the charts are clipped off the right edge. */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={chat.scrollRef}
            onScroll={chat.onScroll}
            className="scrollbar-slim relative min-h-0 flex-1 overflow-y-auto"
          >
            {chat.started ? (
              <BillThread
                messages={chat.messages}
                playing={chat.playing}
                thinkingPhrases={chat.thinkingPhrases}
              />
            ) : (
              // Nothing has been asked yet. A calm, centred invitation with the
              // composer under it — the analysis waits for a real send.
              //
              // Sat DELIBERATELY below centre. `justify-center` splits the spare
              // height evenly, so the padding difference is what offsets it, by
              // exactly half: `pt-20`/`pb-6` (80 − 24) puts the invitation 28px
              // low. Biasing it this way rather than with `justify-end` or an
              // `mt-auto` spacer keeps the offset CONSTANT — those hand all the
              // spare height to the top, which reads fine on a laptop and strands
              // the block at the foot of a tall monitor.
              //
              // (The original `pb-16`/`pt-10` was the same lever pulled the other
              // way, sitting it 12px high — that, plus a dead trailing row in the
              // composer, was the gap underneath.)
              //
              // `-safe` guards the other end: centred content that outgrows the
              // viewport spills off BOTH sides, and the top half of that spill
              // cannot be scrolled back to. Safe alignment centres while it fits
              // and top-aligns when it does not, so a short window loses nothing.
              <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center-safe px-5 pb-6 pt-20 text-center">
                <AssistantOrbLottie size={150} className="mb-6" />
                <h1 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-brand-navy md:text-4xl dark:text-slate-100">
                  Your {PERIOD.short} energy report is ready
                </h1>
                <p className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">
                  {BILL_META.customerName} · account #{BILL_META.accountNumber} · {PERIOD.label}
                </p>
                <div className="mt-8 w-full">
                  <BillComposer
                    mode="hero"
                    suggestion={chat.openingPrompt}
                    followUps={chat.followUps}
                    onAsk={chat.ask}
                    onSend={chat.askFreeText}
                    playing={chat.playing}
                  />
                </div>
              </div>
            )}
          </div>

          {/* The docked composer belongs to the running conversation only — in
              the hero state it lives inside the centred block above. */}
          {chat.started && (
            <div className="relative shrink-0">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-white to-transparent dark:from-brand-navydeep"
              />
              {/* `pb-6`, not `pb-5`: the composer's trailing row used to sit
                  between the box and this padding, so the dock kept its distance
                  from the page edge by accident. Now the padding is all of it. */}
              <div className="relative mx-auto w-full max-w-3xl px-5 pb-6 pt-2">
                <BillComposer
                  mode="dock"
                  followUps={chat.followUps}
                  onAsk={chat.ask}
                  onSend={chat.askFreeText}
                  playing={chat.playing}
                />
              </div>
            </div>
          )}

          {/* Below lg the account panel has no room, so it arrives as a sheet. */}
          <button
            onClick={() => setAccountSheet(true)}
            className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-brand-navy shadow-md outline-none ring-1 ring-slate-200 transition hover:ring-brand-cyan focus-visible:ring-2 focus-visible:ring-brand-cyan active:scale-95 lg:hidden dark:bg-white/[0.08] dark:text-slate-100 dark:ring-white/15 dark:backdrop-blur"
          >
            <Receipt className="h-3.5 w-3.5 text-brand-cyan" />
            Account
          </button>
        </div>

        {/* Insights — the conversation's other flank, xl+ only. Same collapse
            mechanics as the account column, but it closes to nothing: there is
            no rail form of an insight, and below xl the overlay takes over.
            Present from the first paint, like the account column: both are
            standing context for the account, and the conversation is the layer
            that EXPLAINS them. Holding this column back until a question was
            asked left half the screen empty on arrival for no benefit. */}
        <div
          className={cn(
            'relative hidden min-h-0 shrink-0 overflow-hidden border-l border-slate-200 bg-slate-50 transition-[width] duration-300 ease-in-out xl:block dark:border-white/10 dark:bg-[#0c1c2c]',
            insightsColumn ? 'xl:w-[340px]' : 'xl:w-0 xl:border-l-0',
          )}
          // Hidden from assistive tech when collapsed: `overflow-hidden` on a
          // zero-width box still leaves the cards focusable and readable.
          aria-hidden={!insightsColumn}
          inert={!insightsColumn}
        >
          <div className="h-full w-[340px]">
            <BillInsightsPanel onAsk={askFromInsight} busy={chat.playing} />
          </div>
        </div>
      </div>

      {accountSheet && <AccountSheet onClose={() => setAccountSheet(false)} />}

      {/* Below xl there is no room for a third column, so the same panel arrives
          as a sheet. Mounted only while open — it is modal, and its scroll lock
          must not outlive it. */}
      {insightsOverlay && !wideEnoughForInsights && (
        <BillInsightsOverlay
          onAsk={askFromInsight}
          busy={chat.playing}
          onClose={() => setInsightsOverlay(false)}
        />
      )}
    </div>
  )
}

/**
 * The page's ambient wash — the copilot's, so the two screens sit on the same
 * surface. Dark-only layers are faded rather than unmounted, which keeps the
 * palette transition continuous instead of popping.
 */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-6%,rgba(44,165,217,0.12),transparent_66%)] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(60%_55%_at_50%_-12%,rgba(44,165,217,0.20),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(42%_40%_at_100%_100%,rgba(227,57,53,0.05),transparent_70%)] [animation-delay:-8s] motion-safe:animate-aurora-drift dark:bg-[radial-gradient(40%_40%_at_100%_100%,rgba(227,57,53,0.08),transparent_70%)]" />
      <div className="brand-dot-grid absolute inset-0 opacity-0 transition-opacity dark:opacity-[0.35]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_45%,#0d1b2a_100%)] opacity-0 transition-opacity dark:opacity-100" />
    </div>
  )
}

/** The account panel as a sheet: bottom on a phone, right edge from `sm` up. */
function AccountSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/30 motion-safe:animate-fade-in dark:bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200 motion-safe:animate-rise-in',
          'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[380px] sm:max-w-[90%] sm:rounded-none sm:rounded-l-2xl',
          'dark:bg-[#0c1c2c] dark:ring-white/10',
        )}
      >
        <span
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-300 sm:hidden dark:bg-white/20"
        />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-h-0 flex-1">
          <BillAccountPanel />
        </div>
      </div>
    </div>,
    document.body,
  )
}
