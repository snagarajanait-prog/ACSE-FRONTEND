/**
 * Owns the Dashboard screen's data and state, so `index.tsx` stays a thin view.
 * Copy this file's shape when building a new feature's hook.
 *
 * Server data goes through TanStack Query (never a Redux thunk); the query
 * function is an API function from `server/`, never a raw fetch.
 */

import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/server'

export function useDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'currentUser'],
    queryFn: authApi.getCurrentUser,
  })

  return {
    user: data,
    isLoading,
    error,
  }
}
