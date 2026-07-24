/**
 * Auth endpoints, injected into the RTK Query `apiSlice`.
 *
 * The backend wraps every response in `{ status, message, data }`; each endpoint
 * unwraps `data` in `transformResponse` and hands components a plain domain
 * object, so no feature ever sees the envelope.
 *
 * Token custody: the access token comes back in the login BODY (this API is
 * Bearer-based — it sets no cookie), so `login` hands it to `middleware/auth` for
 * the `Authorization` header to read. Nothing here touches `document.cookie`.
 */

import config from '@/config'
import { auth } from '@/middleware/auth'
import { apiSlice } from '@/redux/api/apiSlice'
import type { ApiEnvelope, Role, User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

/** The backend's user object. `role` is a single string; `status` is unused here. */
interface ApiUser {
  id: string
  name: string
  email: string
  role: string
  status?: string
}

/**
 * The login payload. `accessToken` and `refreshToken` are persisted (the latter
 * revokes the session at logout); `tokenType` and `expiresIn` (seconds) come
 * along for the token-refresh flow that `lib/http` already reserves a spot for —
 * not wired up yet.
 */
interface LoginData {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: ApiUser
}

const KNOWN_ROLES: readonly Role[] = ['super_admin', 'admin', 'manager', 'agent']

/**
 * The app's roles are a closed set; treat anything outside it as a plain `admin`
 * so an unrecognised role can never crash the gate — it still signs the person
 * in, it just doesn't claim a role the UI can't reason about.
 */
function normalizeRole(role: string): Role {
  return (KNOWN_ROLES as readonly string[]).includes(role) ? (role as Role) : 'admin'
}

/** Backend user → app `User`. */
function toUser(u: ApiUser): User {
  return { id: u.id, name: u.name, email: u.email, roles: [normalizeRole(u.role)] }
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<User, LoginPayload>({
      // Pre-auth handshake: no token yet, and login is excluded from the
      // encryption envelope (this backend takes plaintext).
      query: (body) => ({ url: config.auth.login, method: 'POST', body, skipEncryption: true }),
      transformResponse: (res: ApiEnvelope<LoginData>) => {
        auth.setToken(res.data.accessToken)
        auth.setRefreshToken(res.data.refreshToken)
        return toUser(res.data.user)
      },
    }),

    // The backend revokes the session by refresh token, so the current token
    // rides along in the body. Read at call time (not closed over) so it's always
    // the live one; `null` if the session predates refresh-token custody — a
    // best-effort logout that the local teardown in `useAdminAuth` covers anyway.
    logout: builder.mutation<void, void>({
      query: () => ({
        url: config.auth.logout,
        method: 'POST',
        body: { refreshToken: auth.getRefreshToken() },
      }),
    }),

    currentUser: builder.query<User, void>({
      query: () => ({ url: config.auth.me, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<ApiUser>) => toUser(res.data),
      providesTags: ['CurrentUser'],
    }),
  }),
})

export const { useLoginMutation, useLogoutMutation, useCurrentUserQuery } = authApi
