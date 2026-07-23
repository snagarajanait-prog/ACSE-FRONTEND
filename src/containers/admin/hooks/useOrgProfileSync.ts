/**
 * Fetches the organisation profile once for the admin area and mirrors it into
 * `settingsSlice`, so the topbar brand (name + logo) reflects the server on
 * EVERY admin page — not only after a visit to Settings. The result is also
 * cached to localStorage so a refresh shows the last-known brand before the GET
 * resolves.
 *
 * Mounted by `AdminShell`. RTK Query dedupes by endpoint, so the Settings page
 * (and a post-Save cache invalidation) share this one request rather than
 * issuing their own.
 */

import { useEffect } from 'react'
import { STORAGE_KEYS } from '@/constants/constants'
import { useGetOrgProfileQuery } from '@/redux/api/organizationApi'
import { useAppDispatch } from '@/redux/hooks'
import { setOrgSettings } from '@/redux/settingsSlice'
import { storage } from '@/utils/storage'

export function useOrgProfileSync() {
  const dispatch = useAppDispatch()
  const { data } = useGetOrgProfileQuery()

  useEffect(() => {
    if (!data) return
    const brand = { companyName: data.name, logoUrl: data.logoUrl }
    dispatch(setOrgSettings(brand))
    storage.set(STORAGE_KEYS.adminSettings, brand)
  }, [data, dispatch])
}
