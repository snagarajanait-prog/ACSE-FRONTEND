/**
 * Organisation display name. On Save this flows into `settingsSlice` and the
 * admin top bar reflects it immediately.
 */

import { Building2 } from 'lucide-react'
import SettingCard from '@/containers/admin/settings/components/SettingCard'

interface CompanyInfoCardProps {
  value: string
  onChange: (value: string) => void
}

export default function CompanyInfoCard({ value, onChange }: CompanyInfoCardProps) {
  return (
    <SettingCard
      icon={Building2}
      title="Company Information"
      description="Update your organization's display name"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-brand-navy dark:text-slate-200">
          Company Name
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. XYZ Company"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </label>
    </SettingCard>
  )
}
