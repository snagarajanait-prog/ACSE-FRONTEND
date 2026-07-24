/**
 * Top-level admin navigation. The Document upload library, then Settings, then
 * the signed-in identity card at the bottom.
 *
 * Which of those actually render is decided by the backend: `/pages/my-permissions`
 * returns the page slugs this user may see, and an item appears only when its
 * `page` slug is in that list. The list is fetched here via `useMyPermissionsQuery`;
 * while it loads we show a skeleton, and on error we render nothing (fail closed —
 * never leak a link the backend hasn't granted). The slugs below MUST match the
 * backend's vocabulary, or the item stays hidden.
 *
 * Pure nav via `<Link>` — the library items carry `?lib=` so each is its own
 * linkable URL. Used by both the persistent desktop rail and the mobile drawer,
 * so it takes an `onNavigate` to let the drawer close after a pick.
 *
 * Count badges must be right on every page, including Settings (where the files
 * hook isn't mounted). When live `counts` aren't passed, the sidebar fetches the
 * document list itself (RTK Query serves it from cache once loaded) and counts
 * that; the fetch is skipped on the files page, where `counts` is already live.
 */

import { useMemo } from 'react'
import { FileText, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '@/constants/constants'
import type { AdminSection } from '@/containers/admin/types'
import { DOCUMENTS_LIST_PARAMS, useListDocumentsQuery } from '@/redux/api/documentsApi'
import { useMyPermissionsQuery } from '@/redux/api/pagesApi'
import { cn } from '@/utils/cn'

export type AdminNav = 'documents' | 'images' | 'settings'

/**
 * Backend page slug (see `/pages/my-permissions`) that gates each nav item.
 * MUST match the backend's vocabulary exactly — the file libraries are SINGULAR
 * (`document`/`image`, same as `AdminSection`), not the plural nav `id`s.
 */
type PageSlug = 'document' | 'image' | 'settings'

interface LibraryItem {
  id: Extract<AdminNav, 'documents' | 'images'>
  /** Slug the backend must return in `allowedPages` for this item to show. */
  page: Extract<PageSlug, 'document' | 'image'>
  section: AdminSection
  icon: LucideIcon
}

const LIBRARIES: LibraryItem[] = [
  { id: 'documents', page: 'document', section: 'document', icon: FileText },
]

interface AdminSidebarProps {
  active: AdminNav
  /** Live per-library counts; omitted off the files page (read from storage). */
  counts?: Record<AdminSection, number>
  onNavigate?: () => void
}

export default function AdminSidebar({ active, counts, onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation('admin')

  // Off the files page (no live `counts`), read the badge count from the document
  // list; skipped otherwise so the files page's own fetch isn't duplicated.
  const { data: docs } = useListDocumentsQuery(DOCUMENTS_LIST_PARAMS, { skip: counts !== undefined })
  const resolvedCounts = useMemo<Record<AdminSection, number>>(
    () => counts ?? { document: docs?.documents.length ?? 0, image: 0 },
    [counts, docs],
  )

  // The backend decides what this user may navigate to. RTK Query dedupes across
  // the desktop rail + mobile drawer (both mount this), so it's one request.
  const { data, isLoading, isError } = useMyPermissionsQuery()

  // Fail closed: on error, no page is allowed. `isLoading` (not `isFetching`)
  // stays false once there's cached data, so a background refetch never flashes
  // the skeleton back in.
  const allowed = useMemo(() => new Set<string>(isError ? [] : (data ?? [])), [data, isError])

  const libraries = LIBRARIES.filter((item) => allowed.has(item.page))
  const canSeeSettings = allowed.has('settings')

  return (
    <nav aria-label={t('shell.adminNav')} className="flex h-full flex-col p-4">
      <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {t('shell.navigation')}
      </p>

      {isLoading ? (
        <NavSkeleton />
      ) : (
        <ul className="space-y-1">
          {libraries.map(({ id, section, icon }) => (
            <NavRow
              key={id}
              to={`${ROUTE_PATHS.admin}?lib=${section}`}
              label={t(`shell.nav.${section}`)}
              icon={icon}
              active={active === id}
              badge={resolvedCounts[section]}
              onNavigate={onNavigate}
            />
          ))}
          {canSeeSettings && (
            <NavRow
              to={ROUTE_PATHS.adminSettings}
              label={t('shell.nav.settings')}
              icon={Settings}
              active={active === 'settings'}
              onNavigate={onNavigate}
            />
          )}
        </ul>
      )}

      <UserCard />
    </nav>
  )
}

/** Placeholder rows shown while `/pages/my-permissions` is in flight. */
function NavSkeleton() {
  return (
    <ul className="space-y-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <span className="h-4.5 w-4.5 shrink-0 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <span className="h-3 w-24 flex-1 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        </li>
      ))}
    </ul>
  )
}

function NavRow({
  to,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  to: string
  label: string
  icon: LucideIcon
  active: boolean
  badge?: number
  onNavigate?: () => void
}) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
          active
            ? 'bg-gradient-to-r from-brand-cyan to-[#1b7fa8] text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-brand-navy dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
        )}
      >
        <Icon
          className={cn(
            'h-4.5 w-4.5 shrink-0 transition-colors',
            active
              ? 'text-white'
              : 'text-slate-400 group-hover:text-brand-navy dark:group-hover:text-slate-200',
          )}
          aria-hidden
        />
        <span className="flex-1">{label}</span>
        {badge !== undefined && (
          <span
            className={cn(
              'min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums',
              active
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
            )}
          >
            {badge}
          </span>
        )}
      </Link>
    </li>
  )
}

/** Signed-in identity, pinned to the bottom of the rail. Placeholder until auth. */
function UserCard() {
  const { t } = useTranslation('admin')
  return (
    <div className="mt-auto flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-navy text-[11px] font-bold text-white dark:bg-brand-cyan/20 dark:text-brand-cyan">
        AC
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-brand-navy dark:text-slate-100">{t('shell.userCard.name')}</p>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{t('shell.userCard.role')}</p>
      </div>
    </div>
  )
}
