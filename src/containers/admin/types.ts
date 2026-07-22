/**
 * Types for the internal file-upload admin panel.
 *
 * Feature-local (they live with the feature, per the reference architecture) —
 * nothing outside `containers/admin` needs to know about a FileRecord.
 */

/** The two libraries in the sidebar. Each is an independent list of files. */
export type AdminSection = 'document' | 'image'

/**
 * One uploaded file as shown in the table. This is metadata only — the actual
 * bytes (when a real file was picked this session) are held separately in an
 * in-memory blob map by the hook, so the record stays JSON-serialisable for
 * localStorage.
 */
export interface FileRecord {
  id: string
  section: AdminSection
  /** File name shown in the "Uploaded Files" column, e.g. `Legal_Contract.pdf`. */
  fileName: string
  /** Category shown as a badge in the "Uploaded Type" column. */
  category: string
  uploadedBy: string
  /** ISO date string — formatted for display at the edge. */
  uploadedAt: string
  /** Size in bytes; 0 for seed rows with no real file behind them. */
  size: number
  notes?: string
}

/** Columns the table can be sorted by. */
export type SortKey = 'uploadedAt' | 'uploadedBy' | 'fileName' | 'section'
export type SortDir = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  dir: SortDir
}
