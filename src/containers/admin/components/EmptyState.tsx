/**
 * Shown inside the table body when there are no rows — either the section is
 * genuinely empty, or the current search matched nothing. Each case gets its own
 * copy and its own call to action.
 */

import { Inbox, SearchX } from 'lucide-react'

interface EmptyStateProps {
  searching: boolean
  onUpload: () => void
  onClearSearch: () => void
}

export default function EmptyState({ searching, onUpload, onClearSearch }: EmptyStateProps) {
  const Icon = searching ? SearchX : Inbox
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-brand-navy dark:text-slate-200">
        {searching ? 'No files match your search' : 'No files uploaded yet'}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {searching
          ? 'Try a different name, uploader, or category.'
          : 'Upload your first file to see it listed here.'}
      </p>
      {searching ? (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-4 rounded-md px-3 py-1.5 text-sm font-medium text-brand-cyan outline-none transition-colors hover:bg-brand-cyan/10 focus-visible:ring-2 focus-visible:ring-brand-cyan"
        >
          Clear search
        </button>
      ) : (
        <button
          type="button"
          onClick={onUpload}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-cyan to-[#1b7fa8] px-4 py-2 text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Upload File
        </button>
      )}
    </div>
  )
}
