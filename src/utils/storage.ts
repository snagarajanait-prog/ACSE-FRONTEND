/**
 * Typed localStorage wrapper. Never touch localStorage directly — it throws in
 * private-browsing modes and returns raw strings.
 */

export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? null : (JSON.parse(raw) as T)
    } catch {
      return null
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage unavailable or full — non-fatal.
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // Non-fatal.
    }
  },
}
