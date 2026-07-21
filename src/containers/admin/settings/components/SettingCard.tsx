/**
 * The panel every settings section sits in: a tinted icon, a title + one-line
 * description, then the section's own controls.
 */

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface SettingCardProps {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

export default function SettingCard({ icon: Icon, title, description, children }: SettingCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-brand-navy/30">
      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-cyan/10 text-brand-cyan">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-brand-navy dark:text-slate-100">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}
