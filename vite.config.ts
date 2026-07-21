import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Fails the dev server / build when the `.env` for the current mode is incomplete.
 *
 * `src/config.ts` performs the same check at runtime, but that module ends up in a
 * lazily-loaded chunk — the throw would land on whichever screen happens to import
 * it first, long after deploy. Checking here means a missing API URL, or an
 * encryption flag with no key, is a build failure instead of a white screen.
 *
 * Kept deliberately in sync with `src/config.ts`; this file runs in Node and cannot
 * import a module that reads `import.meta.env`.
 */
function validateEnv(mode: string): Plugin {
  return {
    name: 'acse:validate-env',
    config() {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      const fail = (problem: string, fix: string): never => {
        throw new Error(
          `\n\n  [env] ${problem}\n` +
            `        Fix: ${fix}\n` +
            `        File: .env.${mode}  — or override locally in .env.${mode}.local,\n` +
            `              which outranks it. Note .env.local does NOT: .env.${mode} wins over it.\n`,
        )
      }

      if (!env.VITE_API_BASE_URL?.trim()) {
        fail('VITE_API_BASE_URL is missing.', 'set it to the backend origin, no trailing slash.')
      }

      const appEnv = env.VITE_APP_ENV?.trim() || 'development'
      const flag = (env.VITE_ENCRYPTION_ENABLED ?? '').trim().toLowerCase()
      const encryptionOn = flag === '' ? appEnv === 'production' : flag === 'true' || flag === '1'

      if (encryptionOn && !env.VITE_RSA_PUBLIC_KEY?.trim()) {
        fail(
          'VITE_ENCRYPTION_ENABLED is true but VITE_RSA_PUBLIC_KEY is empty — the app would ship with encryption on and no key to encrypt with.',
          'paste the backend RSA public key, or set VITE_ENCRYPTION_ENABLED=false to run in plaintext.',
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBase = env.VITE_API_BASE_URL?.trim() ?? ''
  const proxyTarget = env.VITE_DEV_PROXY_TARGET?.trim()

  // Dev-only reverse proxy. When VITE_API_BASE_URL is a same-origin PATH (e.g.
  // "/api/v1") and VITE_DEV_PROXY_TARGET names the real backend origin, the dev
  // server forwards that path prefix there. Two things this fixes that a direct
  // cross-origin fetch from the browser cannot:
  //   1. CORS — the browser now talks same-origin to Vite, so there is no preflight
  //      and the backend's Access-Control-Allow-* config stops mattering in dev.
  //   2. ngrok's free-tier browser-warning interstitial (a text/html page with
  //      Ngrok-Error-Code: ERR_NGROK_6024), which it serves for browser GETs. The
  //      header below opts out of it — injected here on the server→backend hop so
  //      it never rides on a browser request, where a custom header would itself
  //      force a preflight the backend rejects.
  const proxy =
    proxyTarget && apiBase.startsWith('/')
      ? {
          [apiBase]: {
            target: proxyTarget,
            changeOrigin: true,
            secure: true,
            headers: { 'ngrok-skip-browser-warning': 'true' },
          },
        }
      : undefined

  return {
    plugins: [react(), tailwindcss(), validateEnv(mode)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: { proxy },
  }
})
