/**
 * The assistant as a right-edge drawer — the second of the copilot feature's two
 * presentations (the other being the full-page screen in `../index.tsx`).
 *
 * Both run the SAME `useChatEngine`, so behaviour cannot drift between them; only
 * the chrome differs. That is also why this file lives inside the copilot feature
 * rather than in the landing page that launches it: the assistant owns it, and
 * exposes it through the feature barrel as a deliberate entry point.
 *
 * Layout differences forced by the narrow width:
 *   - the account panel is an inner overlay toggled from the header, rather than
 *     a persistent column
 *   - an "expand" control hands off to the full-page copilot, carrying the
 *     context over (it lives in Redux, so nothing needs to be threaded through)
 *
 * Motion: the panel uses a long-tail easing (the `--ease-drawer` curve) so it
 * decelerates into place instead of stopping dead. Everything is gated behind
 * `motion-safe:`; the global reduced-motion rule in `index.css` flattens the rest.
 */

import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, PanelRightClose, SlidersHorizontal, X } from 'lucide-react'
import AssistantOrb3D from '@/components/AssistantOrb3D'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import AccountPanel from '@/containers/copilot/components/AccountPanel'
import AccountVerify from '@/containers/copilot/components/AccountVerify'
import ChatThread from '@/containers/copilot/components/ChatThread'
import Composer from '@/containers/copilot/components/Composer'
import CustomerList from '@/containers/copilot/components/CustomerList'
import { useChatEngine } from '@/containers/copilot/hooks/useChatEngine'
import { useAppSelector } from '@/redux/hooks'
import { cn } from '@/utils/cn'

const ICON_BUTTON_CLASS =
  'grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'

export interface AssistantDrawerProps {
  open: boolean
  onClose: () => void
}

