/**
 * SINGLE source of truth for env vars, URLs and feature flags.
 * Nothing else in the app reads `import.meta.env` directly.
 */

import { paths } from '@/constants/endPoints'

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const url = (path: string): string => `${BASE_URL}${path}`

export const config = {
  baseUrl: BASE_URL,
  isDev: import.meta.env.DEV,

  auth: {
    login: url(paths.auth.login),
    logout: url(paths.auth.logout),
    refresh: url(paths.auth.refresh),
    me: url(paths.auth.me),
  },
} as const

export default config
