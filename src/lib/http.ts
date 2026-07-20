/**
 * The cross-cutting HTTP layer — the `interceptors/` equivalent for this project.
 *
 * Auth headers, payload decryption, error normalization and 401 handling are
 * written ONCE here, so every function in `server/` inherits them for free.
 * Feature code never calls `fetch` and never sees ciphertext.
 *
 * (The reference architecture used Axios interceptors; this project has no Axios,
 * so the same job is done with a wrapper around native fetch.)
 */

import type { ApiError } from '@/types'
import { auth } from '@/middleware/auth'
import { decryptPayload, hasSessionKey } from '@/utils/crypto'

/**
 * The agreed envelope for an encrypted response: `{ "data": "<base64>" }`.
 * This mirrors the reference codebase's `{ data: await encryptGCM(...) }` shape.
 *
 * MUST be confirmed with the backend. Note the sharp edge: a *plaintext*
 * endpoint that legitimately returns `{ data: "some string" }` would be
 * mistaken for an envelope. If that is a real risk, switch the check to an
 * explicit response header (e.g. `X-Encrypted: true`, which the backend must
 * also add to `Access-Control-Expose-Headers`).
 */
interface EncryptedEnvelope {
  data: string
}

function isEncryptedEnvelope(body: unknown): body is EncryptedEnvelope {
  if (!hasSessionKey()) return false
  if (typeof body !== 'object' || body === null) return false
  const keys = Object.keys(body)
  return keys.length === 1 && keys[0] === 'data' && typeof (body as EncryptedEnvelope).data === 'string'
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message) message = body.message
  } catch {
    // Error body was not JSON — fall back to the status text.
  }
  return { status: response.status, message }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  const token = auth.getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(url, { ...init, headers, credentials: 'include' })

  // Cross-cutting error handling belongs here, never in feature code.
  // Token refresh + retry hooks in at this point once the backend supports it.
  if (response.status === 401) auth.clearToken()

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T

  const body: unknown = await response.json()

  // Decrypt transparently: callers always receive plain objects.
  if (isEncryptedEnvelope(body)) return decryptPayload<T>(body.data)

  return body as T
}

export const http = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
