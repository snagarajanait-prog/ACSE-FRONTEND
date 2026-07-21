/// <reference types="vite/client" />

/**
 * Types for this project's `VITE_*` vars, so a typo is a compile error rather
 * than a silent `undefined` at runtime.
 *
 * Everything is `string` on purpose — env values always arrive as strings, even
 * `VITE_ENCRYPTION_ENABLED=true`. `config.ts` does the parsing; read the parsed
 * values from there, never `import.meta.env` directly.
 *
 * Adding a var means touching three files: `.env.example`, each `.env.[mode]`,
 * and this interface.
 */
interface ImportMetaEnv {
  readonly VITE_APP_ENV: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENCRYPTION_ENABLED: string
  readonly VITE_RSA_PUBLIC_KEY: string
  /** ML assistant service origin, or a same-origin dev-proxy path (e.g. "/ml-api"). */
  readonly VITE_ML_API_BASE_URL: string
  /** Dev-only: real ML origin the `VITE_ML_API_BASE_URL` path prefix proxies to. */
  readonly VITE_ML_DEV_PROXY_TARGET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
