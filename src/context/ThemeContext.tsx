/**
 * Theme provider. Components stay theme-agnostic and read Tailwind's `dark:`
 * variant / CSS variables rather than branching on this value directly.
 *
 * The provider owns the one side effect the whole palette hangs off: stamping
 * `.dark` on <html>, which is what `@custom-variant dark` in `index.css` keys
 * on. The choice is persisted under STORAGE_KEYS.theme and, on a first visit,
 * seeded from the OS `prefers-color-scheme`.
 *
 * Note: there is deliberately NO UserContext — user and session state live in
 * `redux/userSlice.ts`. Holding it in both places is the duplication the
 * reference architecture warns about.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEYS } from '@/constants/constants'
import { ThemeContext } from '@/context/theme.context'
import type { Theme } from '@/context/theme.context'
import { storage } from '@/utils/storage'

/** Stored choice wins; otherwise follow the OS. Runs once, lazily. */
function initialTheme(): Theme {
  const saved = storage.get<Theme>(STORAGE_KEYS.theme)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    storage.set(STORAGE_KEYS.theme, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
