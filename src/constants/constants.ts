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
 * The white-label client brand. Read by the copilot header AND by the PDF
 * receipt, so a rebrand is this one line — the two can never drift apart.
 * Replace with the client's real name (and swap the monogram in `CopilotHeader`
 * for their logo artwork) on handover.
 */
export const CLIENT_NAME = 'XYZ Company'

/** Us. Credited as "powered by" in the UI and in the receipt footer. */
export const VENDOR_NAME = 'ACSE Solutions'

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
