/**
 * State behind the Settings page.
 *
 * A classic draft/commit form: edits live in local `draft` state and only reach
 * the stores on Save. Cancel throws the draft away and re-reads the committed
 * values. "Dirty" (draft ≠ committed) drives whether Save is enabled.
 *
 * Two stores back this page: branding (name + logo) → `settingsSlice`
 * (persisted); application mode (ATP/C2M) → the existing `dataSourceSlice`. The
 * mode is intentionally NOT persisted — the public demo must always boot on the
 * safe Autonomous path (see dataSourceSlice), so the toggle is session-scoped.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import i18n from '@/i18n'
import { CLIENT_NAME, STORAGE_KEYS } from '@/constants/constants'
import { setDataSource } from '@/redux/dataSourceSlice'
import type { DataSource } from '@/redux/dataSourceSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { setOrgSettings } from '@/redux/settingsSlice'
import { storage } from '@/utils/storage'

export const MAX_LOGO_BYTES = 1024 * 1024 // 1 MB — kept small so it fits localStorage
const ACCEPTED_LOGO = ['image/png', 'image/jpeg']

interface Draft {
  companyName: string
  logoDataUrl: string | null
  mode: DataSource
}

export function useSettings() {
  const dispatch = useAppDispatch()

  // Select fields individually so the selector never returns a fresh object
  // (which would re-render on every store change).
  const companyName = useAppSelector((s) => s.settingsSlice.companyName)
  const logoDataUrl = useAppSelector((s) => s.settingsSlice.logoDataUrl)
  const mode = useAppSelector((s) => s.dataSourceSlice.source)
  const committed = useMemo<Draft>(
    () => ({ companyName, logoDataUrl, mode }),
    [companyName, logoDataUrl, mode],
  )

  const [draft, setDraft] = useState<Draft>(committed)
  const [logoError, setLogoError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(savedTimer.current), [])

  const dirty =
    draft.companyName !== committed.companyName ||
    draft.logoDataUrl !== committed.logoDataUrl ||
    draft.mode !== committed.mode

  const setName = useCallback((companyNameNext: string) => {
    setJustSaved(false)
    setDraft((d) => ({ ...d, companyName: companyNameNext }))
  }, [])

  const setMode = useCallback((next: DataSource) => {
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
        setJustSaved(false)
        setLogoError('')
        setDraft((d) => ({ ...d, logoDataUrl: reader.result as string }))
      }
    }
    reader.onerror = () => setLogoError(i18n.t('admin:settings.logoErrorRead'))
    reader.readAsDataURL(file)
  }, [])

  const removeLogo = useCallback(() => {
    setJustSaved(false)
    setLogoError('')
    setDraft((d) => ({ ...d, logoDataUrl: null }))
  }, [])

  const cancel = useCallback(() => {
    setLogoError('')
    setJustSaved(false)
    setDraft(committed)
  }, [committed])

  const save = useCallback(() => {
    const name = draft.companyName.trim() || CLIENT_NAME
    dispatch(setOrgSettings({ companyName: name, logoDataUrl: draft.logoDataUrl }))
    dispatch(setDataSource(draft.mode))
    storage.set(STORAGE_KEYS.adminSettings, {
      companyName: name,
      logoDataUrl: draft.logoDataUrl,
    })
    // Normalise the draft to what we just committed (trimmed name).
    setDraft((d) => ({ ...d, companyName: name }))
    setJustSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setJustSaved(false), 2500)
  }, [dispatch, draft])

  return {
    draft,
    dirty,
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
