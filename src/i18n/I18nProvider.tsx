/**
 * Wires the shared i18next instance into React and owns the two side effects a
 * language change has on the document — mirroring how `ThemeProvider` owns the
 * `.dark` class.
 *
 * On every change it stamps `<html lang>` and `<html dir>` (so Arabic flips to
 * RTL and Tailwind's `rtl:` variants engage) and persists the choice under
 * STORAGE_KEYS.language. The matching pre-paint script in `index.html` sets the
 * same attributes before React mounts, so there's no flash of the wrong
 * direction on load.
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { STORAGE_KEYS } from '@/constants/constants'
import { directionOf } from '@/i18n/config'
import i18n from '@/i18n'
import { storage } from '@/utils/storage'

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const apply = (lng: string) => {
      const root = document.documentElement
      root.setAttribute('lang', lng)
      root.setAttribute('dir', directionOf(lng))
      storage.set(STORAGE_KEYS.language, lng)
    }

    apply(i18n.language)
    i18n.on('languageChanged', apply)
    return () => i18n.off('languageChanged', apply)
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
