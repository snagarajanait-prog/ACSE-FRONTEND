/**
 * Shared, app-wide types. Feature-specific types live with their feature.
 */

export type Role = 'super_admin' | 'admin' | 'manager' | 'agent'

/** The organisation a signed-in user belongs to, carried in the login response. */
export interface Organization {
  id: string
  name: string
  email: string
  address: string
  mobileNumber: string
}

export interface User {
  id: string
  name: string
  email: string
  roles: Role[]
  /**
   * The org this user belongs to. Present from `login`; absent from `/auth/me`
   * (which returns the user alone), so callers must treat it as optional.
   */
  organization?: Organization
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
