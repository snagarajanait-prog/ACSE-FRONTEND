/**
 * The take-away bar that closes a settled conversation: Copy, Share, Export —
 * the same three affordances a customer already knows from Claude and ChatGPT,
 * so nobody has to be taught what they do.
 *
 * It appears only once the thread is at rest (nothing playing, thinking, typing
 * or waiting on a code) and only when something has actually been discussed.
 * Offering to export mid-storyboard would hand over half a conversation, and the
 * row appearing under a live assistant turn reads as the assistant's own output.
 *
 * Share degrades honestly. `navigator.share` only exists in a secure context and
 * mostly on mobile, so where it is missing this copies the transcript instead
 * and *says so* — the alternative, a disabled button, gives a desktop user no
 * way to get the conversation out at all.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlignLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  FileText,
  Loader2,
  Share2,
} from 'lucide-react'
import type { Msg } from '@/containers/copilot/hooks/useChatEngine'
import {
  buildTranscript,
  hasExportableContent,
  type TranscriptContext,
} from '@/containers/copilot/utils/transcript'
import { cn } from '@/utils/cn'
import { copyText } from '@/utils/clipboard'
import { downloadTextFile } from '@/utils/download'
import { downloadTranscriptPdf } from '@/utils/transcriptPdf'

interface ChatActionsProps extends TranscriptContext {
  messages: Msg[]
}

type ActionId = 'copy' | 'share' | 'export'

interface Feedback {
  action: ActionId
  message: string
  tone: 'ok' | 'error'
}

/** How long a confirmation stays up before the row returns to rest. */
const FEEDBACK_MS = 2400

const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-slate-500 outline-none ring-1 ring-transparent transition hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan active:scale-95 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-slate-100'

export default function ChatActions({ messages, ...context }: ChatActionsProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const report = useCallback((action: ActionId, message: string, tone: Feedback['tone'] = 'ok') => {
    setFeedback({ action, message, tone })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFeedback(null), FEEDBACK_MS)
  }, [])

  // A pending confirmation must not fire into an unmounted row — the thread is
  // reset wholesale on "New chat" and on every account switch.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      // The button owns its own toggle; closing here too would reopen it.
      if (exportRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      exportRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  if (!hasExportableContent(messages)) return null

  /** Built per click, so a transcript always reflects the thread as it stands. */
  const transcript = () => buildTranscript(messages, context)

  async function handleCopy() {
    const ok = await copyText(transcript().text)
    report('copy', ok ? 'Copied' : 'Copy failed', ok ? 'ok' : 'error')
  }

  async function handleShare() {
    const t = transcript()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t.title, text: t.text })
        return
      } catch (error) {
        // A dismissed share sheet is a decision, not a failure — say nothing.
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[transcript] share failed', error)
      }
    }
    const ok = await copyText(t.text)
    report(
      'share',
      ok ? 'Copied — paste to share' : 'Could not share',
      ok ? 'ok' : 'error',
    )
  }

  async function handleExport(format: 'pdf' | 'md' | 'txt') {
    setMenuOpen(false)
    setBusy(true)
    try {
      const t = transcript()
      if (format === 'pdf') await downloadTranscriptPdf(t)
      else if (format === 'md') downloadTextFile(t.markdown, `${t.fileBase}.md`, 'text/markdown')
      else downloadTextFile(t.text, `${t.fileBase}.txt`, 'text/plain')
      report('export', 'Downloaded')
    } catch (error) {
      // A failed download gives no signal of its own — this is the only feedback.
      console.error('[transcript] export failed', error)
      report('export', 'Export failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const copied = feedback?.action === 'copy' && feedback.tone === 'ok'
  const shared = feedback?.action === 'share' && feedback.tone === 'ok'

  return (
    <div className="mt-8 pl-9 motion-safe:animate-rise-in">
      <div className="flex flex-wrap items-center gap-1 border-t border-slate-200/80 pt-3 dark:border-white/[0.07]">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
          End of conversation
        </span>

        <button type="button" onClick={handleCopy} className={BUTTON_CLASS} aria-label="Copy transcript">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>

        <button type="button" onClick={handleShare} className={BUTTON_CLASS} aria-label="Share transcript">
          {shared ? (
            <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          Share
        </button>

        {/* The button and its panel share one positioning context, so the panel
            hangs off the *button* rather than off the row. Anchoring it to the
            row (as an earlier version did) left it stranded at the far left,
            and it would drift again the moment the row wrapped or a label
            changed width. */}
        <div className="relative">
          <button
            ref={exportRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={busy}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={cn(
              BUTTON_CLASS,
              'aria-expanded:bg-brand-cyan/10 aria-expanded:text-brand-cyan',
            )}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {busy ? 'Preparing…' : 'Export'}
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', menuOpen && 'rotate-180')}
              aria-hidden
            />
          </button>

          {menuOpen && (
            /* Opens upward and ranged left from the button's right edge: the row
               sits at the foot of the thread, so a downward panel would be
               clipped by the scroll container, and a leftward one keeps the
               panel clear of the viewport edge on a narrow screen. */
            <div
              ref={menuRef}
              role="menu"
              aria-label="Export format"
              className="absolute bottom-full right-0 z-30 mb-2 w-56 origin-bottom-right overflow-hidden rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200 motion-safe:animate-rise-in dark:bg-brand-navydeep dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] dark:ring-white/10"
            >
              <ExportItem
                icon={FileText}
                label="PDF document"
                hint="Formatted, ready to print"
                onSelect={() => handleExport('pdf')}
              />
              <ExportItem
                icon={FileCode2}
                label="Markdown (.md)"
                hint="For tickets and wikis"
                onSelect={() => handleExport('md')}
              />
              <ExportItem
                icon={AlignLeft}
                label="Plain text (.txt)"
                hint="Paste anywhere"
                onSelect={() => handleExport('txt')}
              />
            </div>
          )}
        </div>

        {/* One live region for every outcome, so a screen reader hears the result
            the icon swap only shows. A success stays sr-only — the button label
            already carries it visually, and printing it twice reads as a stutter.
            A failure has no such visual, so it is shown. */}
        <span
          role="status"
          aria-live="polite"
          className={cn(
            'ml-1 text-[12px]',
            feedback?.tone === 'error' ? 'text-brand-red' : 'sr-only',
          )}
        >
          {feedback?.message}
        </span>
      </div>
    </div>
  )
}

function ExportItem({
  icon: Icon,
  label,
  hint,
  onSelect,
}: {
  icon: typeof FileText
  label: string
  hint: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-white/[0.07] dark:focus-visible:bg-white/[0.07]"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
      <span>
        <span className="block text-[13px] font-medium text-brand-navy dark:text-slate-100">
          {label}
        </span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </button>
  )
}
