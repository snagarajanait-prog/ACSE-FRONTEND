/**
 * The admin document library, injected into the RTK Query `apiSlice`.
 *
 * Four operations back the "Internal File Upload" page:
 *   - `listDocuments`   GET  /documents            (paginated)
 *   - `uploadDocument`  POST /documents            (multipart: file + notes)
 *   - `getDownloadUrl`  GET  /documents/:id/download (mints a fresh URL)
 *   - `deleteDocument`  DELETE /documents/:id
 *
 * Each unwraps the `{ statusCode, success, message, data }` envelope in
 * `transformResponse`, so callers get a bare domain object. Bearer auth is applied
 * automatically by `lib/http`; the upload rides the `FormData` path, which the
 * encryption layer skips on purpose (the browser must own the multipart boundary).
 *
 * `getDownloadUrl` is a MUTATION rather than a query on purpose: the URL is minted
 * on demand (and may be short-lived), so it must never be served from cache — a
 * query would hand back a stale, possibly-expired link on the second click.
 */

import config from '@/config'
import { apiSlice } from '@/redux/api/apiSlice'
import type { ApiEnvelope } from '@/types'

/** One document as the list/upload endpoints return it. */
export interface ApiDocument {
  id: string
  fileName: string
  /** Direct object-storage URL (may require the signed URL from `getDownloadUrl`). */
  fileUrl: string
  /** Backend-derived kind, e.g. `pdf` — not the display badge (that's extension-derived). */
  category: string
  mimeType: string
  sizeBytes: number
  notes?: string
  uploadedBy: { id: string; name: string }
  uploadedAt: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DocumentsPage {
  documents: ApiDocument[]
  pagination: Pagination
}

export interface ListDocumentsArgs {
  page: number
  limit: number
  sortBy: string
  order: 'asc' | 'desc'
}

export interface UploadDocumentArgs {
  file: File
  notes?: string
}

/** What `GET /documents/:id/download` hands back — a name + a ready-to-open URL. */
export interface DownloadInfo {
  fileName: string
  url: string
}

/**
 * The list request the page (and the sidebar's count) share. The panel does its
 * own client-side search/sort, so we pull one generous page newest-first rather
 * than wiring server-side paging into the UI. Shared so both callers hit the same
 * RTK Query cache entry.
 */
export const DOCUMENTS_LIST_PARAMS: ListDocumentsArgs = {
  page: 1,
  limit: 100,
  sortBy: 'createdAt',
  order: 'desc',
}

export const documentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDocuments: builder.query<DocumentsPage, ListDocumentsArgs>({
      query: ({ page, limit, sortBy, order }) => {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          order,
        })
        return { url: `${config.documents.root}?${qs.toString()}`, method: 'GET' }
      },
      transformResponse: (res: ApiEnvelope<DocumentsPage>) => res.data,
      providesTags: ['Documents'],
    }),

    uploadDocument: builder.mutation<ApiDocument, UploadDocumentArgs>({
      query: ({ file, notes }) => {
        const form = new FormData()
        form.append('file', file)
        const trimmed = notes?.trim()
        if (trimmed) form.append('notes', trimmed)
        return { url: config.documents.root, method: 'POST', body: form }
      },
      transformResponse: (res: ApiEnvelope<ApiDocument>) => res.data,
      invalidatesTags: ['Documents'],
    }),

    getDownloadUrl: builder.mutation<DownloadInfo, string>({
      query: (id) => ({ url: `${config.documents.root}/${id}/download`, method: 'GET' }),
      transformResponse: (res: ApiEnvelope<DownloadInfo>) => res.data,
    }),

    deleteDocument: builder.mutation<{ id: string }, string>({
      query: (id) => ({ url: `${config.documents.root}/${id}`, method: 'DELETE' }),
      transformResponse: (res: ApiEnvelope<{ id: string }>) => res.data,
      invalidatesTags: ['Documents'],
    }),
  }),
})

export const {
  useListDocumentsQuery,
  useUploadDocumentMutation,
  useGetDownloadUrlMutation,
  useDeleteDocumentMutation,
} = documentsApi
