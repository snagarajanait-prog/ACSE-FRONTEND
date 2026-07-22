/**
 * The file library table.
 *
 * Sortable text/date columns (a header button toggles direction); Download and
 * Action are plain. The whole thing scrolls horizontally inside its card on
 * narrow screens rather than squashing columns — `min-w-[720px]` on the table
 * guarantees the layout the header background is drawn for.
 */

import type { ReactNode } from 'react'
import { ChevronDown, ChevronsUpDown, Download, FileText, Image as ImageIcon, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FileRecord, SortKey, SortState } from '@/containers/admin/types'
import { avatarTone, fileExt, formatBytes, formatDate, initials } from '@/containers/admin/utils/format'
import { cn } from '@/utils/cn'

interface FileTableProps {
  rows: FileRecord[]
  sort: SortState
  sortLabels: Record<SortKey, string>
  onToggleSort: (key: SortKey) => void
  onDownload: (record: FileRecord) => void
  onDelete: (record: FileRecord) => void
  /** Rendered inside the body (colspan) when there are no rows. */
  empty: ReactNode
}

export default function FileTable({
  rows,
  sort,
  sortLabels,
  onToggleSort,
  onDownload,
  onDelete,
  empty,
}: FileTableProps) {
  const { t } = useTranslation('admin')
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-brand-navy/30">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              <HeaderCell label={sortLabels.uploadedAt} sortKey="uploadedAt" sort={sort} onToggle={onToggleSort} />
              <HeaderCell label={sortLabels.uploadedBy} sortKey="uploadedBy" sort={sort} onToggle={onToggleSort} />
              <HeaderCell label={sortLabels.fileName} sortKey="fileName" sort={sort} onToggle={onToggleSort} />
              <HeaderCell label={sortLabels.category} sortKey="category" sort={sort} onToggle={onToggleSort} />
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{t('files.columns.notes')}</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider">{t('files.columns.download')}</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider">{t('files.columns.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  onDownload={onDownload}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HeaderCell({
  label,
  sortKey,
  sort,
  onToggle,
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onToggle: (key: SortKey) => void
}) {
  const { t } = useTranslation('admin')
  const active = sort.key === sortKey
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        aria-label={t('files.sortBy', { label })}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded text-[11px] font-semibold uppercase tracking-wider outline-none transition-colors hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan/50 dark:hover:text-slate-200',
          active && 'text-brand-navy dark:text-slate-200',
        )}
      >
        {label}
        {active ? (
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-brand-cyan transition-transform', sort.dir === 'asc' && 'rotate-180')}
            aria-hidden
          />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300" aria-hidden />
        )}
      </button>
    </th>
  )
}

function Row({
  row,
  onDownload,
  onDelete,
}: {
  row: FileRecord
  onDownload: (record: FileRecord) => void
  onDelete: (record: FileRecord) => void
}) {
  const { t } = useTranslation('admin')
  const FileIcon = row.section === 'image' ? ImageIcon : FileText
  return (
    <tr className="group bg-white transition-colors hover:bg-sky-50/70 dark:bg-transparent dark:hover:bg-white/[0.04]">
      <td className="whitespace-nowrap border-l-2 border-transparent px-4 py-3.5 font-medium tabular-nums text-brand-navy group-hover:border-brand-cyan dark:text-slate-200">
        {formatDate(row.uploadedAt)}
      </td>

      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold',
              avatarTone(row.uploadedBy),
            )}
            aria-hidden
          >
            {initials(row.uploadedBy)}
          </span>
          <span className="font-medium text-brand-navy dark:text-slate-200">{row.uploadedBy}</span>
        </span>
      </td>

      <td className="px-4 py-3.5">
        <span className="flex items-center gap-2">
          <FileIcon className="h-4 w-4 shrink-0 text-brand-cyan" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate font-medium text-brand-navy dark:text-slate-200">{row.fileName}</span>
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              {fileExt(row.fileName) || t('files.fileFallback')} · {formatBytes(row.size)}
            </span>
          </span>
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-3.5">
        <CategoryBadge value={row.category} />
      </td>

      <td className="max-w-[220px] px-4 py-3.5">
        {row.notes ? (
          <span className="block truncate text-slate-600 dark:text-slate-400" title={row.notes}>
            {row.notes}
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>

      <td className="px-4 py-3.5 text-center">
        <button
          type="button"
          onClick={() => onDownload(row)}
          aria-label={t('files.downloadFile', { name: row.fileName })}
          title={t('files.downloadTitle')}
          className="inline-grid h-8 w-8 place-items-center rounded-md text-brand-cyan outline-none transition-colors group-hover:bg-brand-cyan/10 hover:bg-brand-cyan/20 focus-visible:ring-2 focus-visible:ring-brand-cyan"
        >
          <Download className="h-4 w-4" aria-hidden />
        </button>
      </td>

      <td className="px-4 py-3.5 text-center">
        <button
          type="button"
          onClick={() => onDelete(row)}
          aria-label={t('files.deleteFile', { name: row.fileName })}
          title={t('files.deleteTitle')}
          className="inline-grid h-8 w-8 place-items-center rounded-md text-brand-red outline-none transition-colors group-hover:bg-brand-red/15 hover:bg-brand-red/25 focus-visible:ring-2 focus-visible:ring-brand-red"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </td>
    </tr>
  )
}

/** Uniform soft-blue tag, matching the file-library mockup. */
function CategoryBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-brand-cyan ring-1 ring-inset ring-brand-cyan/20 dark:bg-brand-cyan/15">
      {value}
    </span>
  )
}
