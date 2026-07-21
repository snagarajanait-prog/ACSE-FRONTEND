/**
 * The ⓘ affordance on a request-summary card: reveals what the card is, and
 * offers it as a downloadable PDF receipt.
 *
 * The panel is rendered through a portal rather than inside the card. SummaryCard
 * is `overflow-hidden` — that clip is load-bearing (it rounds the accent bar and
 * the tinted "Routed to" row against the card's corners), so an in-flow popover
 * would be sliced off at the card edge. Portalling keeps the card's styling intact.
 *
 * Because the panel is `position: fixed` against a measured anchor, it closes on
 * scroll and resize instead of trying to track the button — the thread scrolls
 * under it, and a detached panel chasing its anchor reads as a bug.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Info, Loader2 } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { downloadReceiptPdf, type ReceiptCustomer } from '@/utils/receipt'

interface ReceiptMenuProps {
  title: string
  rows: [string, string][]
  /** Reference id, once the closing line has played. Omitted until then. */
  reference?: string | null
  customer?: ReceiptCustomer
}

type Status = 'idle' | 'working' | 'error'

/** Distance between the button and the panel, in px. */
const GAP = 8
const PANEL_W = 260

export default function ReceiptMenu({ title, rows, reference, customer }: ReceiptMenuProps) {
  const { t } = useTranslation('copilot')
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null)

  /**
   * The ⓘ pings until this card's own menu is opened — state is per-card, so a
   * card the user has already dealt with stays quiet while every new one still
   * advertises itself. Nothing times it out: an unopened receipt keeps asking to
   * be noticed for as long as it goes unopened.
   */
  const [hinting, setHinting] = useState(true)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setStatus('idle')
  }, [])

  const toggle = useCallback(() => {
    // Opening it is the proof the cue worked, for this card. Other cards keep
    // their own ping until they are opened in turn.
    setHinting(false)

    setOpen((wasOpen) => {
      if (wasOpen) return false
      const rect = buttonRef.current?.getBoundingClientRect()
      if (rect) {
        // Clamp so the panel never hangs off the left edge on a narrow viewport.
        const right = Math.min(
          window.innerWidth - rect.right,
          Math.max(8, window.innerWidth - PANEL_W - 8),
        )
        setAnchor({ top: rect.bottom + GAP, right })
      }
      return true
    })
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      // The button owns its own toggle — closing here too would immediately
      // reopen it on the following click.
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    // `true` catches the scrolling ancestor, which does not bubble scroll events.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  async function handleDownload() {
    setStatus('working')
    try {
      await downloadReceiptPdf({ title, rows, reference, customer })
      close()
    } catch (error) {
      // Leave the panel open — the message is the only feedback the user gets,
      // and the download gave no other signal that it failed.
      console.error('[receipt] PDF generation failed', error)
      setStatus('error')
    }
  }

  const working = status === 'working'

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('receiptMenu.about', { title })}
        title={t('receiptMenu.trigger')}
        className={cn(
          'relative -my-1 -mr-1 ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full outline-none transition-colors hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan aria-expanded:bg-brand-cyan/10 aria-expanded:text-brand-cyan dark:hover:bg-white/10 dark:hover:text-slate-100',
          // While hinting, the resting colour is the brand cyan rather than a
          // muted slate. This is what carries the cue for anyone running
          // reduced motion, who never sees the ping below.
          hinting
            ? 'bg-brand-cyan/10 text-brand-cyan'
            : 'text-slate-400 dark:text-slate-500',
        )}
      >
        {hinting && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-brand-cyan/40 motion-safe:animate-ping"
          />
        )}
        {/* Above the ping layer, which is absolutely positioned over the button. */}
        <Info className="relative h-4 w-4" />
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t('receiptMenu.dialogLabel')}
            style={{ top: anchor.top, right: anchor.right, width: PANEL_W }}
            className="fixed z-50 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200 motion-safe:animate-rise-in dark:bg-brand-navydeep dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] dark:ring-white/10"
          >
            <p className="text-[13px] font-semibold text-brand-navy dark:text-slate-100">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {reference ? (
                <Trans
                  t={t}
                  i18nKey="receiptMenu.recordWithRef"
                  values={{ reference }}
                  components={{
                    1: (
                      <span className="whitespace-nowrap font-mono text-[11px] text-brand-navy dark:text-slate-200" />
                    ),
                  }}
                />
              ) : (
                t('receiptMenu.recordPlain')
              )}
            </p>

            <button
              type="button"
              onClick={handleDownload}
              disabled={working}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-cyan px-3 py-2 text-[13px] font-medium text-white outline-none transition-colors hover:bg-brand-cyan/90 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 disabled:opacity-70 dark:focus-visible:ring-offset-brand-navydeep"
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {working ? t('receiptMenu.preparing') : t('receiptMenu.download')}
            </button>

            {status === 'error' && (
              <p role="alert" className="mt-2 text-xs text-brand-red">
                {t('receiptMenu.error')}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
