/**
 * i18next bootstrap — imported once (via `I18nProvider`) so a single shared
 * instance backs every `useTranslation()` in the app.
 *
 * Resources are discovered from `locales/<lng>/<namespace>.json` at build time
 * with Vite's `import.meta.glob`, so adding a namespace or a language needs no
 * change here — just drop the JSON file in the right folder and it's picked up.
 *
 * Persistence and the `<html lang/dir>` side effects live in `I18nProvider`, in
 * the same spirit as `ThemeProvider`. Only the initial language is resolved
 * here: a stored choice wins, else the browser language, else English.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { STORAGE_KEYS } from '@/constants/constants'
import { DEFAULT_LANGUAGE, isLanguageCode } from '@/i18n/config'
import { storage } from '@/utils/storage'

type LocaleModule = { default: Record<string, unknown> }

// Eagerly bundle every locale JSON. Keys look like './locales/en/common.json'.
const modules = import.meta.glob<LocaleModule>('./locales/**/*.json', { eager: true })

const resources: Record<string, Record<string, Record<string, unknown>>> = {}
for (const [path, mod] of Object.entries(modules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const lng = match[1]
  const ns = match[2]
  resources[lng] = resources[lng] || {}
  resources[lng][ns] = mod.default
}

/** Stored choice wins; else the browser's language; else English. Runs once. */
function initialLanguage(): string {
  const saved = storage.get<string>(STORAGE_KEYS.language)
  if (isLanguageCode(saved)) return saved
  const nav = (navigator.language || '').slice(0, 2)
  return isLanguageCode(nav) ? nav : DEFAULT_LANGUAGE
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  fallbackNS: 'common',
  // React escapes for us — double-escaping would mangle apostrophes etc.
  interpolation: { escapeValue: false },
  // Resources are bundled and ready synchronously, so nothing ever suspends;
  // opting out keeps components from needing a Suspense boundary just for i18n.
  react: { useSuspense: false },
  returnNull: false,
})

export default i18n
