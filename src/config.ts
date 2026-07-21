/**
 * SINGLE source of truth for env vars, URLs and feature flags.
 * Nothing else in the app reads `import.meta.env` directly.
 *
 * Which `.env` file backs these values is decided by Vite's MODE:
 *
 *   npm run dev        → .env.development
 *   npm run build      → .env.production
 *   npm run dev:prod   → .env.production   (prod config against a local dev server)
 *   npm run build:dev  → .env.development  (dev build you can actually deploy)
 *
 * Missing or contradictory config throws at module load — i.e. on a blank page at
 * boot, with the reason on screen. That is deliberate: the alternative is finding
 * out via a 404 to `undefined/auth/login`, or worse, shipping plaintext because
 * an encryption key was empty.
 */

import { paths } from '@/constants/endPoints'

type AppEnv = 'development' | 'staging' | 'production'

/** Only this project's own vars — all typed `string` in `vite-env.d.ts`. */
type EnvKey = keyof ImportMetaEnv

function read(key: EnvKey): string {
  return (import.meta.env[key] ?? '').trim()
}

function required(key: EnvKey): string {
  const value = read(key)
  if (!value) {
    throw new Error(
      `[config] Missing required env var ${key}. ` +
        `Add it to .env.${import.meta.env.MODE} (or .env.${import.meta.env.MODE}.local) ` +
        `— see .env.example for the full list.`,
    )
  }
  return value
}

/** Env values are always strings; `VITE_X=false` is the string "false", which is truthy. */
function bool(key: EnvKey, fallback: boolean): boolean {
  const value = read(key).toLowerCase()
  if (value === '') return fallback
  return value === 'true' || value === '1'
}

const appEnv = (read('VITE_APP_ENV') || 'development') as AppEnv
const baseUrl = required('VITE_API_BASE_URL').replace(/\/+$/, '')

// The ML assistant service — a separate origin from the main backend. Optional:
// when unset it falls back to the shared ngrok demo host so the copilot still
// talks to something out of the box. In dev this is normally a same-origin PATH
// (e.g. "/ml-api") that the Vite proxy forwards to the real ngrok origin, which
// both dodges CORS and injects ngrok's skip-browser-warning header — the same
// trick the main API uses (see VITE_DEV_PROXY_TARGET / vite.config.ts).
const ML_FALLBACK_HOST = 'https://octagon-overpass-smuggling.ngrok-free.dev'
const mlBaseUrl = (read('VITE_ML_API_BASE_URL') || ML_FALLBACK_HOST).replace(/\/+$/, '')
const mlUrl = (path: string): string => `${mlBaseUrl}${path}`

// Encryption defaults ON in production. Shipping prod with the layer silently off
// should take an explicit `VITE_ENCRYPTION_ENABLED=false`, never an omission.
const encryptionEnabled = bool('VITE_ENCRYPTION_ENABLED', appEnv === 'production')
const rsaPublicKey = read('VITE_RSA_PUBLIC_KEY')

if (encryptionEnabled && !rsaPublicKey) {
  throw new Error(
    '[config] VITE_ENCRYPTION_ENABLED is true but VITE_RSA_PUBLIC_KEY is empty. ' +
      'Encryption cannot run without the backend public key. Either paste the key into ' +
      `.env.${import.meta.env.MODE} (or .env.${import.meta.env.MODE}.local), ` +
      'or set VITE_ENCRYPTION_ENABLED=false to run in plaintext.',
  )
}

const url = (path: string): string => `${baseUrl}${path}`

export const config = {
  env: appEnv,
  isDev: appEnv === 'development',
  isProd: appEnv === 'production',

  baseUrl,
  /** Origin (or dev-proxy path prefix) of the ML assistant service. */
  mlBaseUrl,

  encryption: {
    enabled: encryptionEnabled,
    /** Backend RSA public key — PEM block or bare base64 SPKI, `utils/crypto` handles both. */
    publicKey: rsaPublicKey,
  },

  auth: {
    login: url(paths.auth.login),
    logout: url(paths.auth.logout),
    refresh: url(paths.auth.refresh),
    me: url(paths.auth.me),
  },

  pages: {
    myPermissions: url(paths.pages.myPermissions),
  },

  /** ML assistant endpoints (built off `mlBaseUrl`, not the main `baseUrl`). */
  ml: {
    chat: mlUrl(paths.ml.chat),
    chatStream: mlUrl(paths.ml.chatStream),
  },
} as const

export default config
