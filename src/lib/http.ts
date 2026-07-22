/**
 * The cross-cutting HTTP layer — the `interceptors/` equivalent for this project.
 *
 * Auth headers, payload encryption/decryption, error normalization and 401 handling
 * are written ONCE here, so every function in `server/` inherits them for free.
 * Feature code never calls `fetch`, never sees ciphertext, and never imports
 * `utils/crypto`. That is the whole point: encryption is plug-and-play because
 * this file is the only plug.
 *
 * Turning the layer on or off is `VITE_ENCRYPTION_ENABLED` in the `.env` file for
 * the mode you are running — no code change, no per-call flag.
 *
 * (The reference architecture used Axios interceptors; this project has no Axios,
 * so the same job is done with a wrapper around native fetch.)
 */

import type { ApiError } from '@/types'
import { auth } from '@/middleware/auth'
import { decryptResponse, encryptRequest, isEncryptionEnabled } from '@/utils/crypto'

/**
 * Carries the RSA-wrapped temporary secret. A header rather than a body field so
 * GET and DELETE — which have no body — still get an encrypted response.
 *
 * The backend must also list this in `Access-Control-Allow-Headers`, or the
 * browser preflight will reject every request.
 */
const KEY_HEADER = 'X-Encrypted-Key'

/** The agreed envelope in both directions: `{ "data": "<base64>" }`. */
interface EncryptedEnvelope {
  data: string
}

function isEncryptedEnvelope(body: unknown): body is EncryptedEnvelope {
  if (typeof body !== 'object' || body === null) return false
  const keys = Object.keys(body)
  return keys.length === 1 && typeof (body as EncryptedEnvelope).data === 'string'
}

export interface RequestOptions {
  method?: string
  /** Any JSON-serializable value, or `FormData` for uploads. */
  body?: unknown
  /**
   * Escape hatch for endpoints the backend excludes from encryption — a pre-auth
   * handshake, a webhook callback, a third-party URL. Prefer keeping the list
   * short; every entry is a hole in the layer.
   */
  skipEncryption?: boolean
  signal?: AbortSignal
}

async function toApiError(response: Response, responseKey: CryptoKey | null): Promise<ApiError> {
  let message = response.statusText
  try {
    const body: unknown = await response.json()
    // Error bodies come back encrypted too when the layer is on.
    const decoded =
      responseKey && isEncryptedEnvelope(body)
        ? await decryptResponse<{ message?: string }>(responseKey, body.data)
        : (body as { message?: string })
    if (decoded?.message) message = decoded.message
  } catch {
    // Not JSON, or undecryptable — fall back to the status text.
  }
  return { status: response.status, message }
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipEncryption = false, signal } = options

  const headers = new Headers()
  const token = auth.getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // ngrok's free tier serves an HTML browser-warning interstitial (ERR_NGROK_6024)
  // for browser requests — mostly GETs — unless this header is present. Without it
  // that HTML reaches `response.json()` below and throws, which surfaces as a failed
  // request (e.g. an empty admin sidebar). The dev server injects this in the Vite
  // proxy; a deployed static build has no proxy, so we send it from here instead.
  //
  // This is a non-simple header: the backend MUST list `ngrok-skip-browser-warning`
  // in `Access-Control-Allow-Headers`, or the CORS preflight blocks EVERY request.
  // Harmless once past a non-ngrok origin; drop it when the backend leaves ngrok.
  headers.set('ngrok-skip-browser-warning', 'true')

  // FormData is skipped: the browser must own the multipart boundary, and file
  // uploads are the one place where enveloping the body is a real cost.
  const isUpload = body instanceof FormData
  const encrypt = isEncryptionEnabled() && !skipEncryption && !isUpload

  let payload: BodyInit | undefined
  let responseKey: CryptoKey | null = null

  if (isUpload) {
    payload = body
  } else if (encrypt) {
    // No try/catch on purpose. If encryption fails we fail the request rather than
    // retrying in plaintext — a silent downgrade is exactly the bug this layer exists
    // to prevent, and it would be invisible in production.
    const envelope = await encryptRequest(body)
    headers.set(KEY_HEADER, envelope.wrappedSecret)
    responseKey = envelope.responseKey
    if (envelope.data !== null) {
      headers.set('Content-Type', 'application/json')
      payload = JSON.stringify({ data: envelope.data })
    }
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  const response = await fetch(url, {
    method,
    headers,
    body: payload,
    // `same-origin` (the fetch default), NOT `include`. This API authenticates
    // with a Bearer token and answers cross-origin with `Access-Control-Allow-
    // Origin: *` — a wildcard the browser REJECTS the instant a request is
    // credentialed, so `include` would block every cross-origin call. Same-origin
    // still carries cookies for a same-origin deployment, so a future HttpOnly-
    // cookie backend (specific origin + `Allow-Credentials: true`) is a one-line
    // flip back to `include`. The frontend never reads or writes cookies itself.
    credentials: 'same-origin',
    signal,
  })

  // Cross-cutting error handling belongs here, never in feature code.
  // Token refresh + retry hooks in at this point once the backend supports it.
  if (response.status === 401) auth.clearToken()

  if (!response.ok) throw await toApiError(response, responseKey)
  if (response.status === 204) return undefined as T

  const raw: unknown = await response.json()

  // Decrypt transparently: callers always receive plain objects.
  // Gated on `responseKey` so a plaintext endpoint that happens to return
  // `{ data: "..." }` is never mistaken for an envelope.
  if (responseKey && isEncryptedEnvelope(raw)) return decryptResponse<T>(responseKey, raw.data)

  return raw as T
}

export const http = {
  get: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'POST', body }),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PUT', body }),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PATCH', body }),
  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
}
