/**
 * Shared constant values with no logic attached.
 */

import type { Role } from '@/types'

export const ROLES: Record<string, Role> = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
}

export const STORAGE_KEYS = {
  token: 'acse.token',
  theme: 'acse.theme',
} as const

/**
 * Route paths, so no screen hard-codes a URL string. `routes.ts` builds the
 * table from these and navigation (`useNavigate`, `<Link>`) reads the same keys.
 */
export const ROUTE_PATHS = {
  landing: '/',
  copilot: '/copilot',
  dashboard: '/dashboard',
  /** Scratch screen for choosing the copilot hero orb. Remove with the folder. */
  orbLab: '/orb-lab',
} as const
