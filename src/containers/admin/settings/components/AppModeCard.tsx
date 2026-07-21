/**
 * Application mode — ATP vs C2M. This is the app's existing internal data-source
 * switch surfaced as a setting: ATP = the safe Autonomous store, C2M = the live
 * billing path. It maps straight onto `dataSourceSlice`, so the label ("ATP")
 * and the underlying value ('AUTONOMOUS') differ; the helper line below the
 * control spells out what the active mode does, from DATA_SOURCE_META.
 */

import { Zap } from 'lucide-react'
import { DATA_SOURCE_META } from '@/redux/dataSourceSlice'
import type { DataSource } from '@/redux/dataSourceSlice'
import SettingCard from '@/containers/admin/settings/components/SettingCard'
import { cn } from '@/utils/cn'

const OPTIONS: { value: DataSource; label: string }[] = [
  { value: 'AUTONOMOUS', label: 'ATP' },
  { value: 'C2M', label: 'C2M' },
]

interface AppModeCardProps {
  mode: DataSource
  onChange: (mode: DataSource) => void
}

export default function AppModeCard({ mode, onChange }: AppModeCardProps) {
  return (
    <SettingCard
      icon={Zap}
      title="Application Mode"
      description="Switch between ATP and C2M operating modes"
    >
      <div
        role="radiogroup"
        aria-label="Application mode"
        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5"
      >
        {OPTIONS.map(({ value, label }) => {
          const isActive = value === mode
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(value)}
              className={cn(
                'min-w-20 rounded-lg px-5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
                isActive
                  ? 'bg-gradient-to-r from-brand-cyan to-[#1b7fa8] text-white shadow-sm'
                  : 'text-slate-500 hover:text-brand-navy dark:text-slate-400 dark:hover:text-slate-100',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-brand-navy dark:text-slate-200">
          {DATA_SOURCE_META[mode].short}
        </span>
        <span aria-hidden>·</span>
        <span>{DATA_SOURCE_META[mode].description}</span>
      </p>
    </SettingCard>
  )
}
