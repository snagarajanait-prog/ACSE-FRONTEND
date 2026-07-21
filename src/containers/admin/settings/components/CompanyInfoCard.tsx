/**
 * Organisation display name. On Save this flows into `settingsSlice` and the
 * admin top bar reflects it immediately.
 */

import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SettingCard from '@/containers/admin/settings/components/SettingCard'

interface CompanyInfoCardProps {
  value: string
  onChange: (value: string) => void
}

export default function CompanyInfoCard({ value, onChange }: CompanyInfoCardProps) {
  const { t } = useTranslation('admin')
  return (
    <SettingCard
      icon={Building2}
      title={t('settings.company.title')}
      description={t('settings.company.description')}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-brand-navy dark:text-slate-200">
          {t('settings.company.nameLabel')}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('settings.company.namePlaceholder')}
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </label>
    </SettingCard>
  )
}
