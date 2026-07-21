/**
 * All the state behind the admin panel. The screen (`index.tsx`) reads like a
 * table of contents; every piece of logic — filtering, sorting, the working set,
 * uploads, deletes, downloads — lives here.
 *
 * There is no API. The working set (seed + uploads − deletions) is persisted to
 * localStorage so a refresh keeps your changes. Real file bytes only exist for
 * uploads made THIS session (a blob map held in a ref, not serialisable), so a
 * download after a refresh falls back to a generated placeholder.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/constants'
import type {
  AdminSection,
  FileRecord,
  SortKey,
  SortState,
} from '@/containers/admin/types'
import { loadFiles } from '@/containers/admin/utils/persistence'
import { downloadTextFile } from '@/utils/download'
import { storage } from '@/utils/storage'

/** Shape the upload form hands back. */
export interface UploadPayload {
  files: File[]
  uploadedBy: string
  category: string
  notes: string
}

/** Collision-resistant enough for an in-browser demo; no crypto needed. */
function makeId(section: AdminSection): string {
  const prefix = section === 'image' ? 'IMG' : 'DOC'
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`
}

const SORT_LABELS: Record<SortKey, string> = {
  uploadedAt: 'Uploaded Date',
  uploadedBy: 'Uploaded By',
  fileName: 'Uploaded Files',
  category: 'Uploaded Type',
}

/**
 * The active library (`section`) is CONTROLLED — the page derives it from the
 * URL (`?lib=`) so the two libraries are distinct, linkable destinations. The
 * hook owns everything else: the working set, search, sort, uploads, deletes.
 */
export function useAdminFiles(section: AdminSection) {
  const [files, setFiles] = useState<FileRecord[]>(loadFiles)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'uploadedAt', dir: 'desc' })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FileRecord | null>(null)

  // Real bytes for uploads made this session, keyed by record id. Not persisted:
  // File objects can't survive JSON, and holding data URLs for every upload would
  // blow the storage quota.
  const blobs = useRef<Map<string, File>>(new Map())

  /** Persist and update in one place, so the two can never drift. */
  const commit = useCallback((next: FileRecord[]) => {
    setFiles(next)
    storage.set(STORAGE_KEYS.adminFiles, next)
  }, [])

  const addFiles = useCallback(
    ({ files: picked, uploadedBy, category, notes }: UploadPayload) => {
      const now = new Date().toISOString()
      const created = picked.map<FileRecord>((file) => {
        const id = makeId(section)
        blobs.current.set(id, file)
        return {
          id,
          section,
          fileName: file.name,
          category: category || 'Other',
          uploadedBy: uploadedBy.trim() || 'Unknown',
          uploadedAt: now,
          size: file.size,
          notes: notes.trim() || undefined,
        }
      })
      // Newest first, matching the default sort.
      commit([...created, ...files])
      setUploadOpen(false)
    },
    [section, files, commit],
  )

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    blobs.current.delete(pendingDelete.id)
    commit(files.filter((f) => f.id !== pendingDelete.id))
    setPendingDelete(null)
  }, [pendingDelete, files, commit])

  const download = useCallback((record: FileRecord) => {
    const blob = blobs.current.get(record.id)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = record.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      requestAnimationFrame(() => URL.revokeObjectURL(url))
      return
    }
    // Seed rows (and anything from a prior session) have no real bytes — hand
    // over a readable placeholder rather than a broken/empty download.
    const stub = [
      `File: ${record.fileName}`,
      `Category: ${record.category}`,
      `Uploaded by: ${record.uploadedBy}`,
      `Uploaded at: ${record.uploadedAt}`,
      record.notes ? `Notes: ${record.notes}` : '',
      '',
      'This is a demo placeholder — the original file was not stored in the browser.',
    ]
      .filter(Boolean)
      .join('\n')
    downloadTextFile(stub, `${record.fileName}.txt`, 'text/plain')
  }, [])

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
    return rows.sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [files, section, query, sort])

  return {
    query,
    setQuery,
    sort,
    toggleSort,
    sortLabels: SORT_LABELS,
    counts,
    visible,
    totalInSection: counts[section],
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
