/**
 * The languages the app ships in — the single source of truth for i18n.
 *
 * Everything hangs off this list: the resource loader (`index.ts`) resolves the
 * initial language against it, `<LanguageSwitcher>` renders one row per entry,
 * and the `<html dir>` stamping reads `dir` from here. Adding a language is two
 * steps: add a row below, then drop its JSON files under `locales/<code>/`.
 */

export type LanguageCode = 'en' | 'es' | 'fr' | 'pt' | 'it'
export type Direction = 'ltr' | 'rtl'

export interface LanguageMeta {
  code: LanguageCode
  /** English name — for settings copy and accessibility labels. */
  label: string
  /** The language's own name, shown in the switcher so speakers recognise it. */
  nativeLabel: string
  dir: Direction
}

export const LANGUAGES: readonly LanguageMeta[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', dir: 'ltr' },
] as const

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export const SUPPORTED_CODES: readonly LanguageCode[] = LANGUAGES.map((l) => l.code)

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && SUPPORTED_CODES.includes(value as LanguageCode)
}

/** The writing direction for a language code; falls back to LTR for anything unknown. */
export function directionOf(code: string): Direction {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr'
}
