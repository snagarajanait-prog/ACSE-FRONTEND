/**
 * API paths only — no host, no logic. `config.ts` turns these into full URLs.
 * Grouped by domain so they stay findable as the list grows.
 */

export const paths = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  pages: {
    /** Page slugs the signed-in user may see — drives the admin sidebar. */
    myPermissions: '/permission/pages',
  },
  organizations: {
    /** Org display name + logo shown app-wide. GET reads it; PATCH (multipart) updates it. */
    profile: '/organizations/profile',
  },
  assistant: {
    /** Emails (and, for the demo, returns) the 6-digit code that gates the chat. */
    sendCode: '/assistant/send-code',
    /** Exchanges the code for an assistant token once the visitor keys it in. */
    verifyCode: '/assistant/verify-code',
  },
} as const
