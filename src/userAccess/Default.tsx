/**
 * The single guard wrapped around every private route.
 *
 * A failed role check redirects to the landing page by default; pass `fallback`
 * to render something in place instead (e.g. an inline "no access" panel).
 */

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTE_PATHS } from '@/constants/constants'
import type { Role } from '@/types'
import { useAccess } from '@/userAccess/useAccess'

interface DefaultProps {
  allowed?: Role[]
  children: ReactNode
  fallback?: ReactNode
}

export default function Default({ allowed = [], children, fallback }: DefaultProps) {
  const isAllowed = useAccess(allowed)
  if (isAllowed) return <>{children}</>
  return <>{fallback ?? <Navigate to={ROUTE_PATHS.landing} replace />}</>
}
