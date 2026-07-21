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
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-brand-navy/30">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-brand-navy via-[#0f5c7a] to-[#1b7fa8] text-white">
              <HeaderCell label={sortLabels.uploadedAt} sortKey="uploadedAt" sort={sort} onToggle={onToggleSort} />
              <HeaderCell label={sortLabels.uploadedBy} sortKey="uploadedBy" sort={sort} onToggle={onToggleSort} />
              <HeaderCell label={sortLabels.fileName} sortKey="fileName" sort={sort} onToggle={onToggleSort} />
              <HeaderCell label={sortLabels.category} sortKey="category" sort={sort} onToggle={onToggleSort} />
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Notes</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider">Download</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider">Action</th>
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
              rows.map((row, i) => (
                <Row
                  key={row.id}
                  row={row}
                  zebra={i % 2 === 1}
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
  const active = sort.key === sortKey
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        aria-label={`Sort by ${label}`}
        className="group inline-flex items-center gap-1.5 rounded text-[11px] font-semibold uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {label}
        {active ? (
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', sort.dir === 'asc' && 'rotate-180')}
            aria-hidden
          />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-white/50 transition-colors group-hover:text-white/80" aria-hidden />
        )}
      </button>
    </th>
  )
}

function Row({
  row,
  zebra,
  onDownload,
  onDelete,
}: {
  row: FileRecord
  zebra: boolean
  onDownload: (record: FileRecord) => void
  onDelete: (record: FileRecord) => void
}) {
  const FileIcon = row.section === 'image' ? ImageIcon : FileText
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-brand-cyan/[0.04] dark:hover:bg-white/[0.04]',
        zebra ? 'bg-slate-50/60 dark:bg-white/[0.015]' : 'bg-white dark:bg-transparent',
      )}
    >
      <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums text-brand-navy dark:text-slate-200">
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
              {fileExt(row.fileName) || 'file'} · {formatBytes(row.size)}
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
          aria-label={`Download ${row.fileName}`}
          title="Download"
          className="inline-grid h-8 w-8 place-items-center rounded-md text-brand-cyan outline-none transition-colors hover:bg-brand-cyan/10 focus-visible:ring-2 focus-visible:ring-brand-cyan"
        >
          <Download className="h-4 w-4" aria-hidden />
        </button>
      </td>

      <td className="px-4 py-3.5 text-center">
        <button
          type="button"
          onClick={() => onDelete(row)}
          aria-label={`Delete ${row.fileName}`}
          title="Delete"
          className="inline-grid h-8 w-8 place-items-center rounded-md text-brand-red outline-none transition-colors hover:bg-brand-red/10 focus-visible:ring-2 focus-visible:ring-brand-red"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </td>
    </tr>
  )
}

/** A stable tint per category, hashed so the same tag always looks the same. */
const BADGE_TONES = [
  'bg-brand-cyan/10 text-brand-navy ring-brand-cyan/25 dark:bg-brand-cyan/15 dark:text-brand-cyan',
  'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300',
  'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300',
  'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300',
]

function CategoryBadge({ value }: { value: string }) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        BADGE_TONES[hash % BADGE_TONES.length],
      )}
    >
      {value}
    </span>
  )
}
