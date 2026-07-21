/**
 * API paths only — no host, no logic. `config.ts` turns these into full URLs.
 * Grouped by domain so they stay findable as the list grows.
 */

export const paths = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  pages: {
    /** Page slugs the signed-in user may see — drives the admin sidebar. */
    myPermissions: '/pages/my-permissions',
  },
} as const
