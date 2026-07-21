/**
 * Slide-over used for the account panel on smaller viewports.
 *
 * When closed it is `invisible` (not just translated off-screen), so its
 * controls leave the tab order and accessibility tree — closed panels never trap
 * keyboard focus. `onClose` should be a stable callback (useCallback).
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  title: string
  children: ReactNode
}

export default function SlideOver({
  open,
  onClose,
  side = 'left',
  title,
  children,
}: SlideOverProps) {
  const { t } = useTranslation('copilot')
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const closedTranslate = side === 'left' ? '-translate-x-full' : 'translate-x-full'

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-brand-navy/20 transition-opacity duration-300 dark:bg-black/40',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        aria-label={title}
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 z-40 flex w-[340px] max-w-[88vw] flex-col shadow-2xl transition-transform duration-300',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          'border-slate-200 bg-white dark:border-white/10 dark:bg-brand-navy/95 dark:backdrop-blur-2xl',
          open ? 'translate-x-0' : cn(closedTranslate, 'pointer-events-none invisible'),
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <p className="text-sm font-semibold text-brand-navy dark:text-slate-100">{title}</p>
          <button
            onClick={onClose}
            aria-label={t('slideOver.close', { title })}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </>
  )
}
