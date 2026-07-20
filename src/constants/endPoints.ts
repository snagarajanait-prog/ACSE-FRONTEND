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
} as const
