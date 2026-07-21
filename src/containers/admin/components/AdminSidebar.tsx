/**
 * The "Admin panel" library switcher. Pure nav — the two entries (Document,
 * Image) each map to a `section`. Rendered both as the persistent desktop rail
 * and inside the mobile drawer, so it takes an `onNavigate` to let the drawer
 * close itself after a pick.
 */

import { FileText, Image as ImageIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AdminSection } from '@/containers/admin/types'
import { cn } from '@/utils/cn'

interface NavItem {
  section: AdminSection
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { section: 'image', label: 'Image', icon: ImageIcon },
  { section: 'document', label: 'Document', icon: FileText },
]

interface AdminSidebarProps {
  active: AdminSection
  counts: Record<AdminSection, number>
  onSelect: (section: AdminSection) => void
  onNavigate?: () => void
}

export default function AdminSidebar({
  active,
  counts,
  onSelect,
  onNavigate,
}: AdminSidebarProps) {
  return (
    <nav aria-label="Admin sections" className="flex h-full flex-col p-4">
      <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Admin panel
      </p>

      <ul className="space-y-1">
        {NAV.map(({ section, label, icon: Icon }) => {
          const isActive = section === active
          return (
            <li key={section}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onSelect(section)
                  onNavigate?.()
                }}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
                  isActive
                    ? 'bg-brand-cyan/10 text-brand-navy dark:bg-brand-cyan/15 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-brand-navy dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
                )}
              >
                <Icon
                  className={cn(
                    'h-4.5 w-4.5 shrink-0 transition-colors',
                    isActive
                      ? 'text-brand-cyan'
                      : 'text-slate-400 group-hover:text-brand-navy dark:group-hover:text-slate-200',
                  )}
                  aria-hidden
                />
                <span className="flex-1 text-left">{label}</span>
                <span
                  className={cn(
                    'min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums transition-colors',
                    isActive
                      ? 'bg-brand-cyan/20 text-brand-navy dark:text-brand-cyan'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
                  )}
                >
                  {counts[section]}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
