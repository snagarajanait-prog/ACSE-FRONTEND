/**
 * The admin login's credential check.
 *
 * There is no auth backend wired up in this build (the whole admin panel runs on
 * localStorage — see `routes.ts`), so the check runs locally against a single
 * known demo account, and the form shows that account as a hint. When a real
 * `/auth/login` is available, swap `verifyCredentials` for the `login()` call in
 * `server/auth.ts`: the rest of the gate — session, sign-out, refresh survival —
 * is written against `userSlice` and needs no change.
 */

import { ROLES } from '@/constants/constants'
import type { User } from '@/types'

/** The demo account, surfaced on the form so anyone can sign in. */
export const DEMO_ADMIN = {
  email: 'admin@acsesolutions.com',
  password: 'admin1234',
} as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CredentialCheck {
  ok: boolean
  /** Why it failed — lets the form word "fill it in" vs "wrong" differently. */
  reason?: 'format' | 'mismatch'
  /** The session user, present only when `ok`. */
  user?: User
}

export function verifyCredentials(emailRaw: string, password: string): CredentialCheck {
  const email = emailRaw.trim().toLowerCase()

  if (!EMAIL_RE.test(email) || password.length === 0) {
    return { ok: false, reason: 'format' }
  }

  if (email !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
    return { ok: false, reason: 'mismatch' }
  }

  return {
    ok: true,
    user: {
      id: 'admin-1',
      name: 'Administrator',
      email: emailRaw.trim(),
      roles: [ROLES.ADMIN],
    },
  }
}
