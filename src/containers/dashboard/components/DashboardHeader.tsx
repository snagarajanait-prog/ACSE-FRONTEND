/**
 * UI used only by Dashboard. Props in, events out.
 */

import LanguageSwitcher from '@/components/LanguageSwitcher'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <header className="border-b border-gray-200 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
