/**
 * "Filament — The Reasoning Thread": the full-page ACSE AI copilot.
 *
 * Three states, in order:
 *   1. no context   → the list of values (pick a customer/account)
 *   2. verifying    → the identity gate holds the pick until a code is entered
 *   3. has context  → a persistent account panel beside the conversation
 *
 * Within (3) the conversation itself has a hero state (a calm, centred greeting
 * with the composer under it) that collapses into a docked composer as soon as
 * anything is in flight.
 *
 * Theming is global: `.dark` lives on <html> via ThemeProvider, so everything
 * here styles itself with plain `dark:` variants — no `tone` prop drilling.
 */

import { useCallback, useEffect, useState } from 'react'
import AssistantOrbParticles from '@/components/AssistantOrbParticles'
import {
  AccountPanel,
  AccountVerify,
  AmbientBackdrop,
  ChatThread,
  Composer,
  CopilotHeader,
  CustomerList,
  SlideOver,
} from '@/containers/copilot/components'
import { useChatEngine } from '@/containers/copilot/hooks/useChatEngine'
import { useAppSelector } from '@/redux/hooks'

export default function Copilot() {
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
    resetConversation,
  } = engine

  const [panelOpen, setPanelOpen] = useState(false)
  const closePanel = useCallback(() => setPanelOpen(false), [])

  // An account picked but held at the identity gate. It outranks the list *and*
  // any standing context, so a fresh pick can never slip in behind the gate.
  const verifying = useAppSelector((s) => Boolean(s.demoSlice.pendingAccountId))

  // At lg+ the panel is persistent, so make sure the slide-over never lingers
  // open across a resize (which would duplicate it behind a full-page scrim).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      if (mq.matches) closePanel()
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [closePanel])

  const hasContext = Boolean(customer && account) && !verifying

  // Hero state: only the seeded greeting exists and nothing is in flight. Treat
  // the transient empty frame as hero too, so cold entry never flashes an empty
  // docked layout.
  const isHero =
    messages.length <= 1 &&
    !playing &&
    !thinking &&
    !typing &&
    (messages.length === 0 || messages[0]?.step.kind === 'ai')

  const greetingText =
    messages[0]?.step.kind === 'ai' ? messages[0].step.text : 'How can I help you today?'

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white font-sans text-brand-navy antialiased transition-colors duration-300 dark:bg-brand-navydeep dark:text-slate-100">
      <AmbientBackdrop />

      <CopilotHeader
        hasContext={hasContext}
        source={source}
        sourceSystem={meta.chatSystem}
        sourceShort={meta.chatShort}
        playing={playing}
        onOpenPanel={() => setPanelOpen(true)}
        onReset={resetConversation}
      />

      {!hasContext ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
          {verifying ? <AccountVerify /> : <CustomerList />}
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1">
          {/* Persistent account panel (desktop) */}
          <aside className="hidden w-[340px] shrink-0 border-r border-slate-200 bg-slate-50/60 transition-colors lg:block dark:border-white/10 dark:bg-brand-navy/20">
            <AccountPanel />
          </aside>

          {/* Conversation area.
              `min-w-0` is load-bearing, not tidying: a flex item defaults to
              `min-width: auto`, so without it this column refuses to shrink
              below the thread's 672px (`max-w-2xl`) intrinsic width and the
              whole conversation is clipped off the right edge on phones. */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={engine.scrollRef}
              className="scrollbar-slim relative min-h-0 flex-1 overflow-y-auto"
            >
              {isHero ? (
                <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 pb-16 pt-10 text-center">
                  <AssistantOrbParticles size={80} className="mb-6" />
                  <h1 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-brand-navy md:text-4xl dark:text-slate-100">
                    {greetingText}
                  </h1>
                  <p className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">
                    Ask about a bill, start or stop service, or report a leak — I&apos;ll walk it
                    through.
                  </p>
                  <div className="mt-8 w-full">
                    <ComposerFor engine={engine} mode="hero" />
                  </div>
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
                  customer={customer}
                  account={account}
                />
              )}
            </div>

            {!isHero && (
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-white to-transparent dark:from-brand-navydeep"
                />
                <div className="relative mx-auto w-full max-w-2xl px-5 pb-6 pt-2">
                  <ComposerFor engine={engine} mode="dock" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account panel on smaller viewports */}
      {hasContext && (
        <SlideOver open={panelOpen} onClose={closePanel} side="left" title="Account details">
          <AccountPanel />
        </SlideOver>
      )}
    </div>
  )
}

/**
 * Adapts the engine to the Composer's flat props. Kept here (rather than letting
 * Composer take the whole engine) so Composer stays a presentational component
 * that any other surface could reuse.
 */
function ComposerFor({
  engine,
  mode,
}: {
  engine: ReturnType<typeof useChatEngine>
  mode: 'hero' | 'dock'
}) {
  return (
    <Composer
      mode={mode}
      draft={engine.draft}
      setDraft={engine.setDraft}
      onSend={engine.onSend}
      playing={engine.playing}
      pills={engine.pills}
      onStartScenario={engine.startScenario}
      sourceLabel={engine.meta.chatLabel}
    />
  )
}
