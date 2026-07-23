/**
 * State behind the Settings page.
 *
 * A classic draft/commit form: edits live in local `draft` state and only reach
 * the server/stores on Save. Cancel throws the draft away and re-reads the
 * committed values. "Dirty" (draft ≠ committed) drives whether Save is enabled.
 *
 * Branding (name + logo) is persisted to the backend via the organisation-profile
 * API: Save PATCHes `multipart/form-data` (name + optional logo file) and mirrors
 * the response into `settingsSlice`, so the admin topbar reflects it immediately.
 * The GET that seeds the committed values runs once per admin page in
 * `AdminShell` (see `useOrgProfileSync`); this hook just reads the resulting
 * slice and re-syncs its draft when that lands.
 *
 * Application mode (ATP/C2M) is the exception — it maps onto `dataSourceSlice`
 * and is intentionally NOT persisted (the public demo must always boot on the
 * safe Autonomous path), so the toggle is session-scoped and commits locally.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { CLIENT_NAME, STORAGE_KEYS } from '@/constants/constants'
import { setDataSource } from '@/redux/dataSourceSlice'
import type { DataSource } from '@/redux/dataSourceSlice'
import { useUpdateOrgProfileMutation } from '@/redux/api/organizationApi'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { setOrgSettings } from '@/redux/settingsSlice'
import type { ApiError } from '@/types'
import { storage } from '@/utils/storage'

export const MAX_LOGO_BYTES = 1024 * 1024 // 1 MB
const ACCEPTED_LOGO = ['image/png', 'image/jpeg']

interface Draft {
  companyName: string
  /** Preview: the committed remote URL, a freshly-picked `data:` URL, or null. */
  logoUrl: string | null
  mode: DataSource
}

export function useSettings() {
  const dispatch = useAppDispatch()

  // Select fields individually so the selector never returns a fresh object
  // (which would re-render on every store change).
  const companyName = useAppSelector((s) => s.settingsSlice.companyName)
  const logoUrl = useAppSelector((s) => s.settingsSlice.logoUrl)
  const mode = useAppSelector((s) => s.dataSourceSlice.source)
  const committed = useMemo<Draft>(
    () => ({ companyName, logoUrl, mode }),
    [companyName, logoUrl, mode],
  )

  const [updateProfile, { isLoading: saving }] = useUpdateOrgProfileMutation()

  const [draft, setDraft] = useState<Draft>(committed)
  // The pending logo upload — set only when the user picks a new file this session.
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoError, setLogoError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Flips true on the first edit; keeps the server-sync effect below from
  // clobbering an in-progress draft when the profile GET lands late.
  const touched = useRef(false)

  useEffect(() => () => clearTimeout(savedTimer.current), [])

  // Re-seed the draft when the committed brand changes (e.g. the profile GET in
  // AdminShell resolves after this mounts), unless the user is mid-edit.
  useEffect(() => {
    if (!touched.current) setDraft(committed)
  }, [committed])

  const dirty =
    draft.companyName !== committed.companyName ||
    draft.logoUrl !== committed.logoUrl ||
    draft.mode !== committed.mode

  const setName = useCallback((companyNameNext: string) => {
    touched.current = true
    setJustSaved(false)
    setDraft((d) => ({ ...d, companyName: companyNameNext }))
  }, [])

  const setMode = useCallback((next: DataSource) => {
    touched.current = true
    setJustSaved(false)
    setDraft((d) => ({ ...d, mode: next }))
  }, [])

  const pickLogo = useCallback((file: File) => {
    if (!ACCEPTED_LOGO.includes(file.type)) {
      setLogoError(i18n.t('admin:settings.logoErrorType'))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(i18n.t('admin:settings.logoErrorSize'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        touched.current = true
        setJustSaved(false)
        setLogoError('')
        setLogoFile(file)
        setDraft((d) => ({ ...d, logoUrl: reader.result as string }))
      }
    }
    reader.onerror = () => setLogoError(i18n.t('admin:settings.logoErrorRead'))
    reader.readAsDataURL(file)
  }, [])

  // Local-only preview clear — the profile API has no "remove logo" op, so a Save
  // that sends no file leaves the server's current logo intact (see organizationApi).
  const removeLogo = useCallback(() => {
    touched.current = true
    setJustSaved(false)
    setLogoError('')
    setLogoFile(null)
    setDraft((d) => ({ ...d, logoUrl: null }))
  }, [])

  const cancel = useCallback(() => {
    touched.current = false
    setLogoError('')
    setLogoFile(null)
    setJustSaved(false)
    setDraft(committed)
  }, [committed])

  const save = useCallback(async () => {
    const name = draft.companyName.trim() || CLIENT_NAME
    try {
      const profile = await updateProfile({ name, file: logoFile }).unwrap()

      const brand = { companyName: profile.name, logoUrl: profile.logoUrl }
      dispatch(setOrgSettings(brand))
      dispatch(setDataSource(draft.mode))
      storage.set(STORAGE_KEYS.adminSettings, brand)

      // Normalise the draft to what the server actually committed.
      touched.current = false
      setLogoFile(null)
      setDraft((d) => ({ ...d, companyName: profile.name, logoUrl: profile.logoUrl }))
      setJustSaved(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setJustSaved(false), 2500)
    } catch (err) {
      const message = (err as ApiError)?.message || i18n.t('admin:settings.saveErrorDesc')
      toast.error(i18n.t('admin:settings.saveErrorTitle'), { description: message })
    }
  }, [dispatch, draft, logoFile, updateProfile])

  return {
    draft,
    dirty,
    saving,
    logoError,
    justSaved,
    setName,
    setMode,
    pickLogo,
    removeLogo,
    cancel,
    save,
  }
}
