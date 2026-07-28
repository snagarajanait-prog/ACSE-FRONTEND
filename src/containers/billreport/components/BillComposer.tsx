/**
 * The docked composer, with the follow-up questions as chips above it.
 *
 * The chips are the real interface here. Nothing on this screen is wired to a
 * model, so a free-text box that answers anything would be a lie — instead the
 * chips advertise exactly what the demo can do, and typing is routed to the same
 * scripted answers by keyword, with an honest miss when nothing matches (see
 * `askFreeText`). A demo that says "I can't answer that" beats one that
 * hallucinates in front of a client.
 *
 * Chips disappear once asked, so the rail always shows what is left rather than
 * inviting the same question twice.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CornerDownLeft, Send, ShieldAlert, Sparkles } from 'lucide-react'
import type { FollowUp } from '@/containers/billreport/script'
import { cn } from '@/utils/cn'
import { findUnsafeCode } from '@/utils/inputGuard'

/** Shown when a paste is stopped, and when a typed message is refused at send. */
const PASTE_REFUSED =
  "For security, code, scripts and markup can't be pasted into the chat. Type your question in plain words."
const SEND_REFUSED =
  "That message looks like code or a script, so it wasn't sent. Ask in plain words and I'll help."

interface BillComposerProps {
  /**
   * "hero" is the state before anything has been asked: the suggested opening
   * question sits above the box as a chip to be tapped, NOT pre-filled and never
   * sent automatically. "dock" is the running conversation.
   */
  mode: 'hero' | 'dock'
  followUps: FollowUp[]
  onAsk: (followUp: FollowUp) => void
  onSend: (text: string) => void
  /** The opening question offered in hero mode. */
  suggestion?: string
  /** True while the thread is still drawing — the input locks rather than queues. */
  playing: boolean
}

export default function BillComposer({
  mode,
  followUps,
  onAsk,
  onSend,
  suggestion,
  playing,
}: BillComposerProps) {
  const [draft, setDraft] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  /** Why a paste or a send was refused, shown under the box. See `refuse`. */
  const [refusal, setRefusal] = useState<string | null>(null)
  const refusalTimer = useRef<number | null>(null)

  const refuse = useCallback((message: string) => {
    setRefusal(message)
    if (refusalTimer.current !== null) window.clearTimeout(refusalTimer.current)
    refusalTimer.current = window.setTimeout(() => setRefusal(null), 8000)
  }, [])

  useEffect(
    () => () => {
      if (refusalTimer.current !== null) window.clearTimeout(refusalTimer.current)
    },
    [],
  )

  // Grow with the draft, to the same 200px ceiling the copilot composer uses.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(200, ta.scrollHeight)}px`
  }, [draft])

  /* Code, scripts and markup are refused at the box — same guard and the same
   * three doors (paste, drop, send) as the copilot composer. See
   * `utils/inputGuard` for what counts and why typing is left alone. */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!findUnsafeCode(e.clipboardData.getData('text/plain'))) return
    e.preventDefault()
    refuse(PASTE_REFUSED)
  }

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.files.length || findUnsafeCode(e.dataTransfer.getData('text/plain'))) {
      e.preventDefault()
      refuse(PASTE_REFUSED)
    }
  }

  function send() {
    const text = draft.trim()
    if (!text || playing) return
    if (findUnsafeCode(text)) {
      refuse(SEND_REFUSED)
      return
    }
    setRefusal(null)
    setDraft('')
    onSend(text)
  }

  return (
    <div>
      {/* Hero: the opening question, offered. Tapping it sends; it is never
          sent for the customer and never pre-filled into the box, so the first
          turn in the thread is always something they chose to send. */}
      {mode === 'hero' && suggestion && (
        <button
          type="button"
          onClick={() => onSend(suggestion)}
          disabled={playing}
          className="group mb-4 flex w-full items-start gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm outline-none ring-1 ring-slate-200 transition hover:ring-brand-cyan focus-visible:ring-2 focus-visible:ring-brand-cyan active:scale-[0.99] disabled:opacity-50 dark:bg-white/[0.05] dark:ring-white/10 dark:backdrop-blur dark:hover:ring-brand-cyan/50"
        >
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-cyan/10 text-brand-cyan">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Suggested
            </span>
            <span className="mt-0.5 block text-[14px] leading-6 text-brand-navy dark:text-slate-100">
              {suggestion}
            </span>
          </span>
          <span className="mt-0.5 hidden shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-brand-cyan sm:flex">
            <CornerDownLeft className="h-3 w-3" />
            Send
          </span>
        </button>
      )}

      {mode === 'dock' && !playing && followUps.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="flex shrink-0 items-center pl-1 pr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Ask
          </span>
          {followUps.map((f) => (
            <button
              key={f.id}
              onClick={() => onAsk(f)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 outline-none ring-1 ring-slate-200 transition hover:bg-brand-cyan/[0.06] hover:text-brand-cyan hover:ring-brand-cyan focus-visible:ring-2 focus-visible:ring-brand-cyan active:scale-95 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10 dark:backdrop-blur dark:hover:bg-brand-cyan/10 dark:hover:text-white dark:hover:ring-brand-cyan/40"
            >
              <f.Icon className="h-3.5 w-3.5 text-brand-cyan" />
              {f.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'dock' && !playing && followUps.length === 0 && (
        <p className="mb-3 flex items-center gap-1.5 pl-1 text-[11.5px] text-slate-400 dark:text-slate-500">
          <CornerDownLeft className="h-3 w-3" />
          Every scripted question has been asked — replay from the header to start over.
        </p>
      )}

      <div className="flex items-end gap-2 rounded-[28px] bg-white px-3 py-2.5 shadow-[0_12px_40px_-20px_rgba(10,30,53,0.25)] ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-cyan/50 dark:bg-white/[0.06] dark:shadow-[0_12px_60px_-16px_rgba(44,165,217,0.4)] dark:ring-white/[0.12] dark:backdrop-blur-2xl dark:focus-within:ring-brand-cyan/40">
        <Sparkles className="mb-2.5 ml-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <textarea
          ref={taRef}
          rows={1}
          value={draft}
          onChange={(e) => {
            setRefusal(null)
            setDraft(e.target.value)
          }}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          disabled={playing}
          placeholder={
            playing
              ? 'Analysing the report…'
              : mode === 'hero'
                ? 'Ask about this account — or tap the suggestion above'
                : 'Ask about the bill — or pick a question above'
          }
          className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-brand-navy outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          onClick={send}
          disabled={playing || !draft.trim()}
          aria-label="Send"
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-cyan text-white shadow-[0_6px_16px_-6px_rgba(44,165,217,0.7)] outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-30 disabled:shadow-none dark:text-brand-navydeep dark:shadow-[0_0_20px_-4px_rgba(44,165,217,0.7)] dark:hover:scale-105 dark:focus-visible:ring-offset-brand-navydeep',
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* This row used to be held open by an empty paragraph, so that a refusal
          could take the standing disclaimer's place without shifting anything.
          The disclaimer text is gone, so all that reserved was ~24px of dead
          space under the box — which read as an unexplained gap in hero mode and
          padded the dock for nothing. A refusal is transient and rare, so it now
          adds its own row rather than every layout paying for one. */}
      {refusal && (
        <p
          role="alert"
          className="mt-2 flex items-start justify-center gap-1.5 text-center text-[11px] leading-4 text-amber-600 dark:text-amber-400"
        >
          <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {refusal}
        </p>
      )}
    </div>
  )
}
