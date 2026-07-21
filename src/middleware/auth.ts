/**
 * Token custody. The HTTP layer reads from here; feature code should not.
 */

import { STORAGE_KEYS } from '@/constants/constants'
import { storage } from '@/utils/storage'

export const auth = {
  getToken(): string | null {
    return storage.get<string>(STORAGE_KEYS.token)
  },

  setToken(token: string): void {
    storage.set(STORAGE_KEYS.token, token)
  },

  clearToken(): void {
    storage.remove(STORAGE_KEYS.token)
  },

  /**
   * The refresh token. Persisted at login and handed to `logout` for its body so
   * the backend can revoke the session; the reserved token-refresh flow (see
   * `lib/http`) will read it here too. Kept separate from `clearToken` so a 401
   * can drop the dead access token without discarding the means to refresh it.
   */
  getRefreshToken(): string | null {
    return storage.get<string>(STORAGE_KEYS.refreshToken)
  },

  setRefreshToken(token: string): void {
    storage.set(STORAGE_KEYS.refreshToken, token)
  },

  clearRefreshToken(): void {
    storage.remove(STORAGE_KEYS.refreshToken)
  },

  isAuthenticated(): boolean {
    return auth.getToken() !== null
  },
}
