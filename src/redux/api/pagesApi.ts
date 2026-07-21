/**
 * Page-permission endpoints, injected into the RTK Query `apiSlice`.
 *
 * `myPermissions` returns the set of page slugs the signed-in user is allowed to
 * see; the admin sidebar renders a nav item only when its slug is in this list.
 * Like the auth endpoints, the backend's `{ status, message, data }` envelope is
 * unwrapped in `transformResponse`, so callers get the bare `string[]` and never
 * see the wrapper.
 *
 * Bearer-based like the rest of the API — the token set at sign-in
 * (`middleware/auth`) rides along automatically via `lib/http`, so this needs no
 * token handling of its own.
 */

import config from '@/config'
import { apiSlice } from '@/redux/api/apiSlice'
import type { ApiEnvelope } from '@/types'

interface PermissionsData {
  allowedPages: string[]
}

export const pagesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    myPermissions: builder.query<string[], void>({
      query: () => ({ url: config.pages.myPermissions, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<PermissionsData>) => res.data.allowedPages,
      providesTags: ['Permissions'],
    }),
  }),
})

export const { useMyPermissionsQuery } = pagesApi
