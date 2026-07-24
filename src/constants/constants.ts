/**
 * Shared constant values with no logic attached.
 */

import type { Role } from '@/types'

export const ROLES: Record<string, Role> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
}

export const STORAGE_KEYS = {
  token: 'acse.token',
  /** Refresh token from login. Sent in the logout body to revoke the session server-side. */
  refreshToken: 'acse.refreshToken',
  theme: 'acse.theme',
  /** Chosen UI language (a code from `i18n/config`). Seeds i18next on boot. */
  language: 'acse.lang',
  /** Signed-in admin user. Its presence rehydrates the session on refresh. */
  session: 'acse.session',
  /** Working set of admin-panel file rows (seed + uploads − deletions). */
  adminFiles: 'acse.admin.files',
  /** Organisation branding set from the admin Settings page (name + logo). */
  adminSettings: 'acse.admin.settings',
  /** Whether the copilot's desktop account sidebar is expanded (vs. collapsed to the rail). */
  copilotSidebar: 'acse.copilot.sidebar',
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
 * The "Powered by" credit that precedes the ACSE·AI logo lockup in the app
 * headers. Deliberately NOT translated — it's part of the fixed brand mark, so
 * it reads the same in every language (unlike the localized PDF-receipt credit,
 * which is a full sentence and stays translatable).
 */
export const POWERED_BY_LABEL = 'Powered by'

/**
 * Route paths, so no screen hard-codes a URL string. `routes.ts` builds the
 * table from these and navigation (`useNavigate`, `<Link>`) reads the same keys.
 */
export const ROUTE_PATHS = {
  landing: '/',
  // Public URL is `/chat`; the key stays `copilot` to match the feature folder,
  // its i18n namespace and the "Ask ACSE AI" affordances that navigate here.
  copilot: '/chat',
  dashboard: '/dashboard',
  /** Internal file-upload admin panel. Public for now (no auth yet) — see routes.ts. */
  admin: '/admin',
  /** Admin → organisation profile & settings. */
  adminSettings: '/admin/settings',
  /** Scratch screen for choosing the copilot hero orb. Remove with the folder. */
  orbLab: '/orb-lab',
} as const