export default function AssistantDrawer({ open, onClose }: AssistantDrawerProps) {
  const engine = useChatEngine()
  const {
    customer,
    account,
    source,
    meta,
    messages,
    thinking,
    typing,
    playing,
    otpPrompt,
    submitOtp,
  } = engine

  const panelRef = useRef<HTMLElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const verifying = useAppSelector((s) => Boolean(s.demoSlice.pendingAccountId))
  const hasContext = Boolean(customer && account) && !verifying

  // The account overlay is meaningless without a context — make sure it can never
  // be left open across a customer change or a close/reopen.
  useEffect(() => {
    if (!hasContext || !open) setDetailsOpen(false)
  }, [hasContext, open])

  // Esc closes the account overlay first, then the drawer — innermost layer wins,
  // so Esc never skips a level.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (detailsOpen) setDetailsOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, detailsOpen, onClose])

  // Lock the page behind the drawer. Compensating for the scrollbar's width keeps
  // the landing page from jolting sideways as it disappears.
  useEffect(() => {
    if (!open) return
    const { body, documentElement } = document
    const gap = window.innerWidth - documentElement.clientWidth
    const prevOverflow = body.style.overflow
    const prevPadding = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px`
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPadding
    }
  }, [open])

  // Move focus into the panel on open so the keyboard follows the eye.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  // Reopening should always start narrow — a full-bleed panel is a jarring thing
  // to be met with after tapping a small corner button.
  useEffect(() => {
    if (!open) setExpanded(false)
  }, [open])

  const isHero =
    messages.length <= 1 &&
    !playing &&
    !thinking &&
    !typing &&
    (messages.length === 0 || messages[0]?.step.kind === 'ai')

  const greetingText =
    messages[0]?.step.kind === 'ai' ? messages[0].step.text : 'How can I help you today?'

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-brand-navy/25 backdrop-blur-[2px] transition-opacity duration-500 dark:bg-black/50',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="ACSE AI assistant"
        aria-hidden={!open}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl outline-none',
          'dark:border-white/10 dark:bg-brand-navydeep',
          // Width and slide share one easing so expanding reads as the same
          // object growing rather than two effects firing at once.
          //
          // `translate` must be listed explicitly: Tailwind v4 compiles
          // `translate-x-*` to the standalone `translate` property, NOT to
          // `transform`, so a transition list without it silently drops the slide.
          'transition-[transform,translate,width] duration-500 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
          expanded ? 'sm:w-full' : 'sm:w-[440px] lg:w-[480px]',
          open ? 'translate-x-0' : 'pointer-events-none invisible translate-x-full',
        )}
      >
        {/* Ambient wash, dark palette only — keeps the drawer feeling like the
            copilot rather than a plain sheet. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity dark:opacity-100"
        >
          <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_-8%,rgba(44,165,217,0.18),transparent_70%)]" />
          <div className="brand-dot-grid absolute inset-0 opacity-[0.25]" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/70 px-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-brand-navydeep/60">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-navy text-sm font-bold text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
            X
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight text-brand-navy dark:text-slate-100">
              XYZ Company
            </p>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
              Powered by <Logo className="h-4" />
            </p>
          </div>

          {hasContext && (
            <button
              onClick={() => setDetailsOpen((v) => !v)}
              aria-pressed={detailsOpen}
              className={cn(ICON_BUTTON_CLASS, detailsOpen && 'bg-slate-100 dark:bg-white/10')}
              aria-label="Account details"
              title="Account details"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
          <ThemeToggle className="h-8 w-8" />
          {/* Expands the panel IN PLACE rather than routing to /copilot: the
              transcript lives in the engine's local state, so navigating would
              remount it and silently drop the conversation. */}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-pressed={expanded}
            className={cn(ICON_BUTTON_CLASS, 'hidden sm:grid')}
            aria-label={expanded ? 'Shrink the assistant' : 'Expand the assistant'}
            title={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className={ICON_BUTTON_CLASS}
            aria-label="Close the assistant"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body. `min-w-0` for the same reason as the full-page column — see the
            note in `../index.tsx`. */}
        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
          {!hasContext ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              {verifying ? <AccountVerify /> : <CustomerList />}
            </div>
          ) : (
            <>
              <div
                ref={engine.scrollRef}
                className="scrollbar-slim relative min-h-0 flex-1 overflow-y-auto"
              >
                {isHero ? (
                  <div className="flex min-h-full flex-col items-center justify-center px-4 pb-10 pt-8 text-center">
                    <AssistantOrb3D size={84} className="mb-4" />
                    <h2 className="text-balance text-xl font-semibold tracking-[-0.01em] text-brand-navy dark:text-slate-100">
                      {greetingText}
                    </h2>
                    <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                      Ask about a bill, start or stop service, or report a leak.
                    </p>
                  </div>
                ) : (
                  <ChatThread
                    messages={messages}
                    source={source}
                    playing={playing}
                    thinking={thinking}
                    typing={typing}
                    otpPrompt={otpPrompt}
                    onSubmitOtp={submitOtp}
                  />
                )}
              </div>

              {/* max-w matches ChatThread's, so the composer stays under the
                  conversation instead of stretching once expanded. */}
              <div className="relative mx-auto w-full max-w-2xl shrink-0 px-4 pb-4 pt-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-white to-transparent dark:from-brand-navydeep"
                />
                <Composer
                  mode="dock"
                  draft={engine.draft}
                  setDraft={engine.setDraft}
                  onSend={engine.onSend}
                  playing={playing}
                  pills={engine.pills}
                  onStartScenario={engine.startScenario}
                  sourceLabel={meta.chatLabel}
                  placeholder="Ask ACSE AI anything…"
                />
              </div>
            </>
          )}
        </div>

        {/* Account details — an inner overlay, since there is no room for a column. */}
        {hasContext && (
          <>
            <div
              aria-hidden
              onClick={() => setDetailsOpen(false)}
              className={cn(
                'absolute inset-0 z-20 bg-brand-navy/20 transition-opacity duration-300 dark:bg-black/40',
                detailsOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            />
            <div
              aria-hidden={!detailsOpen}
              className={cn(
                'absolute inset-y-0 right-0 z-30 flex w-[300px] max-w-[85%] flex-col border-l border-slate-200 bg-white shadow-2xl',
                'dark:border-white/10 dark:bg-brand-navy',
                'transition-transform duration-400 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
                detailsOpen ? 'translate-x-0' : 'pointer-events-none invisible translate-x-full',
              )}
            >
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-white/10">
                <p className="text-sm font-semibold text-brand-navy dark:text-slate-100">
                  Account details
                </p>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className={ICON_BUTTON_CLASS}
                  aria-label="Close account details"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AccountPanel />
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
