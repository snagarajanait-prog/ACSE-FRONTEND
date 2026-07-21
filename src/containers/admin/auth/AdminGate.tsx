/**
 * The admin area's auth boundary.
 *
 * Renders the sign-in screen until a session exists, then the wrapped page. Both
 * admin routes (files + settings) wrap their content in this, so a session gates
 * the whole area and a direct hit on `/admin/settings` lands on sign-in too.
 *
 * It sits at the route-component boundary rather than inside each page so the
 * page's own hooks (uploads, settings drafts) don't run until you're in.
 */

import type { ReactNode } from 'react'
import AdminLogin from '@/containers/admin/auth/AdminLogin'
import { useAdminAuth } from '@/containers/admin/auth/useAdminAuth'

export default function AdminGate({ children }: { children: ReactNode }) {
  const { authed } = useAdminAuth()
  if (!authed) return <AdminLogin />
  return <>{children}</>
}
