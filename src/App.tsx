/**
 * Auth gate + the public/private split.
 *
 * Public routes render straight through; private ones go through `Default`,
 * which redirects rather than rendering when the role check fails. The route
 * table drives all of it, so adding a screen never touches this file.
 */

import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import GlobalLoader from '@/components/GlobalLoader'
import { ROUTE_PATHS } from '@/constants/constants'
import routes from '@/routes'
import Default from '@/userAccess/Default'

export default function App() {
  const { t } = useTranslation('common')
  // The boot moment belongs to <BootSplash> (see Entry.tsx) — this fallback only
  // covers route chunks fetched later. It waits before painting so a fast
  // navigation doesn't flash a half-built logo.
  return (
    <Suspense fallback={<GlobalLoader appearDelayMs={220} message={t('actions.loading')} />}>
      <Routes>
        {routes.map(({ path, component: Screen, allowed, isPublic }) => (
          <Route
            key={path}
            path={path}
            element={
              isPublic ? (
                <Screen />
              ) : (
                <Default allowed={allowed}>
                  <Screen />
                </Default>
              )
            }
          />
        ))}
        {/* Unknown URL — send people to the landing page rather than a blank screen. */}
        <Route path="*" element={<Navigate to={ROUTE_PATHS.landing} replace />} />
      </Routes>
    </Suspense>
  )
}
