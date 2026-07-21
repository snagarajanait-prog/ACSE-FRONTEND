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
 *
 * Export downloads a single PDF. There is one obvious way a customer wants a
 * conversation out of the app, so it is a plain button rather than a format
 * menu — the fewer choices, the faster the take-away.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Msg } from '@/containers/copilot/hooks/useChatEngine'
import {
  buildTranscript,
  hasExportableContent,
  type TranscriptContext,
} from '@/containers/copilot/utils/transcript'
import { cn } from '@/utils/cn'
import { copyText } from '@/utils/clipboard'
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
  const { t } = useTranslation('copilot')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)
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

  if (!hasExportableContent(messages)) return null

  /** Built per click, so a transcript always reflects the thread as it stands. */
  const transcript = () => buildTranscript(messages, context)

  async function handleCopy() {
    const ok = await copyText(transcript().text)
    report('copy', ok ? t('actions.copied') : t('actions.copyFailed'), ok ? 'ok' : 'error')
  }

  async function handleShare() {
    const payload = transcript()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: payload.title, text: payload.text })
        return
      } catch (error) {
        // A dismissed share sheet is a decision, not a failure — say nothing.
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[transcript] share failed', error)
      }
    }
    const ok = await copyText(payload.text)
    report(
      'share',
      ok ? t('actions.sharedCopied') : t('actions.shareFailed'),
      ok ? 'ok' : 'error',
    )
  }

  async function handleExport() {
    setBusy(true)
    try {
      await downloadTranscriptPdf(transcript())
      report('export', t('actions.downloaded'))
    } catch (error) {
      // A failed download gives no signal of its own — this is the only feedback.
      console.error('[transcript] export failed', error)
      report('export', t('actions.exportFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const copied = feedback?.action === 'copy' && feedback.tone === 'ok'
  const shared = feedback?.action === 'share' && feedback.tone === 'ok'

  return (
    <div className="mt-8 pl-9 motion-safe:animate-rise-in">
      <div className="flex flex-wrap items-center gap-1 border-t border-slate-200/80 pt-3 dark:border-white/[0.07]">
        <button
          type="button"
          onClick={handleCopy}
          className={BUTTON_CLASS}
          aria-label={t('actions.copyLabel')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? t('actions.copied') : t('actions.copy')}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className={BUTTON_CLASS}
          aria-label={t('actions.shareLabel')}
        >
          {shared ? (
            <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {t('actions.share')}
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className={BUTTON_CLASS}
          aria-label={t('actions.exportLabel')}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {busy ? t('actions.preparing') : t('actions.exportPdf')}
        </button>

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
