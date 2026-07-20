/**
 * Shared, app-wide types. Feature-specific types live with their feature.
 */

export type Role = 'admin' | 'manager' | 'agent'

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
