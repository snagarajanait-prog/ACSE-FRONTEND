/**
 * Pure display helpers for the admin table. No React, no state.
 */

import type { FileType } from '@/containers/admin/types'

/** `07/07/2026` — matches the mockup's date column. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

/** `2.3 MB`, `984 KB`, `512 B`. Returns `—` for the seed rows that carry no size. */
export function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

/** `Robert Chen` → `RC`. Falls back to the first two letters for a single word. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * A stable accent per person, so the same uploader always gets the same avatar
 * colour. Hashing the name keeps it deterministic without storing a colour.
 */
const AVATAR_TONES = [
  'bg-brand-cyan/15 text-brand-cyan',
  'bg-brand-red/10 text-brand-red',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
]

export function avatarTone(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

/** The file's extension, lowercased and without the dot: `Legal_Contract.pdf` → `pdf`. */
export function fileExt(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico', 'heic', 'tif', 'tiff'])
const SPREADSHEET_EXTS = new Set(['xls', 'xlsx', 'xlsm', 'csv', 'ods'])
const PRESENTATION_EXTS = new Set(['ppt', 'pptx', 'odp', 'key'])

/**
 * The kind badge shown in the "Uploaded Type" column, worked out from the file's
 * extension — so the column names the real file kind (Image, PDF, Spreadsheet…)
 * instead of just echoing which library it sits in. Anything unrecognised falls
 * back to `document`. Each returned value must have a `files.type.<value>` key.
 */
export function fileType(fileName: string): FileType {
  const ext = fileExt(fileName)
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (SPREADSHEET_EXTS.has(ext)) return 'spreadsheet'
  if (PRESENTATION_EXTS.has(ext)) return 'presentation'
  return 'document'
}
