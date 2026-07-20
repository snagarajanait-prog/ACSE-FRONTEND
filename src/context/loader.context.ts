/**
 * Global loader context + its consumer hook.
 *
 * Split from `LoaderContext.tsx` for the same reason as the theme context: a
 * file that mixes component and non-component exports breaks Fast Refresh.
 */

import { createContext, useContext } from 'react'

export interface LoaderContextValue {
  /** True while at least one caller is holding the loader open. */
  isLoading: boolean
  /** Opens the loader. Optionally replaces the status line. */
  show: (message?: string) => void
  /** Releases this caller's hold. The loader hides once every hold is released. */
  hide: () => void
  /** Runs `task` with the loader up, releasing the hold even if it throws. */
  withLoader: <T>(task: () => Promise<T>, message?: string) => Promise<T>
}

export const LoaderContext = createContext<LoaderContextValue | undefined>(undefined)

export function useGlobalLoader(): LoaderContextValue {
  const context = useContext(LoaderContext)
  if (!context) throw new Error('useGlobalLoader must be used inside a LoaderProvider')
  return context
}
