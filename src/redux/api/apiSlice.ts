/**
 * The single RTK Query API slice — the app's one cache.
 *
 * Endpoints are added per-domain with `injectEndpoints` (see `authApi.ts`) rather
 * than listed here, so a new domain is a new file, not an edit to this one. The
 * store mounts `apiSlice.reducer`/`apiSlice.middleware` once (see `store.ts`).
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { reduxName } from '@/constants/reduxConstants'
import { httpBaseQuery } from '@/redux/api/baseQuery'

export const apiSlice = createApi({
  reducerPath: reduxName.api,
  baseQuery: httpBaseQuery,
  // Cache tags for invalidation; grow this as read/write endpoints are added.
  tagTypes: ['CurrentUser'],
  endpoints: () => ({}),
})
