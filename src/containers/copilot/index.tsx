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

import { useCallback, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AssistantOrbLottie from '@/components/AssistantOrbLottie'
import {
  AccountPanel,
  AccountRail,
  AccountVerify,
  AmbientBackdrop,
  ChatThread,
  Composer,
  CopilotHeader,
  CustomerList,
} from '@/containers/copilot/components'
import { useChatEngine } from '@/containers/copilot/hooks/useChatEngine'
import { STORAGE_KEYS } from '@/constants/constants'
import { useAppSelector } from '@/redux/hooks'
import { storage } from '@/utils/storage'
import { cn } from '@/utils/cn'

export default function Copilot() {
  const { t } = useTranslation('copilot')
  const engine = useChatEngine()
  const {
    customer,
    account,
    source,
    messages,
    thinking,
    typing,
    playing,
    otpPrompt,
    submitOtp,
    resetConversation,
  } = engine

  // An account picked but held at the identity gate. It outranks the list *and*
  // any standing context, so a fresh pick can never slip in behind the gate.
  const verifying = useAppSelector((s) => Boolean(s.demoSlice.pendingAccountId))

  const hasContext = Boolean(customer && account) && !verifying

  // Desktop sidebar: expanded shows the full account panel, collapsed shrinks it
  // to the account rail. The choice is remembered across visits. (Below lg the
  // rail is always the presentation, so this only governs lg+.)
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(
    () => storage.get<boolean>(STORAGE_KEYS.copilotSidebar) ?? true,
  )
  const setSidebar = useCallback((next: boolean) => {
    setSidebarExpanded(next)
    storage.set(STORAGE_KEYS.copilotSidebar, next)
  }, [])

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
    messages[0]?.step.kind === 'ai' ? messages[0].step.text : t('hero.greetingFallback')

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white font-sans text-brand-navy antialiased transition-colors duration-300 dark:bg-brand-navydeep dark:text-slate-100">
      <AmbientBackdrop />

      <CopilotHeader hasContext={hasContext} playing={playing} onReset={resetConversation} />

      {!hasContext ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
          {verifying ? <AccountVerify /> : <CustomerList />}
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1">
          {/* Account column — the full panel (lg+, expanded) or the icon rail
              (lg+ collapsed, and every mobile). Its width animates so collapse and
              expand glide, and a single handle rides the divider line. */}
          <div className="relative flex min-h-0 shrink-0">
            <div
              className={cn(
                'relative min-h-0 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50/60 transition-[width] duration-300 ease-in-out dark:border-white/10 dark:bg-brand-navy/20',
                sidebarExpanded ? 'w-14 lg:w-[340px]' : 'w-14',
              )}
            >
              {/* Base layer: the icon rail (mobile + collapsed desktop). */}
              <AccountRail />

              {/* Over it, the full panel — faded in at lg+ when expanded. Its
                  surface must be OPAQUE (not the shell's translucent slate) or the
                  rail icons beneath show through it; the colours are tuned to match
                  the shell's effective tint so collapsed and expanded look identical. */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 hidden w-[340px] bg-slate-50 transition-opacity duration-200 lg:block dark:bg-[#0c1c2c]',
                  sidebarExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <AccountPanel />
              </div>
            </div>

            {/* One handle on the divider line, vertically centred: collapse when
                open, expand when closed. lg+ only — below lg the rail is the sole
                presentation, with nothing to collapse. `translate-x-1/2` straddles
                the border; it rides the edge as the width animates. */}
            <button
              onClick={() => setSidebar(!sidebarExpanded)}
              aria-label={sidebarExpanded ? t('header.collapseSidebar') : t('header.expandSidebar')}
              title={sidebarExpanded ? t('header.collapseSidebar') : t('header.expandSidebar')}
              aria-expanded={sidebarExpanded}
              className="absolute right-0 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-colors hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan lg:grid dark:border-white/10 dark:bg-brand-navy dark:text-slate-300 dark:hover:text-white"
            >
              {sidebarExpanded ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
          </div>

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
                  {/* Sized larger than the old sphere: the Lottie's orb body fills
                      only ~57% of its frame (the rest is drifting bubbles + glow),
                      so the box runs well past the sphere it replaces. */}
                  <AssistantOrbLottie size={160} className="mb-6" />
                  <h1 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-brand-navy md:text-4xl dark:text-slate-100">
                    {greetingText}
                  </h1>
                  <p className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">
                    {t('hero.subtitle')}
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
