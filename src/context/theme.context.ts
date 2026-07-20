/**
 * Theme context object + its consumer hook.
 *
 * Kept separate from the provider component so `ThemeContext.tsx` exports
 * components only — a file that mixes component and non-component exports
 * breaks Vite's Fast Refresh.
 */

import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider')
  return context
}
