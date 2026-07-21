/**
 * Reading the persisted admin file set. Shared by the files hook (its working
 * set) and the sidebar (per-library count badges, which must be right on any
 * page — including Settings, where the files hook isn't mounted).
 */

import { STORAGE_KEYS } from '@/constants/constants'
import { SEED_FILES } from '@/containers/admin/data'
import type { AdminSection, FileRecord } from '@/containers/admin/types'
import { storage } from '@/utils/storage'

/** The persisted working set, falling back to the seed on first run. */
export function loadFiles(): FileRecord[] {
  const saved = storage.get<FileRecord[]>(STORAGE_KEYS.adminFiles)
  return Array.isArray(saved) ? saved : SEED_FILES
}

/** Files-per-library, read from storage — a point-in-time snapshot. */
export function countBySection(): Record<AdminSection, number> {
  const files = loadFiles()
  return {
    document: files.filter((f) => f.section === 'document').length,
    image: files.filter((f) => f.section === 'image').length,
  }
}
