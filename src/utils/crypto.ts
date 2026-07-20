/**
 * Client-side AES-GCM using the Web Crypto API.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRACT WITH THE BACKEND — all four points must be confirmed before this works.
 * Every one of them is an assumption right now:
 *
 *   1. Cipher      AES-256-GCM.
 *   2. Wire format base64( iv[12 bytes] || ciphertext || tag[16 bytes] ).
 *                  Web Crypto appends the GCM tag to the ciphertext automatically,
 *                  so the backend must do the same (most libraries do). If the
 *                  backend returns the tag separately, IV_BYTES/decrypt change.
 *   3. Plaintext   UTF-8 JSON.
 *   4. Key         base64 AES-256 key handed to the client at login.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The key is held in a module variable ONLY — never localStorage/sessionStorage,
 * which any XSS can read. That would defeat the entire point of this layer.
 *
 * Note: `crypto.subtle` exists only in secure contexts. HTTPS and localhost are
 * fine; a plain-http staging host is NOT and will fail at runtime.
 */

const ALGORITHM = 'AES-GCM'
const IV_BYTES = 12

let sessionKey: CryptoKey | null = null

// Return type is pinned to Uint8Array<ArrayBuffer> — the bare `Uint8Array` alias
// is backed by ArrayBufferLike, which Web Crypto's BufferSource won't accept.
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/** Call once at login, with the base64 data key issued by the backend. */
export async function setSessionKey(base64Key: string): Promise<void> {
  const raw = base64ToBytes(base64Key)
  sessionKey = await crypto.subtle.importKey('raw', raw, ALGORITHM, false, [
    'encrypt',
    'decrypt',
  ])
}

/** Call on logout. */
export function clearSessionKey(): void {
  sessionKey = null
}

export function hasSessionKey(): boolean {
  return sessionKey !== null
}

/** Decrypts a base64 envelope back into the original JSON value. */
export async function decryptPayload<T>(payload: string): Promise<T> {
  if (!sessionKey) throw new Error('No session key — cannot decrypt. Was login completed?')

  const bytes = base64ToBytes(payload)
  const iv = bytes.slice(0, IV_BYTES)
  const ciphertext = bytes.slice(IV_BYTES)

  // Throws if the tag fails to verify — i.e. the payload was tampered with.
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, sessionKey, ciphertext)

  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

/** Encrypts a JSON-serializable value into a base64 envelope. */
export async function encryptPayload(value: unknown): Promise<string> {
  if (!sessionKey) throw new Error('No session key — cannot encrypt. Was login completed?')

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, sessionKey, plaintext)

  const packed = new Uint8Array(iv.length + ciphertext.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(ciphertext), iv.length)

  return bytesToBase64(packed)
}
