/**
 * Pure helper used only by Dashboard. Promote to `@/utils` on the second reuse.
 *
 * Not a component, so it reads the shared i18next instance directly (see the
 * `useAdminAuth` pattern) rather than a `useTranslation` hook. The numeric value
 * is passed through as an interpolation variable; only the unit suffix is
 * localised.
 */

import i18n from '@/i18n'

export function formatMetric(value: number): string {
  if (value >= 1_000_000)
    return i18n.t('dashboard:metrics.millionsAbbrev', { value: (value / 1_000_000).toFixed(1) })
  if (value >= 1_000)
    return i18n.t('dashboard:metrics.thousandsAbbrev', { value: (value / 1_000).toFixed(1) })
  return String(value)
}
