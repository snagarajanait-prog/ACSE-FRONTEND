/**
 * The admin chrome shared by every admin page: the top bar, the persistent
 * sidebar (desktop) and its mobile drawer twin. Pages render their content as
 * `children`; the shell owns the layout and the drawer's open/close state.
 *
 * Splitting this out is what lets the file-upload page and the settings page
 * share one navigation without either owning it.
 */

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AdminSidebar from '@/containers/admin/components/AdminSidebar'
import type { AdminNav } from '@/containers/admin/components/AdminSidebar'
import AdminTopbar from '@/containers/admin/components/AdminTopbar'
import type { AdminSection } from '@/containers/admin/types'
import { cn } from '@/utils/cn'

interface AdminShellProps {
  active: AdminNav
  title?: string
  /** Live per-library counts for the sidebar badges (files page only). */
  counts?: Record<AdminSection, number>
  children: ReactNode
}

export default function AdminShell({ active, title, counts, children }: AdminShellProps) {
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = useCallback(() => setNavOpen(false), [])

  // Don't let the mobile drawer linger open across a resize into desktop, where
  // the rail is already persistent.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => mq.matches && closeNav()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [closeNav])

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 font-sans text-brand-navy antialiased transition-colors duration-300 dark:bg-brand-navydeep dark:text-slate-100">
      <AdminTopbar title={title} onOpenNav={() => setNavOpen(true)} />

      <div className="flex min-h-0 flex-1">
        {/* Persistent rail (desktop) */}
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-white/[0.06] dark:bg-brand-navy/20">
          <AdminSidebar active={active} counts={counts} />
        </aside>

        {/* `min-w-0` lets wide content (the table) shrink and scroll internally
            instead of blowing out the page width on phones. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Sidebar as a drawer (mobile) */}
      <NavDrawer open={navOpen} onClose={closeNav}>
        <AdminSidebar active={active} counts={counts} onNavigate={closeNav} />
      </NavDrawer>
    </div>
  )
}

/**
 * Left-hand slide-over that carries the sidebar on phones. `invisible` when
 * closed so its controls leave the tab order; scrim and Escape both close it.
 */
function NavDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation('admin')
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-brand-navy/30 transition-opacity duration-300 lg:hidden dark:bg-black/50',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        aria-label={t('shell.adminNav')}
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 max-w-[82vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:hidden dark:border-white/10 dark:bg-brand-navy',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none invisible',
        )}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shell.closeNav')}
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
