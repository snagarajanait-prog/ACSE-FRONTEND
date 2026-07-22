/**
 * The header block above the table: title + subtitle on the left, search and the
 * primary "Upload File" action on the right.
 *
 * The upload button is deliberately brand-cyan (not the app's red `primary`) to
 * match the mockup — cyan is the "add / go" accent throughout this screen.
 */

import { Search, UploadCloud, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AdminSection } from '@/containers/admin/types'
import { cn } from '@/utils/cn'

interface FileToolbarProps {
  section: AdminSection
  query: string
  onQueryChange: (value: string) => void
  onUpload: () => void
}

export default function FileToolbar({
  section,
  query,
  onQueryChange,
  onUpload,
}: FileToolbarProps) {
  const { t } = useTranslation('admin')
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-brand-navy sm:text-2xl dark:text-slate-100">
          {t('files.heading')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(`files.subtitle.${section}`)}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">{t('files.searchLabel')}</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('files.searchPlaceholder')}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-9 text-sm text-brand-navy shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label={t('files.clearSearch')}
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        <button
          type="button"
          onClick={onUpload}
          className={cn(
            'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm outline-none transition',
            'bg-brand-cyan hover:bg-brand-cyan/90 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <UploadCloud className="h-4 w-4" aria-hidden />
          {t('files.uploadFile')}
        </button>
      </div>
    </div>
  )
}
