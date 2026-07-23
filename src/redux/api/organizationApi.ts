/**
 * Organisation profile endpoints (display name + logo), injected into the RTK
 * Query `apiSlice`.
 *
 * `getOrgProfile` reads the current brand; `updateOrgProfile` PATCHes it as
 * `multipart/form-data` (`name`, plus an optional logo `file`). The backend's
 * `{ statusCode, success, message, data }` envelope is unwrapped in
 * `transformResponse`, so callers get a bare `OrgProfile`.
 *
 * The upload rides the `FormData` path in `lib/http`, which the encryption layer
 * skips on purpose (the browser must own the multipart boundary) — so this works
 * the same whether encryption is on or off. Bearer auth is applied automatically.
 *
 * NOTE: the API has no "remove logo" operation — PATCH only sets a name and an
 * optional new file. Clearing the logo in the UI is therefore a local-only
 * preview; a Save that sends no file leaves the server's current logo intact.
 */

import config from '@/config'
import { apiSlice } from '@/redux/api/apiSlice'
import type { ApiEnvelope } from '@/types'

/** The organisation's public brand. `logoUrl` is a remote URL, or null if unset. */
export interface OrgProfile {
  name: string
  logoUrl: string | null
  updatedAt?: string
}

export interface UpdateOrgProfileArgs {
  name: string
  /** A new logo to upload, or omit/null to leave the current one untouched. */
  file?: File | null
}

function toFormData({ name, file }: UpdateOrgProfileArgs): FormData {
  const form = new FormData()
  form.append('name', name)
  if (file) form.append('file', file)
  return form
}

export const organizationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrgProfile: builder.query<OrgProfile, void>({
      query: () => ({ url: config.organizations.profile, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<OrgProfile>) => res.data,
      providesTags: ['OrgProfile'],
    }),

    updateOrgProfile: builder.mutation<OrgProfile, UpdateOrgProfileArgs>({
      query: (args) => ({
        url: config.organizations.profile,
        method: 'PATCH',
        body: toFormData(args),
      }),
      transformResponse: (res: ApiEnvelope<OrgProfile>) => res.data,
      // The PATCH already returns the updated profile, so write it straight into
      // the `getOrgProfile` cache instead of invalidating the tag — invalidation
      // would fire a redundant follow-up GET for data we already hold.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(organizationApi.util.upsertQueryData('getOrgProfile', undefined, data))
        } catch {
          // Save failed — the mutation surfaces the error; nothing to sync.
        }
      },
    }),
  }),
})

export const { useGetOrgProfileQuery, useUpdateOrgProfileMutation } = organizationApi
