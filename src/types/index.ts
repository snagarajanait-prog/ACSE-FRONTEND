/**
 * Shared, app-wide types. Feature-specific types live with their feature.
 */

export type Role = 'super_admin' | 'admin' | 'manager' | 'agent'

export interface User {
  id: string
  name: string
  email: string
  roles: Role[]
}

/** Normalized error shape produced by the HTTP layer. */
export interface ApiError {
  status: number
  message: string
}

/**
 * The backend's response envelope. Newer endpoints flag success with a boolean
 * `success`; older ones carry a numeric `status`. Feature code never sees this —
 * each RTK Query endpoint unwraps `data` in `transformResponse` — so both
 * discriminators are optional and only `message`/`data` are relied on.
 */
export interface ApiEnvelope<T> {
  success?: boolean
  status?: number
  message: string
  data: T
}
