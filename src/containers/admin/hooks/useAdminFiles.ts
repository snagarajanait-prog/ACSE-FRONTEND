/**
 * All the state behind the admin panel. The screen (`index.tsx`) reads like a
 * table of contents; every piece of logic — the working set, filtering, sorting,
 * uploads, deletes, downloads — lives here.
 *
 * The file set is the real backend document library (see `documentsApi`): the
 * list is fetched, uploads POST multipart, downloads mint a fresh URL, deletes
 * remove server-side. Search, sort and the section split are still derived
 * client-side over the fetched page, so the table behaves exactly as before —
 * only the data is now real.
 */

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import type { AdminSection, FileRecord, SortKey, SortState } from '@/containers/admin/types'
import { fileType } from '@/containers/admin/utils/format'
import {
  DOCUMENTS_LIST_PARAMS,
  useDeleteDocumentMutation,
  useGetDownloadUrlMutation,
  useListDocumentsQuery,
  useUploadDocumentMutation,
  type ApiDocument,
} from '@/redux/api/documentsApi'
import type { ApiError } from '@/types'

/** Shape the upload form hands back. */
export interface UploadPayload {
  files: File[]
  notes: string
}

/**
 * Backend document → table row. The section is derived from the file kind so an
 * image lands in the image library and everything else in documents — mirroring
 * how the "Uploaded Type" badge is worked out (see `fileType`).
 */
function toFileRecord(doc: ApiDocument): FileRecord {
  return {
    id: doc.id,
    section: fileType(doc.fileName) === 'image' ? 'image' : 'document',
    fileName: doc.fileName,
    category: doc.category,
    uploadedBy: doc.uploadedBy?.name ?? 'Unknown',
    uploadedAt: doc.uploadedAt,
    size: doc.sizeBytes,
    notes: doc.notes || undefined,
  }
}

/**
 * The active library (`section`) is CONTROLLED — the page derives it from the
 * URL (`?lib=`) so the two libraries are distinct, linkable destinations. The
 * hook owns everything else: the fetched set, search, sort, uploads, deletes.
 */
export function useAdminFiles(section: AdminSection) {
  const { t } = useTranslation('admin')
  // Column labels (also the sort-header text) — rebuilt on language change.
  const sortLabels = useMemo<Record<SortKey, string>>(
    () => ({
      uploadedAt: t('files.columns.uploadedAt'),
      uploadedBy: t('files.columns.uploadedBy'),
      fileName: t('files.columns.fileName'),
      section: t('files.columns.category'),
    }),
    [t],
  )

  const { data, isLoading, isError, refetch } = useListDocumentsQuery(DOCUMENTS_LIST_PARAMS)
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation()
  const [deleteDocument] = useDeleteDocumentMutation()
  const [getDownloadUrl] = useGetDownloadUrlMutation()

  const files = useMemo<FileRecord[]>(
    () => (data?.documents ?? []).map(toFileRecord),
    [data],
  )

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'uploadedAt', dir: 'desc' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FileRecord | null>(null)

  const addFiles = useCallback(
    async ({ files: picked, notes }: UploadPayload) => {
      // One request per file (the API takes a single `file`); run them together
      // and report the tally. Invalidation refetches the list on each success.
      const results = await Promise.allSettled(
        picked.map((file) => uploadDocument({ file, notes }).unwrap()),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - ok

      if (ok > 0) {
        toast.success(i18n.t('admin:files.toast.uploaded', { count: ok }))
        setUploadOpen(false)
      }
      if (failed > 0) {
        toast.error(i18n.t('admin:files.toast.uploadError', { count: failed }))
      }
    },
    [uploadDocument],
  )

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    try {
      await deleteDocument(target.id).unwrap()
      toast.success(i18n.t('admin:files.toast.deleted'))
    } catch (err) {
      toast.error((err as ApiError)?.message || i18n.t('admin:files.toast.deleteError'))
    }
  }, [pendingDelete, deleteDocument])

  const download = useCallback(
    async (record: FileRecord) => {
      // Open the tab synchronously — still inside the click — so the async URL
      // fetch below doesn't get the popup blocked; redirect it once minted (or
      // close it on failure). `noopener` can't be set here: it would null the
      // handle we need to steer, so we sever `opener` after navigating instead.
      const win = window.open('', '_blank')
      try {
        const info = await getDownloadUrl(record.id).unwrap()
        if (win) {
          win.opener = null
          win.location.href = info.url
        } else {
          // Popup blocked outright — fall back to a same-gesture-less open.
          window.open(info.url, '_blank', 'noopener,noreferrer')
        }
      } catch (err) {
        win?.close()
        toast.error((err as ApiError)?.message || i18n.t('admin:files.toast.downloadError'))
      }
    },
    [getDownloadUrl],
  )

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : // Dates default to newest-first; text columns to A→Z.
          { key, dir: key === 'uploadedAt' ? 'desc' : 'asc' },
    )
  }, [])

  /** Counts per section — drives the sidebar badges (unfiltered by search). */
  const counts = useMemo(
    () => ({
      document: files.filter((f) => f.section === 'document').length,
      image: files.filter((f) => f.section === 'image').length,
    }),
    [files],
  )

  /** The rows actually rendered: current section, matching the search, sorted. */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = files.filter((f) => {
      if (f.section !== section) return false
      if (!q) return true
      return (
        f.fileName.toLowerCase().includes(q) ||
        f.uploadedBy.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.notes?.toLowerCase().includes(q) ?? false)
      )
    })

    const dir = sort.dir === 'asc' ? 1 : -1
    // The "Uploaded Type" column (`section` sort key) sorts by the badge's real,
    // extension-derived type — not the row's library, which is constant here.
    const valueOf = (r: FileRecord) => (sort.key === 'section' ? fileType(r.fileName) : (r[sort.key] ?? ''))
    return rows.sort((a, b) => {
      const av = valueOf(a)
      const bv = valueOf(b)
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [files, section, query, sort])

  return {
    query,
    setQuery,
    sort,
    toggleSort,
    sortLabels,
    counts,
    visible,
    totalInSection: counts[section],
    // First load has no cached data yet; a background refetch never shows here.
    loading: isLoading,
    error: isError,
    refetch,
    uploading,
    uploadOpen,
    openUpload: useCallback(() => setUploadOpen(true), []),
    closeUpload: useCallback(() => setUploadOpen(false), []),
    addFiles,
    pendingDelete,
    requestDelete: useCallback((record: FileRecord) => setPendingDelete(record), []),
    cancelDelete: useCallback(() => setPendingDelete(null), []),
    confirmDelete,
    download,
  }
}
