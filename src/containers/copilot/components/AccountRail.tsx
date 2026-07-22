/**
 * AccountRail — the compact account-context rail: the account presentation for
 * every viewport below `lg`, and the collapsed form of the desktop sidebar.
 *
 * A slim column of icons, one per context surface (contact, balance, usage,
 * notifications). Opening one reveals ONLY that surface, so the conversation
 * keeps the full width instead of a stacked panel competing for it.
 *
 * Presentation adapts to width (the rail spans phone → tablet):
 *   • ≥ sm : an anchored flyout to the right of the icon. Like ReceiptMenu it is
 *            `position: fixed` against a measured anchor and dismisses on outside
 *            scroll / resize / Esc / outside-click rather than chasing the thread.
 *   • < sm : a bottom sheet over a scrim, so a full card stays legible on a phone.
 *
 * The surrounding column (in the copilot screen) owns the border, background and
 * the collapse/expand handle; this component is just the icons + their panels.
 * The card bodies are the same ones the sidebar renders (./account/cards).
 */

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, Bell, Contact, CreditCard, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AccountSwitcher,
  BalanceContent,
  ContactContent,
  IdentityInfo,
  NotificationsContent,
  UsageContent,
} from '@/containers/copilot/components/account/cards'
import { useAccountContext } from '@/containers/copilot/components/account/useAccountContext'
import { cn } from '@/utils/cn'

const PANELS = [
  { id: 'contact', icon: Contact, titleKey: 'rail.contact' },
  { id: 'balance', icon: CreditCard, titleKey: 'rail.balance' },
  { id: 'usage', icon: BarChart3, titleKey: 'rail.usage' },
  { id: 'notifications', icon: Bell, titleKey: 'rail.notifications' },
] as const

type PanelId = (typeof PANELS)[number]['id']

/** Gap between the rail icon and its anchored flyout, in px. */
const GAP = 10
const PANEL_W = 320

export default function AccountRail() {
  const { t } = useTranslation('copilot')
  const { customer, account } = useAccountContext()

  const [open, setOpen] = useState<PanelId | null>(null)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const [isSheet, setIsSheet] = useState(false)

  const activeBtnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(null), [])

  // Below `sm` the panel is a bottom sheet; at `sm`+ it is an anchored flyout.
  // Crossing the boundary closes the panel — the anchor a flyout measured no
  // longer means anything once the layout has changed under it.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => {
      setIsSheet(mq.matches)
      setOpen(null)
    }
    mq.addEventListener('change', sync)
    setIsSheet(mq.matches)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Dismissal wiring, only while a panel is open.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      // The trigger owns its own toggle; closing here too would reopen it.
      if (activeBtnRef.current?.contains(target) || panelRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        activeBtnRef.current?.focus()
      }
    }
    // Close when the page/thread scrolls under a pinned flyout — but NOT when the
    // panel scrolls its own overflowing content (usage runs tall). Capture phase
    // catches the scrolling ancestor, which does not bubble.
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return
      close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    // A flyout is pinned to a measured anchor, so a resize invalidates it. The
    // sheet is full-width and needs no anchor, so it rides out resizes (a mobile
    // URL bar collapsing must not dismiss it).
    if (!isSheet) window.addEventListener('resize', close)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open, isSheet, close])

  // Hold the page still behind the bottom sheet.
  useEffect(() => {
    if (!open || !isSheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isSheet])

  if (!customer || !account) return null

  const toggle = (id: PanelId, e: MouseEvent<HTMLButtonElement>) => {
    if (open === id) {
      close()
      return
    }
    const btn = e.currentTarget
    activeBtnRef.current = btn
    const rect = btn.getBoundingClientRect()
    setAnchor({ top: rect.top, left: rect.right + GAP })
    setOpen(id)
  }

  const active = PANELS.find((p) => p.id === open) ?? null

  return (
    <>
      <nav
        aria-label={t('rail.sectionLabel')}
        className="flex w-14 shrink-0 flex-col items-center gap-1 px-2 py-3"
      >
        {PANELS.map(({ id, icon: Icon, titleKey }) => {
          const label = t(titleKey)
          const isActive = open === id
          return (
            <button
              key={id}
              onClick={(e) => toggle(id, e)}
              aria-expanded={isActive}
              aria-haspopup="dialog"
              aria-label={t('rail.open', { panel: label })}
              title={label}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
                isActive
                  ? 'bg-brand-cyan/10 text-brand-cyan'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-brand-navy dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          )
        })}
      </nav>

      {open &&
        active &&
        createPortal(
          isSheet ? (
            <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div
                aria-hidden
                onClick={close}
                className="absolute inset-0 bg-brand-navy/30 motion-safe:animate-fade-in dark:bg-black/60"
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-label={t(active.titleKey)}
                className="relative flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 motion-safe:animate-rise-in dark:bg-brand-navydeep dark:ring-white/10"
              >
                <span
                  aria-hidden
                  className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-300 dark:bg-white/20"
                />
                <PanelHeader icon={active.icon} title={t(active.titleKey)} onClose={close} />
                <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <PanelBody id={active.id} />
                </div>
              </div>
            </div>
          ) : (
            anchor && (
              <div
                ref={panelRef}
                role="dialog"
                aria-label={t(active.titleKey)}
                style={{
                  top: anchor.top,
                  left: anchor.left,
                  width: PANEL_W,
                  maxHeight: `calc(100dvh - ${anchor.top}px - ${GAP}px)`,
                }}
                className="fixed z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 motion-safe:animate-rise-in dark:bg-brand-navydeep dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] dark:ring-white/10"
              >
                <PanelHeader icon={active.icon} title={t(active.titleKey)} onClose={close} />
                <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-4">
                  <PanelBody id={active.id} />
                </div>
              </div>
            )
          ),
          document.body,
        )}
    </>
  )
}

function PanelHeader({
  icon: Icon,
  title,
  onClose,
}: {
  icon: typeof Bell
  title: string
  onClose: () => void
}) {
  const { t } = useTranslation('copilot')
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
      <Icon className="h-4 w-4 shrink-0 text-brand-cyan" />
      <p className="truncate text-sm font-semibold text-brand-navy dark:text-slate-100">{title}</p>
      <button
        onClick={onClose}
        aria-label={t('slideOver.close', { title })}
        className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function PanelBody({ id }: { id: PanelId }) {
  switch (id) {
    case 'contact':
      return (
        <div className="space-y-4">
          <IdentityInfo />
          <AccountSwitcher />
          <ContactContent />
        </div>
      )
    case 'balance':
      return <BalanceContent />
    case 'usage':
      return <UsageContent />
    case 'notifications':
      return <NotificationsContent />
  }
}
