/**
 * Organisation branding, editable from the admin Settings page.
 *
 * Just the white-label surface — display name and logo. The "Application Mode"
 * (ATP / C2M) shown alongside these in Settings is NOT here: it maps onto the
 * existing `dataSourceSlice`, so Settings dispatches there rather than
 * duplicating the source of truth.
 *
 * Seeded from localStorage so a saved brand survives a refresh; the constant
 * CLIENT_NAME is only the first-run default.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { CLIENT_NAME, STORAGE_KEYS } from '@/constants/constants'
import { reduxName } from '@/constants/reduxConstants'
import { storage } from '@/utils/storage'

export interface SettingsState {
  /** Client display name shown in the admin topbar (and, later, app-wide). */
  companyName: string
  /** A data-URL logo, or null to fall back to the initials monogram. */
  logoDataUrl: string | null
}

function loadInitial(): SettingsState {
  const saved = storage.get<Partial<SettingsState>>(STORAGE_KEYS.adminSettings)
  return {
    companyName: saved?.companyName?.trim() || CLIENT_NAME,
    logoDataUrl: saved?.logoDataUrl ?? null,
  }
}

const settingsSlice = createSlice({
  name: reduxName.settings,
  initialState: loadInitial(),
  reducers: {
    /** Merge a partial update — Settings commits name and logo together on Save. */
    setOrgSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      Object.assign(state, action.payload)
    },
  },
})

export const { setOrgSettings } = settingsSlice.actions

export default settingsSlice.reducer
