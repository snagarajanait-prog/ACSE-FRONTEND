/**
 * The RTK Query base query — delegates to the app's `http` layer instead of
 * `fetchBaseQuery`.
 *
 * Every cross-cutting concern (the Bearer auth header, the request/response
 * encryption envelope, error normalization, 401 handling, the `credentials`
 * mode) already lives in `lib/http.ts`. Reimplementing any of that inside a
 * second fetch wrapper is exactly the drift this avoids: RTK Query owns the
 * cache, request lifecycle and generated hooks; `http` still owns the wire.
 *
 * Endpoints pass a FULL url built from `config` (e.g. `config.auth.login`), the
 * same value the `http` functions already expect.
 */

import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import { http } from '@/lib/http'
import type { RequestOptions } from '@/lib/http'
import type { ApiError } from '@/types'

export interface HttpQueryArgs {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Excludes the call from the encryption envelope (pre-auth handshakes). */
  skipEncryption?: boolean
}

/** `{ error }` is the normalized `ApiError` thrown by `http`; `{ data }` on success. */
export const httpBaseQuery: BaseQueryFn<HttpQueryArgs, unknown, ApiError> = async (
  { url, method = 'GET', body, skipEncryption },
  api,
) => {
  // Forward RTK Query's abort signal so cancelled queries actually abort the fetch.
  const options: RequestOptions = { skipEncryption, signal: api.signal }

  try {
    let data: unknown
    switch (method) {
      case 'GET':
        data = await http.get(url, options)
        break
      case 'DELETE':
        data = await http.delete(url, options)
        break
      case 'POST':
        data = await http.post(url, body, options)
        break
      case 'PUT':
        data = await http.put(url, body, options)
        break
      case 'PATCH':
        data = await http.patch(url, body, options)
        break
    }
    return { data }
  } catch (err) {
    return { error: err as ApiError }
  }
}
