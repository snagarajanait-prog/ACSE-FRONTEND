/**
 * Admin → "Internal File Upload" — the file library page.
 *
 * The whole admin area sits behind `AdminGate`: the route stays public in
 * `routes.ts`, but the gate shows the sign-in screen until there's a session, so
 * the page below (and its hooks) never mount for a signed-out visitor.
 *
 * Document and Image are separate sidebar destinations distinguished by the
 * `?lib=` search param, so each library is its own linkable URL while sharing
 * this one page. All content state — search, sort, working set, uploads,
 * deletes — lives in `useAdminFiles`.
 */

import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AdminGate from '@/containers/admin/auth/AdminGate'
import {
  AdminShell,
  ConfirmDeleteDialog,
  EmptyState,
  FileTable,
  FileToolbar,
  UploadModal,
} from '@/containers/admin/components'
import { useAdminFiles } from '@/containers/admin/hooks/useAdminFiles'
import type { AdminSection } from '@/containers/admin/types'

export default function AdminPage() {
  return (
    <AdminGate>
      <Admin />
    </AdminGate>
  )
}

function Admin() {
  const { t } = useTranslation('admin')
  const [params] = useSearchParams()
  const section: AdminSection = params.get('lib') === 'image' ? 'image' : 'document'

  const admin = useAdminFiles(section)
  const searching = admin.query.trim().length > 0

  return (
    <AdminShell
      active={section === 'image' ? 'images' : 'documents'}
      title={t(`shell.nav.${section}`)}
      counts={admin.counts}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <FileToolbar
          section={section}
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

      <UploadModal
        open={admin.uploadOpen}
        section={section}
        onClose={admin.closeUpload}
        onSubmit={admin.addFiles}
      />

      <ConfirmDeleteDialog
        record={admin.pendingDelete}
        onCancel={admin.cancelDelete}
        onConfirm={admin.confirmDelete}
      />
    </AdminShell>
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
  const { t } = useTranslation('admin')
  return (
    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
      {searching ? (
        <Trans
          t={t}
          i18nKey="files.summary.showing"
          values={{ shown, total }}
          components={{ 1: <span className="font-semibold text-brand-navy dark:text-slate-200" /> }}
        />
      ) : (
        <Trans
          t={t}
          i18nKey="files.summary.total"
          count={total}
          components={{ 1: <span className="font-semibold text-brand-navy dark:text-slate-200" /> }}
        />
      )}
    </p>
  )
}
