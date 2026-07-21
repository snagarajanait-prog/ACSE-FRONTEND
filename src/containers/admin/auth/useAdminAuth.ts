/**
 * The admin session, as a hook.
 *
 * Source of truth is `userSlice` (so app-wide role checks see the same session),
 * mirrored into localStorage so a refresh keeps you signed in — the store reads
 * that key back as `preloadedState` (see `store.ts`), which is what stops the
 * login screen from flashing before rehydration on reload.
 *
 * `signIn` is deliberately async-shaped (a short delay + spinner) so the form
 * behaves like a real network sign-in and swaps cleanly for `server/auth.ts`'s
 * `login()` when a backend lands.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/constants'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { clearUser, setUser } from '@/redux/userSlice'
import { storage } from '@/utils/storage'
import { verifyCredentials } from './credentials'

/** How long the "Signing in…" state is held before the panel unlocks. */
const SIGN_IN_MS = 600

export function useAdminAuth() {
  const dispatch = useAppDispatch()
  const authed = useAppSelector((s) => s.userSlice.isAuthenticated)

  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  // A pending sign-in can outlive the form (navigation away mid-delay) — never
  // let the timer resolve into an unmounted component.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const clearError = useCallback(() => setError(null), [])

  const signIn = useCallback(
    (email: string, password: string) => {
      const check = verifyCredentials(email, password)
      if (!check.ok || !check.user) {
        setError(
          check.reason === 'format'
            ? 'Enter a valid email address and password.'
            : 'Incorrect email or password.',
        )
        return
      }

      const user = check.user
      setError(null)
      setSigningIn(true)
      timer.current = window.setTimeout(() => {
        // Persist first, then flip Redux: the moment `isAuthenticated` turns true
        // the gate swaps this form out, so state written after that is written
        // into an unmounting tree.
        storage.set(STORAGE_KEYS.session, user)
        setSigningIn(false)
        dispatch(setUser(user))
      }, SIGN_IN_MS)
    },
    [dispatch],
  )

  const signOut = useCallback(() => {
    storage.remove(STORAGE_KEYS.session)
    dispatch(clearUser())
  }, [dispatch])

  return { authed, signingIn, error, clearError, signIn, signOut }
}
