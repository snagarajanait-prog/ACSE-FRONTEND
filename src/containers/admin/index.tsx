/**
 * Admin panel — "Internal File Upload".
 *
 * No auth yet: the route is public (see routes.ts), so hitting /admin drops you
 * straight in. When login lands, gate this behind the admin role.
 *
 * This entry reads like a table of contents. Every piece of state — the active
 * library, search, sort, the working set, uploads and deletes — lives in
 * `useAdminFiles`; everything here just wires that hook to the components.
 *
 * Theming is global (`.dark` on <html> via ThemeProvider), so components style
 * themselves with plain `dark:` variants.
 */

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  AdminSidebar,
  AdminTopbar,
  ConfirmDeleteDialog,
  EmptyState,
  FileTable,
  FileToolbar,
  UploadModal,
} from '@/containers/admin/components'
import { useAdminFiles } from '@/containers/admin/hooks/useAdminFiles'
import { cn } from '@/utils/cn'

export default function Admin() {
  const admin = useAdminFiles()
  const [navOpen, setNavOpen] = useState(false)
  const closeNav = useCallback(() => setNavOpen(false), [])

  // Keep the mobile drawer from lingering open across a resize into desktop,
  // where the sidebar is already persistent.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => mq.matches && closeNav()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [closeNav])

  const searching = admin.query.trim().length > 0

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 font-sans text-brand-navy antialiased transition-colors duration-300 dark:bg-brand-navydeep dark:text-slate-100">
      <AdminTopbar onOpenNav={() => setNavOpen(true)} />

      <div className="flex min-h-0 flex-1">
        {/* Persistent rail (desktop) */}
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-white/[0.06] dark:bg-brand-navy/20">
          <AdminSidebar
            active={admin.section}
            counts={admin.counts}
            onSelect={admin.setSection}
          />
        </aside>

        {/* Main content — `min-w-0` lets the table's card shrink and scroll
            internally instead of blowing out the page width on phones. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <FileToolbar
              section={admin.section}
              query={admin.query}
              onQueryChange={admin.setQuery}
              onUpload={admin.openUpload}
            />

            <ResultsSummary
              shown={admin.visible.length}
              total={admin.totalInSection}
              searching={searching}
            />

            <FileTable
              rows={admin.visible}
              sort={admin.sort}
              sortLabels={admin.sortLabels}
              onToggleSort={admin.toggleSort}
              onDownload={admin.download}
              onDelete={admin.requestDelete}
              empty={
                <EmptyState
                  searching={searching}
                  onUpload={admin.openUpload}
                  onClearSearch={() => admin.setQuery('')}
                />
              }
            />
          </div>
        </main>
      </div>

      {/* Sidebar as a drawer (mobile) */}
      <NavDrawer open={navOpen} onClose={closeNav}>
        <AdminSidebar
          active={admin.section}
          counts={admin.counts}
          onSelect={admin.setSection}
          onNavigate={closeNav}
        />
      </NavDrawer>

      <UploadModal
        open={admin.uploadOpen}
        section={admin.section}
        onClose={admin.closeUpload}
        onSubmit={admin.addFiles}
      />

      <ConfirmDeleteDialog
        record={admin.pendingDelete}
        onCancel={admin.cancelDelete}
        onConfirm={admin.confirmDelete}
      />
    </div>
  )
}

/** The "Showing 4 of 9 documents" line above the table. */
function ResultsSummary({
  shown,
  total,
  searching,
}: {
  shown: number
  total: number
  searching: boolean
}) {
  return (
    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
      {searching ? (
        <>
          Showing <span className="font-semibold text-brand-navy dark:text-slate-200">{shown}</span>{' '}
          of {total}
        </>
      ) : (
        <>
          <span className="font-semibold text-brand-navy dark:text-slate-200">{total}</span>{' '}
          {total === 1 ? 'file' : 'files'}
        </>
      )}
    </p>
  )
}

/**
 * Left-hand slide-over that carries the sidebar on phones. Mirrors the copilot's
 * SlideOver behaviour: `invisible` when closed so its controls leave the tab
 * order, scrim closes on click, Escape closes.
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
        aria-label="Admin sections"
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
            aria-label="Close navigation"
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
