/**
 * Auth API functions. One function = one endpoint, named for intent.
 * URLs always come from `config`, never inline.
 *
 * Note there is no key exchange here any more. The previous design had login
 * return a session AES key; the scheme in `docs/image.png` derives a fresh secret
 * per request from the RSA public key baked into the build, so login is an
 * ordinary encrypted call like every other.
 */

import config from '@/config'
import { http } from '@/lib/http'
import { auth } from '@/middleware/auth'
import type { User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await http.post<LoginResponse>(config.auth.login, payload)

  auth.setToken(response.token)

  return response
}

export async function logout(): Promise<void> {
  try {
    await http.post<void>(config.auth.logout)
  } finally {
    // Always drop local credentials, even if the server call fails.
    auth.clearToken()
  }
}

export function getCurrentUser(): Promise<User> {
  return http.get<User>(config.auth.me)
}
