/**
 * Admin → "Profile Settings".
 *
 * Reads like a table of contents: the shared shell provides the chrome, three
 * cards provide the sections, and a sticky action bar commits or discards. All
 * the state (draft, dirty, persistence, dispatch) lives in `useSettings`.
 */

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AdminGate from '@/containers/admin/auth/AdminGate'
import { AdminShell } from '@/containers/admin/components'
import {
  AppModeCard,
  CompanyInfoCard,
  ProfilePictureCard,
} from '@/containers/admin/settings/components'
import { useSettings } from '@/containers/admin/settings/hooks/useSettings'
import { cn } from '@/utils/cn'

export default function AdminSettingsPage() {
  return (
    <AdminGate>
      <AdminSettings />
    </AdminGate>
  )
}

function AdminSettings() {
  const { t } = useTranslation('admin')
  const settings = useSettings()
  const { draft } = settings

  return (
    <AdminShell active="settings" title={t('shell.nav.settings')}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-brand-navy sm:text-2xl dark:text-slate-100">
            {t('settings.heading')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('settings.subtitle')}
          </p>
        </header>

        <div className="space-y-5">
          <ProfilePictureCard
            companyName={draft.companyName}
            logoDataUrl={draft.logoDataUrl}
            error={settings.logoError}
            onPick={settings.pickLogo}
            onRemove={settings.removeLogo}
          />

          <CompanyInfoCard value={draft.companyName} onChange={settings.setName} />

          <AppModeCard mode={draft.mode} onChange={settings.setMode} />
        </div>

        {/* Action bar — sticks to the bottom of the scroll area. Opaque bg copied
            from the shell root so it reads as a seamless footer in both themes;
            a translucent + backdrop-blur version showed through as a light band. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 md:-mx-8 md:px-8 dark:border-white/10 dark:bg-brand-navydeep">
          {settings.justSaved && (
            <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" aria-hidden />
              {t('settings.changesSaved')}
            </span>
          )}
          <button
            type="button"
            onClick={settings.cancel}
            disabled={!settings.dirty}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-cyan disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={settings.save}
            disabled={!settings.dirty}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-brand-cyan to-[#1b7fa8] px-5 text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
            )}
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </AdminShell>
  )
}
