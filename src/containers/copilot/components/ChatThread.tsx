/**
 * "Filament — The Reasoning Thread": the conversation runs down a single glowing
 * cyan spine, with each turn hanging off a node. Bubble-less typeset prose for
 * the assistant, a bubble only for the customer, so the AI reads as the page's
 * own voice rather than a participant in a messenger.
 */

import { CheckCircle2, ClipboardCheck, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ChatActions from '@/containers/copilot/components/ChatActions'
import OtpInput from '@/containers/copilot/components/OtpInput'
import ReceiptMenu from '@/containers/copilot/components/ReceiptMenu'
import {
  OTP_DIGITS,
  useCyclingPhrase,
  type Msg,
  type OtpPrompt,
} from '@/containers/copilot/hooks/useChatEngine'
import { splitReference } from '@/containers/copilot/utils/splitReference'
import { hasExportableContent } from '@/containers/copilot/utils/transcript'
import type { Account, Customer } from '@/data/customers'
import type { ChatStep } from '@/data/scenarios'
import type { DataSource } from '@/redux/dataSourceSlice'
import { cn } from '@/utils/cn'
import type { ReceiptCustomer } from '@/utils/receipt'

interface ChatThreadProps {
  messages: Msg[]
  source: DataSource
  playing: boolean
  thinking: string[] | null
  typing: boolean
  otpPrompt: OtpPrompt | null
  onSubmitOtp: (code: string) => void
  /** Stamped onto the PDF receipt so it identifies who the request was for. */
  customer?: Customer
  /** Named in the exported transcript's context header. */
  account?: Account
}

/**
 * The reference id belongs to the closing "done" line, not the summary card, but
 * the receipt needs it. Look ahead from the card to the next `done` step and lift
 * it from there — so a receipt downloaded mid-playback simply omits the reference,
 * and the same card gains it once the storyboard finishes.
 */
function referenceAfter(messages: Msg[], index: number): string | null {
  for (let i = index + 1; i < messages.length; i += 1) {
    const step = messages[i].step
    if (step.kind === 'done') return splitReference(step.text).ref
  }
  return null
}

/** One conversation's worth of turns, sliced out of the flat thread. */
interface Segment {
  conversationId: number
  messages: Msg[]
}

/**
 * Split the flat thread back into the separate conversations it holds, keyed by
 * the `conversationId` the engine stamps on each turn. Every scenario run and
 * every free-typed exchange is its own segment, so each can close with its own
 * Copy / Share / Export bar — a single chat that started service *and* stopped
 * service ends up with a take-away bar under each.
 */
function toSegments(messages: Msg[]): Segment[] {
  const segments: Segment[] = []
  for (const m of messages) {
    const last = segments[segments.length - 1]
    if (last && last.conversationId === m.conversationId) last.messages.push(m)
    else segments.push({ conversationId: m.conversationId, messages: [m] })
  }
  return segments
}

export default function ChatThread({
  messages,
  source,
  playing,
  thinking,
  typing,
  otpPrompt,
  onSubmitOtp,
  customer,
  account,
}: ChatThreadProps) {
  const receiptCustomer: ReceiptCustomer | undefined = customer && {
    name: customer.name,
    id: customer.id,
    email: customer.email,
    phone: customer.phone,
  }

  // Only offer a take-away bar once its conversation is at rest. Mid-playback it
  // would export half a conversation, and a row of controls sliding in under a
  // live assistant turn reads as part of that turn.
  const settled = !playing && !thinking && !typing && !otpPrompt

  const segments = toSegments(messages)
  // The active turn (a status line still shimmering, the in-flight indicators)
  // always lives in the final segment. Track the very last message so a status
  // node keeps its "working" state regardless of which segment it sits in.
  const lastId = messages.length ? messages[messages.length - 1].id : -1

  return (
    <div className="relative mx-auto w-full max-w-2xl px-5 pb-10 pt-10 md:px-0">
      <Filament active={Boolean(thinking || typing)} />
      {segments.map((segment, si) => {
        const isLast = si === segments.length - 1
        // Earlier conversations are, by definition, finished the moment a newer
        // one begins, so their bar is always available. The live conversation
        // earns its bar only once the whole thread comes to rest.
        const showActions =
          (isLast ? settled : true) && hasExportableContent(segment.messages)
        return (
          <section key={segment.conversationId} className={cn(si > 0 && 'mt-10')}>
            <ol
              // Only the live conversation announces; the settled ones above it
              // are static history and must not re-read themselves on mount.
              role="log"
              aria-live={isLast ? 'polite' : 'off'}
              aria-relevant="additions"
              className="relative space-y-10"
            >
              {segment.messages.map((m, i) => (
                <Turn
                  key={m.id}
                  msg={m}
                  source={source}
                  isLast={m.id === lastId}
                  playing={playing}
                  customer={receiptCustomer}
                  reference={m.step.kind === 'summary' ? referenceAfter(segment.messages, i) : null}
                />
              ))}
              {isLast && otpPrompt && <OtpChallengeNode prompt={otpPrompt} onSubmit={onSubmitOtp} />}
              {isLast && thinking && <ThinkingNode phrases={thinking} />}
              {isLast && typing && <TypingNode />}
            </ol>

            {/* Outside the <ol>: these are controls for the log, not an entry in it. */}
            {showActions && (
              <ChatActions
                messages={segment.messages}
                customer={customer}
                account={account}
                source={source}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}

/* ------------------------------- Filament -------------------------------- */

function Filament({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-5 md:left-0">
      <span className="absolute left-1.5 top-1 grid -translate-x-1/2 place-items-center">
        <span className="h-3 w-3 rounded-full bg-brand-cyan" />
        <span className="absolute inset-0 rounded-full bg-brand-cyan/40 blur-md motion-safe:animate-orb-breathe" />
      </span>
      <div className="absolute bottom-0 left-1.5 top-8 w-px origin-top -translate-x-1/2 bg-gradient-to-b from-brand-cyan/60 via-brand-cyan/20 to-transparent motion-safe:animate-spine-draw dark:from-brand-cyan/55 dark:via-brand-cyan/15" />
      <div className="absolute bottom-0 left-1.5 top-8 w-[3px] origin-top -translate-x-1/2 bg-brand-cyan/20 blur-[3px] motion-safe:animate-spine-draw dark:bg-brand-cyan/25" />
      {active && (
        <div className="absolute left-1.5 top-8 h-20 w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-brand-cyan to-transparent blur-[1px] motion-safe:animate-filament-beam" />
      )}
    </div>
  )
}

function Node({ tone = 'cyan' }: { tone?: 'cyan' | 'dim' | 'emerald' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute left-1.5 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full ring-4',
        tone === 'cyan' && 'bg-brand-cyan ring-brand-cyan/15',
        tone === 'dim' && 'bg-slate-300 ring-slate-200 dark:bg-slate-500 dark:ring-white/[0.04]',
        tone === 'emerald' && 'bg-emerald-400 ring-emerald-400/20',
      )}
    />
  )
}

/* -------------------------------- Turns ---------------------------------- */

function Turn({
  msg,
  source,
  isLast,
  playing,
  customer,
  reference,
}: {
  msg: Msg
  source: string
  isLast: boolean
  playing: boolean
  customer?: ReceiptCustomer
  reference: string | null
}) {
  const { t } = useTranslation('copilot')
  const step = msg.step
  switch (step.kind) {
    case 'user':
      return (
        <li className="relative flex flex-col items-end pl-9 motion-safe:animate-rise-in">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">
            {t('chat.you')}
          </span>
          <div className="w-fit max-w-[75%] rounded-2xl rounded-tr-md bg-brand-cyan/[0.08] px-4 py-2.5 text-[15px] leading-6 text-brand-navy ring-1 ring-brand-cyan/15 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/10 dark:backdrop-blur">
            <span className="sr-only">{t('chat.youSaid')}</span>
            {step.text}
          </div>
        </li>
      )
    case 'ai':
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <Node />
          <p className="max-w-[68ch] text-[15px] leading-7 text-slate-700 dark:text-slate-100/90">
            <span className="sr-only">{t('chat.assistantSaid')}</span>
            <Lede text={step.text} />
          </p>
        </li>
      )
    case 'status': {
      const active = isLast && playing
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in" role="status">
          <Node tone={active ? 'cyan' : 'dim'} />
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            {active ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-cyan" />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
            )}
            {active ? <Shimmer>{step.text}</Shimmer> : <span>{step.text}</span>}
          </div>
        </li>
      )
    }
    case 'otp':
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <Node />
          <OtpCard channel={step.channel} text={step.text} entered={step.entered} />
        </li>
      )
    case 'summary':
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <Node />
          <SummaryCard step={step} source={source} customer={customer} reference={reference} />
        </li>
      )
    case 'done':
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <span aria-hidden className="absolute left-1.5 top-1.5 -translate-x-1/2">
            <span className="block h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
            <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50 motion-safe:animate-ring-out" />
          </span>
          <DoneBand text={step.text} />
        </li>
      )
    default:
      return null
  }
}

