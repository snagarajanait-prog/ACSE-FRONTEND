/**
 * The conversation, on the copilot's filament: one glowing cyan spine with every
 * turn hanging off a node, bubble-less prose for the assistant and a bubble only
 * for the customer.
 *
 * Deliberately a COPY of `copilot/components/ChatThread` rather than an import.
 * The two diverge in what a turn can contain — this thread's turns carry full
 * analysis cards, and the copilot's carry request summaries and OTP boxes — and
 * making one component serve both would mean a prop for every difference. The
 * shared thing worth keeping identical is the filament itself, and that is small
 * enough to hold in step by eye.
 */

import { useEffect, useRef, useState } from 'react'
import { BrainCircuit, CheckCircle2, ChevronDown, Loader2, Wrench } from 'lucide-react'
import Markdown from '@/containers/copilot/components/Markdown'
import { CARDS } from '@/containers/billreport/components/cardRegistry'
import type { BillMsg } from '@/containers/billreport/hooks/useBillChat'
import { cn } from '@/utils/cn'

interface BillThreadProps {
  messages: BillMsg[]
  playing: boolean
  /** Cycled under the spinner while the queue is between steps. */
  thinkingPhrases: string[]
}

export default function BillThread({ messages, playing, thinkingPhrases }: BillThreadProps) {
  const lastId = messages.length ? messages[messages.length - 1].id : -1

  // Split into exchanges so each question and its answer sit as one block, with
  // air between them. Only the live one announces itself to a screen reader.
  const groups: BillMsg[][] = []
  for (const m of messages) {
    const last = groups[groups.length - 1]
    if (last && last[0].turn === m.turn) last.push(m)
    else groups.push([m])
  }

  // While the queue is between steps the thread must show it is still working —
  // otherwise a 900ms gap before a paragraph reads as the demo having stalled.
  const tail = messages[messages.length - 1]
  const awaiting = playing && tail?.step.kind !== 'card'

  return (
    <div className="relative mx-auto w-full max-w-3xl px-5 pb-10 pt-8 md:px-0">
      <Filament active={playing} />

      {groups.map((group, gi) => (
        <section key={group[0].turn} className={cn(gi > 0 && 'mt-10')}>
          <ol
            role="log"
            aria-live={gi === groups.length - 1 ? 'polite' : 'off'}
            aria-relevant="additions"
            className="relative space-y-8"
          >
            {group.map((m) => (
              <Turn key={m.id} msg={m} isLast={m.id === lastId} playing={playing} />
            ))}
            {gi === groups.length - 1 && awaiting && <ThinkingNode phrases={thinkingPhrases} />}
          </ol>
        </section>
      ))}
    </div>
  )
}

/* ------------------------------- filament -------------------------------- */

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

function Node({ tone = 'cyan' }: { tone?: 'cyan' | 'dim' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute left-1.5 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full ring-4',
        tone === 'cyan' && 'bg-brand-cyan ring-brand-cyan/15',
        tone === 'dim' && 'bg-slate-300 ring-slate-200 dark:bg-slate-500 dark:ring-white/[0.04]',
      )}
    />
  )
}

/* --------------------------------- turns --------------------------------- */

function Turn({ msg, isLast, playing }: { msg: BillMsg; isLast: boolean; playing: boolean }) {
  const step = msg.step

  switch (step.kind) {
    case 'user':
      return (
        <li className="relative flex flex-col items-end pl-9 motion-safe:animate-rise-in">
          <span className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">You</span>
          <div className="w-fit max-w-[80%] rounded-2xl rounded-tr-md bg-brand-cyan px-4 py-2.5 text-[15px] leading-6 text-white dark:bg-white/[0.06] dark:text-slate-100 dark:ring-1 dark:ring-white/10 dark:backdrop-blur">
            {step.text}
          </div>
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

    case 'ai':
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <Node />
          <div className="max-w-[70ch] text-[15px] leading-7 text-slate-700 dark:text-slate-100/90">
            {step.reasoning && <ReasoningBlock text={step.reasoning} live={isLast && playing} />}
            {step.tools?.length ? <ToolTrace names={step.tools} /> : null}
            <Markdown text={step.text} />
          </div>
        </li>
      )

    case 'card': {
      const Card = CARDS[step.card]
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <Node />
          <Card />
        </li>
      )
    }

    case 'done':
      return (
        <li className="relative pl-9 motion-safe:animate-rise-in">
          <span aria-hidden className="absolute left-1.5 top-1.5 -translate-x-1/2">
            <span className="block h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
            <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50 motion-safe:animate-ring-out" />
          </span>
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5 text-[14px] text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/[0.07] dark:text-emerald-100 dark:shadow-[0_0_50px_-20px_rgba(16,185,129,0.6)] dark:ring-emerald-400/25 dark:backdrop-blur">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-300" />
            <span>{step.text}</span>
          </div>
        </li>
      )

    default:
      return null
  }
}

/**
 * The model's private reasoning. Streams open while the turn is live, then folds
 * itself the moment the turn settles — a finished turn shows the answer, with the
 * working available on demand.
 */
function ReasoningBlock({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = useState(live)
  const wasLive = useRef(live)

  useEffect(() => {
    if (wasLive.current && !live) setOpen(false)
    wasLive.current = live
  }, [live])

  return (
    <div className="mb-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500"
      >
        <BrainCircuit className="h-3.5 w-3.5" />
        Reasoning
        {live && <Loader2 className="h-3 w-3 animate-spin text-brand-cyan" />}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-500 dark:text-slate-400">
          {text}
        </div>
      )}
    </div>
  )
}

/** What the assistant did this turn — names only, never a tool's output. */
function ToolTrace({ names }: { names: string[] }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Tools used
      </span>
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-full bg-brand-cyan/10 px-2 py-0.5 font-mono text-[11px] text-brand-cyan ring-1 ring-brand-cyan/20"
        >
          <Wrench className="h-3 w-3" />
          {name}
        </span>
      ))}
    </div>
  )
}

function Shimmer({ children }: { children: React.ReactNode }) {
  return (
    <span className="animate-shimmer bg-clip-text text-transparent [background-image:linear-gradient(90deg,#94a3b8_0%,#94a3b8_40%,#0a1e35_50%,#94a3b8_60%,#94a3b8_100%)] [background-size:200%_100%] dark:[background-image:linear-gradient(90deg,#64748b_0%,#64748b_40%,#f8fafc_50%,#64748b_60%,#64748b_100%)]">
      {children}
    </span>
  )
}

function ThinkingNode({ phrases }: { phrases: string[] }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % phrases.length), 1900)
    return () => clearInterval(id)
  }, [phrases.length])

  return (
    <li className="relative pl-9">
      <Node />
      <div className="flex items-center gap-2" aria-label="Working">
        <span key={i} className="text-sm font-medium">
          <Shimmer>{phrases[i]}</Shimmer>
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
