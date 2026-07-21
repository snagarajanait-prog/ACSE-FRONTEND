/**
 * Routes are DATA, not JSX. Adding a screen is one entry here — the guard and
 * lazy-loading come for free.
 *
 * `App.tsx` maps this array to <Route> elements; adding a screen never touches
 * that file.
 */

import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { ROUTE_PATHS } from '@/constants/constants'
import type { Role } from '@/types'

export interface RouteConfig {
  path: string
  component: LazyExoticComponent<ComponentType>
  /** Empty or omitted = any authenticated user. */
  allowed?: Role[]
  isPublic?: boolean
}

export const routes: RouteConfig[] = [
  {
    path: ROUTE_PATHS.landing,
    component: lazy(() => import('@/containers/landing')),
    isPublic: true,
  },
  {
    // The full-page ACSE AI copilot, reached from every "Ask ACSE AI" affordance.
    path: ROUTE_PATHS.copilot,
    component: lazy(() => import('@/containers/copilot')),
    isPublic: true,
  },
  {
    path: ROUTE_PATHS.dashboard,
    component: lazy(() => import('@/containers/dashboard')),
  },
  {
    // Internal file-upload admin panel. `isPublic` for now: there is no login yet,
    // so hitting /admin drops you straight in. When auth lands, drop `isPublic`
    // and add `allowed: [ROLES.ADMIN]` to gate it behind the admin role.
    path: ROUTE_PATHS.admin,
    component: lazy(() => import('@/containers/admin')),
    isPublic: true,
  },
  {
    // Scratch screen — orb candidates for the copilot hero. `isPublic` matters:
    // without it the guard bounces you to the landing page. Delete this entry
    // and `containers/orb-lab` once one is picked.
    path: ROUTE_PATHS.orbLab,
    component: lazy(() => import('@/containers/orb-lab')),
    isPublic: true,
  },
]

export default routes
