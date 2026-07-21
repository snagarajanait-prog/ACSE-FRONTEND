/**
 * The input. Two modes share one implementation so the hero and docked states
 * can never drift apart:
 *   - "hero": pills wrap and centre under a large, calm entry box.
 *   - "dock": pills become a single scrolling row above the box, and hide while
 *     a storyboard plays (nothing new can be started mid-flight anyway).
 */

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EnginePill } from '@/containers/copilot/hooks/useChatEngine'
import { cn } from '@/utils/cn'

interface ComposerProps {
  mode: 'hero' | 'dock'
  draft: string
  setDraft: (v: string) => void
  onSend: () => void
  playing: boolean
  pills: EnginePill[]
  onStartScenario: (id: string) => void
  /** Neutral name of the active mode, shown in the disclaimer line. */
  sourceLabel: string
  /**
   * Idle placeholder for roomy layouts. Narrow ones fall back to a short
   * placeholder automatically — see `useNarrow`. Defaults to the copilot
   * composer placeholder when omitted.
   */
  placeholder?: string
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return narrow
}

export default function Composer({
  mode,
  draft,
  setDraft,
  onSend,
  playing,
  pills,
  onStartScenario,
  sourceLabel,
  placeholder,
}: ComposerProps) {
  const { t } = useTranslation('copilot')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const narrow = useNarrow()
  const roomyPlaceholder = placeholder ?? t('composer.placeholder')

  // Auto-grow the textarea with the draft.
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(200, ta.scrollHeight)}px`
  }, [draft])

  return (
    <div>
      {mode === 'hero' ? (
        // `mb-5` is not decoration: the pills wrap to two or three rows on
        // narrow viewports, and without it the last row sits flush against the
        // composer's rounded edge.
        <div className="mb-5 mt-4 flex flex-wrap justify-center gap-2">
          {pills.map((u) => (
            <Chip
              key={u.id}
              pill={u}
              label={t(`useCases.${u.id}`, u.label)}
              disabled={playing}
              onClick={() => onStartScenario(u.id)}
            />
          ))}
        </div>
      ) : (
        !playing && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pills.map((u) => (
              <Chip
                key={u.id}
                pill={u}
                label={t(`useCases.${u.id}`, u.label)}
                disabled={playing}
                onClick={() => onStartScenario(u.id)}
                className="shrink-0"
              />
            ))}
          </div>
        )
      )}

      <div className="flex items-end gap-2 rounded-[28px] bg-white px-3 py-2.5 shadow-[0_12px_40px_-20px_rgba(10,30,53,0.25)] ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-cyan/50 dark:bg-white/[0.06] dark:shadow-[0_12px_60px_-16px_rgba(44,165,217,0.4)] dark:ring-white/[0.12] dark:backdrop-blur-2xl dark:focus-within:ring-brand-cyan/40">
        <Sparkles className="mb-2.5 ml-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <textarea
          ref={taRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          disabled={playing}
          placeholder={
            playing
              ? t('composer.responding')
              : narrow
                ? t('composer.shortPlaceholder')
                : roomyPlaceholder
          }
          className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-brand-navy outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          onClick={onSend}
          disabled={playing || !draft.trim()}
          aria-label={t('composer.send')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-cyan text-white shadow-[0_6px_16px_-6px_rgba(44,165,217,0.7)] outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-30 disabled:shadow-none dark:text-brand-navydeep dark:shadow-[0_0_20px_-4px_rgba(44,165,217,0.7)] dark:hover:scale-105 dark:focus-visible:ring-offset-brand-navydeep"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        {t('composer.disclaimer', { source: sourceLabel })}
      </p>
    </div>
  )
}

function Chip({
  pill,
  label,
  onClick,
  disabled,
  className,
}: {
  pill: EnginePill
  label: string
  onClick: () => void
  disabled: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 outline-none ring-1 ring-slate-200 transition hover:bg-brand-cyan/[0.06] hover:text-brand-cyan hover:ring-brand-cyan focus-visible:ring-2 focus-visible:ring-brand-cyan active:scale-95 disabled:opacity-40 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10 dark:backdrop-blur dark:hover:bg-brand-cyan/10 dark:hover:text-white dark:hover:ring-brand-cyan/40',
        className,
      )}
    >
      <pill.Icon className="h-3.5 w-3.5 text-brand-cyan" />
      {label}
    </button>
  )
}
