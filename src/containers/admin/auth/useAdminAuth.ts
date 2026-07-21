/**
 * The admin session, as a hook.
 *
 * Sign-in runs the RTK Query `login` mutation (see `redux/api/authApi`), which
 * returns a Bearer token + user. The token is kept by `middleware/auth`
 * (localStorage, for the `Authorization` header) and the user in `userSlice` —
 * the shared source of truth, so app-wide role checks see the same session. The
 * user is also mirrored to localStorage, which `store.ts` reads back as
 * `preloadedState`; that's what stops the login screen flashing before
 * rehydration on reload.
 *
 * No cookies are read or written here or anywhere in the auth path — see the
 * `credentials` note in `lib/http.ts`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { STORAGE_KEYS } from '@/constants/constants'
import { auth } from '@/middleware/auth'
import { apiSlice } from '@/redux/api/apiSlice'
import { useLoginMutation, useLogoutMutation } from '@/redux/api/authApi'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { clearUser, setUser } from '@/redux/userSlice'
import type { ApiError } from '@/types'
import { storage } from '@/utils/storage'

export function useAdminAuth() {
  const dispatch = useAppDispatch()
  const authed = useAppSelector((s) => s.userSlice.isAuthenticated)

  const [login, { isLoading: signingIn }] = useLoginMutation()
  const [logout] = useLogoutMutation()
  const [error, setError] = useState<string | null>(null)

  // A sign-in can outlive the form (navigation away mid-request); this guards the
  // late setState so it never fires into an unmounted component.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null)
      try {
        const user = await login({ email: email.trim(), password }).unwrap()
        // Persist first, then flip Redux: the moment `isAuthenticated` turns true
        // the gate swaps this form out, so nothing is written after the unmount.
        storage.set(STORAGE_KEYS.session, user)
        dispatch(setUser(user))
        toast.success('Signed in', { description: `Welcome back, ${user.name}.` })
      } catch (err) {
        if (!mounted.current) return
        const message = (err as ApiError)?.message || 'Could not sign in. Please try again.'
        setError(message)
        toast.error('Sign in failed', { description: message })
      }
    },
    [dispatch, login],
  )

  const signOut = useCallback(() => {
    // Best-effort server logout; the local session is torn down regardless.
    void logout()
      .unwrap()
      .catch(() => {})
    auth.clearToken()
    storage.remove(STORAGE_KEYS.session)
    dispatch(clearUser())
    // Drop every cached query so the next user never sees the last one's data.
    dispatch(apiSlice.util.resetApiState())
    toast.success('Signed out')
  }, [dispatch, logout])

  return { authed, signingIn, error, clearError, signIn, signOut }
}
