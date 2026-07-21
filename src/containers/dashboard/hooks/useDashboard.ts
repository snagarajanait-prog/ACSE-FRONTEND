/**
 * Owns the Dashboard screen's data and state, so `index.tsx` stays a thin view.
 * Copy this file's shape when building a new feature's hook.
 *
 * Server data goes through RTK Query — the query function and its caching,
 * loading and error state come from a generated hook in `redux/api`, never a
 * raw fetch or a Redux thunk.
 */

import { useCurrentUserQuery } from '@/redux/api/authApi'

export function useDashboard() {
  const { data, isLoading, error } = useCurrentUserQuery()

  return {
    user: data,
    isLoading,
    error,
  }
}
