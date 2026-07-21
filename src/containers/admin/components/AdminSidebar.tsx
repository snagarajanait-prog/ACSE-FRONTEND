/**
 * Top-level admin navigation. Two upload libraries (Document, Image) as separate
 * destinations, then Settings, then the signed-in identity card at the bottom.
 *
 * Pure nav via `<Link>` — the library items carry `?lib=` so each is its own
 * linkable URL. Used by both the persistent desktop rail and the mobile drawer,
 * so it takes an `onNavigate` to let the drawer close after a pick.
 *
 * Count badges must be right on every page, including Settings (where the files
 * hook isn't mounted), so when live `counts` aren't passed the sidebar reads a
 * snapshot from storage itself.
 */

import { useMemo } from 'react'
import { FileText, Image as ImageIcon, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '@/constants/constants'
import type { AdminSection } from '@/containers/admin/types'
import { countBySection } from '@/containers/admin/utils/persistence'
import { cn } from '@/utils/cn'

export type AdminNav = 'documents' | 'images' | 'settings'

interface LibraryItem {
  id: Extract<AdminNav, 'documents' | 'images'>
  section: AdminSection
  label: string
  icon: LucideIcon
}

const LIBRARIES: LibraryItem[] = [
  { id: 'documents', section: 'document', label: 'Document', icon: FileText },
  { id: 'images', section: 'image', label: 'Image', icon: ImageIcon },
]

interface AdminSidebarProps {
  active: AdminNav
  /** Live per-library counts; omitted off the files page (read from storage). */
  counts?: Record<AdminSection, number>
  onNavigate?: () => void
}

export default function AdminSidebar({ active, counts, onNavigate }: AdminSidebarProps) {
  const resolvedCounts = useMemo(() => counts ?? countBySection(), [counts])

  return (
    <nav aria-label="Admin navigation" className="flex h-full flex-col p-4">
      <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Navigation
      </p>

      <ul className="space-y-1">
        {LIBRARIES.map(({ id, section, label, icon }) => (
          <NavRow
            key={id}
            to={`${ROUTE_PATHS.admin}?lib=${section}`}
            label={label}
            icon={icon}
            active={active === id}
            badge={resolvedCounts[section]}
            onNavigate={onNavigate}
          />
        ))}
        <NavRow
          to={ROUTE_PATHS.adminSettings}
          label="Settings"
          icon={Settings}
          active={active === 'settings'}
          onNavigate={onNavigate}
        />
      </ul>

      <UserCard />
    </nav>
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
  return (
    <div className="mt-auto flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-navy text-[11px] font-bold text-white dark:bg-brand-cyan/20 dark:text-brand-cyan">
        AC
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-brand-navy dark:text-slate-100">Admin Console</p>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">System Administrator</p>
      </div>
    </div>
  )
}
