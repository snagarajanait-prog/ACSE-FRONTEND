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

  isAuthenticated(): boolean {
    return auth.getToken() !== null
  },
}
