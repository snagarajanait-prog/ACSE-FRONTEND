/**
 * Auth API functions. One function = one endpoint, named for intent.
 * URLs always come from `config`, never inline.
 */

import config from '@/config'
import { http } from '@/lib/http'
import { auth } from '@/middleware/auth'
import type { User } from '@/types'
import { clearSessionKey, setSessionKey } from '@/utils/crypto'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
  /**
   * base64 AES-256 data key for this session.
   *
   * The backend derives this via OCI KMS envelope encryption (GenerateDataEncryptionKey)
   * and returns the PLAINTEXT data key here — the KMS-wrapped copy stays server-side.
   *
   * NOTE: the login response itself cannot be encrypted with this key — it is the
   * message that delivers the key. Login is therefore plaintext-over-TLS by
   * necessity, and every subsequent response is encrypted. Worth stating
   * explicitly to the backend team so it isn't treated as a bug.
   */
  sessionKey: string
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await http.post<LoginResponse>(config.auth.login, payload)

  auth.setToken(response.token)
  await setSessionKey(response.sessionKey)

  return response
}

export async function logout(): Promise<void> {
  try {
    await http.post<void>(config.auth.logout)
  } finally {
    // Always drop local credentials, even if the server call fails.
    auth.clearToken()
    clearSessionKey()
  }
}

export function getCurrentUser(): Promise<User> {
  return http.get<User>(config.auth.me)
}
