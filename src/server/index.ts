/**
 * Barrel for the API layer. Import as `import { authApi } from '@/server'`.
 *
 * Split one file per domain (auth.ts, contacts.ts, reports.ts …) rather than
 * growing a single server.ts — the reference codebase's 1000-line server.js is
 * the debt this avoids.
 */

export * as authApi from '@/server/auth'
