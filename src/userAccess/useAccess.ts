/**
 * Element-level access gating. An empty `allowed` list means no restriction.
 */

import { useAppSelector } from '@/redux/hooks'
import type { Role } from '@/types'

export function useAccess(allowed: Role[]): boolean {
  const roles = useAppSelector((state) => state.userSlice.current?.roles ?? [])
  if (allowed.length === 0) return true
  return allowed.some((role) => roles.includes(role))
}