/** Renders the first sentence one weight brighter as a typographic lede. */
function Lede({ text }: { text: string }) {
  const m = text.match(/^(.*?[.?!])(\s+)([\s\S]+)$/)
  if (!m) return <span className="font-medium text-brand-navy dark:text-slate-50">{text}</span>
  return (
    <>
      <span className="font-medium text-brand-navy dark:text-slate-50">{m[1]}</span>
      {m[2]}
      {m[3]}
    </>
  )
}

/** The sweeping highlight used by every "working" label. */
function Shimmer({ children }: { children: React.ReactNode }) {
  return (
    <span className="animate-shimmer bg-clip-text text-transparent [background-image:linear-gradient(90deg,#94a3b8_0%,#94a3b8_40%,#0a1e35_50%,#94a3b8_60%,#94a3b8_100%)] [background-size:200%_100%] dark:[background-image:linear-gradient(90deg,#64748b_0%,#64748b_40%,#f8fafc_50%,#64748b_60%,#64748b_100%)]">
      {children}
    </span>
  )
}

function OtpCard({
  channel,
  text,
  entered,
}: {
  channel: 'sms' | 'email'
  text: string
  /** Present only when the customer keyed the code in; otherwise auto-verified. */
  entered?: string
}) {
  const { t } = useTranslation('copilot')
  const digits = entered ? [...entered] : [...OTP_DIGITS]
  const channelLabel = t(channel === 'sms' ? 'otp.sms' : 'otp.email')
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.04] dark:shadow-[0_0_40px_-18px_rgba(16,185,129,0.5)] dark:ring-white/10 dark:backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-medium text-brand-navy dark:text-slate-100">
          {t('otp.identityVerified', { channel: channelLabel })}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text}</p>
      <div
        className="mt-3 grid grid-cols-6 gap-2"
        aria-label={t('otp.codeLabel', { digits: digits.join(' ') })}
      >
        {digits.map((d, i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 90}ms` }}
            className="grid h-11 place-items-center rounded-xl bg-brand-navy/[0.04] font-mono text-lg text-brand-navy ring-1 ring-brand-cyan/10 motion-safe:animate-digit-pop dark:bg-white/[0.05] dark:text-brand-cyan dark:ring-white/10"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

/** The live identity check. Replaced by an OtpCard once a code is submitted. */
function OtpChallengeNode({
  prompt,
  onSubmit,
}: {
  prompt: OtpPrompt
  onSubmit: (code: string) => void
}) {
  const { t } = useTranslation('copilot')
  const channelLabel = t(prompt.channel === 'sms' ? 'otp.sms' : 'otp.email')
  return (
    <li className="relative pl-9 motion-safe:animate-rise-in">
      <Node />
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-cyan/30 dark:bg-white/[0.04] dark:shadow-[0_0_40px_-18px_rgba(44,165,217,0.5)] dark:ring-brand-cyan/25 dark:backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-cyan/12 text-brand-cyan">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="text-[13px] font-medium text-brand-navy dark:text-slate-100">
            {t('otp.verifyIdentity', { channel: channelLabel })}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{prompt.text}</p>
        <OtpInput onSubmit={onSubmit} className="mt-3" />
      </div>
    </li>
  )
}

function SummaryCard({
  step,
  source,
  customer,
  reference,
}: {
  step: Extract<ChatStep, { kind: 'summary' }>
  source: string
  customer?: ReceiptCustomer
  reference: string | null
}) {
  const success = step.tone === 'success'
  const Icon = success ? CheckCircle2 : ClipboardCheck
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10 dark:backdrop-blur-xl">
      <div className={cn('h-0.5 w-full', success ? 'bg-emerald-400/70' : 'bg-brand-cyan/70')} />
      <div className="flex items-center gap-2 px-4 py-3 text-[13px] font-semibold text-brand-navy dark:text-slate-100">
        <Icon
          className={cn('h-4 w-4', success ? 'text-emerald-500 dark:text-emerald-300' : 'text-brand-cyan')}
        />
        {step.title}
        <ReceiptMenu
          title={step.title}
          rows={step.rows}
          reference={reference}
          customer={customer}
        />
      </div>
      <dl className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {step.rows.map(([k, v], i) => {
          const routed = /^(routed|processed)/i.test(k)
          return (
            <div
              key={k}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                'flex items-start justify-between gap-4 px-4 py-2.5 motion-safe:animate-row-reveal',
                routed && 'bg-slate-50 dark:bg-white/[0.02]',
              )}
            >
              <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {routed && (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      source === 'C2M' ? 'bg-brand-red' : 'bg-brand-cyan',
                    )}
                  />
                )}
                {k}
              </dt>
              <dd className="text-right text-[13px] font-medium text-brand-navy dark:text-slate-100">
                {v}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function DoneBand({ text }: { text: string }) {
  const { body, ref } = splitReference(text)
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5 text-[14px] text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/[0.07] dark:text-emerald-100 dark:shadow-[0_0_50px_-20px_rgba(16,185,129,0.6)] dark:ring-emerald-400/25 dark:backdrop-blur">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-300" />
      <span>
        {body}{' '}
        {ref && (
          <span className="ml-0.5 whitespace-nowrap rounded-md bg-white px-2 py-0.5 font-mono text-[12px] text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-0">
            {ref}
          </span>
        )}
      </span>
    </div>
  )
}

function ThinkingNode({ phrases }: { phrases: string[] }) {
  const { t } = useTranslation('copilot')
  const label = useCyclingPhrase(phrases)
  return (
    <li className="relative pl-9">
      <Node />
      <div className="flex items-center gap-2" aria-label={t('chat.working')}>
        <span key={label} className="text-sm font-medium">
          <Shimmer>{label}</Shimmer>
        </span>
        <span className="flex items-center gap-0.5">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="h-1 w-1 rounded-full bg-brand-cyan/70 motion-safe:animate-typing-bounce"
              style={{ animationDelay: `${d * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </li>
  )
}

function TypingNode() {
  return (
    <li className="relative pl-9" aria-hidden>
      <Node />
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brand-cyan/80 motion-safe:animate-typing-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </li>
  )
}
