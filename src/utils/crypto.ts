/**
 * Hybrid payload encryption — RSA-OAEP + AES-256-GCM. Implements `docs/image.png`.
 *
 * Per request, the browser:
 *   1. generates a temporary 256-bit secret
 *   2. derives a REQUEST key and a RESPONSE key from it (HKDF, different labels)
 *   3. encrypts the payload with the request key (AES-256-GCM)
 *   4. wraps the temporary secret with the backend's RSA-OAEP public key
 *   5. sends both; keeps the response key in memory to decrypt the reply
 *
 * The backend unwraps the secret with its private key, derives the same two keys,
 * decrypts the request, and encrypts its response with the response key.
 *
 * Why this beats a long-lived shared key: the secret is new for every request and
 * never leaves this module in plaintext, so there is no session key sitting in
 * memory for an XSS to lift and no single compromise that decrypts past traffic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRACT WITH THE BACKEND — confirm each point; they are assumptions today.
 *
 *   1. Wrap        RSA-OAEP, SHA-256, no label.
 *   2. Derivation  HKDF-SHA256, EMPTY salt, `info` = the HKDF_INFO strings below,
 *                  output 32 bytes. Any mismatch fails as a GCM tag error, which
 *                  reads like corruption rather than a config bug — check here first.
 *   3. Wire format base64( iv[12] || ciphertext || tag[16] ). WebCrypto appends the
 *                  tag automatically; most backend libraries do too. If yours
 *                  returns the tag separately, that is the thing to fix.
 *   4. Envelope    request body `{ "data": "<base64>" }`, wrapped secret in the
 *                  `X-Encrypted-Key` header (see `lib/http.ts`). The header carries
 *                  it so GET and DELETE — which have no body — still get encrypted
 *                  responses.
 *   5. Plaintext   UTF-8 JSON.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `crypto.subtle` only exists in secure contexts. HTTPS and localhost are fine;
 * a plain-http staging host is NOT and will fail at runtime.
 */

import config from '@/config'

const AES = 'AES-GCM'
const AES_KEY_BITS = 256
const HASH = 'SHA-256'
const IV_BYTES = 12
const SECRET_BYTES = 32

/** HKDF `info` labels. Must match the backend byte for byte. */
const HKDF_INFO = {
  request: 'acse:request',
  response: 'acse:response',
} as const

type Direction = keyof typeof HKDF_INFO

/** Result of encrypting one request. */
export interface EncryptedRequest {
  /** RSA-OAEP-wrapped temporary secret, base64. Travels in the header. */
  wrappedSecret: string
  /** base64( iv || ciphertext || tag ), or null when the request has no body. */
  data: string | null
  /** Non-extractable key for the matching response. Never transmitted. */
  responseKey: CryptoKey
}

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

/** Accepts a full PEM block or a bare one-line base64 SPKI body. */
function toDer(key: string): Uint8Array<ArrayBuffer> {
  return base64ToBytes(key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''))
}

// Imported once and reused. A rejection is cached too — a malformed key is a build
// config error, and retrying per request would just spam the same failure.
let publicKeyPromise: Promise<CryptoKey> | null = null

function getPublicKey(): Promise<CryptoKey> {
  if (!publicKeyPromise) {
    publicKeyPromise = (async () => {
      if (!config.encryption.publicKey) {
        throw new Error('[crypto] VITE_RSA_PUBLIC_KEY is empty — cannot encrypt.')
      }
      try {
        return await crypto.subtle.importKey(
          'spki',
          toDer(config.encryption.publicKey),
          { name: 'RSA-OAEP', hash: HASH },
          false,
          ['encrypt'],
        )
      } catch (cause) {
        throw new Error(
          '[crypto] VITE_RSA_PUBLIC_KEY is not a valid SPKI public key. ' +
            'Expected the PEM that begins "-----BEGIN PUBLIC KEY-----" (SPKI), ' +
            'not a PKCS#1 "BEGIN RSA PUBLIC KEY" block and not a certificate.',
          { cause },
        )
      }
    })()
  }
  return publicKeyPromise
}

/** HKDF-SHA256 → one AES-256-GCM key. Same secret + same label = same key as the backend. */
async function deriveAesKey(
  secret: Uint8Array<ArrayBuffer>,
  direction: Direction,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: HASH,
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(HKDF_INFO[direction]),
    },
    material,
    { name: AES, length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function aesEncrypt(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: AES, iv }, key, plaintext)

  const packed = new Uint8Array(iv.length + ciphertext.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(ciphertext), iv.length)

  return bytesToBase64(packed)
}

/**
 * Encrypts one request. Pass `undefined` for bodyless verbs (GET/DELETE) — you
 * still get a wrapped secret and a response key, so the reply can come back encrypted.
 */
export async function encryptRequest(body: unknown): Promise<EncryptedRequest> {
  const publicKey = await getPublicKey()
  const secret = crypto.getRandomValues(new Uint8Array(SECRET_BYTES))

  try {
    const [requestKey, responseKey] = await Promise.all([
      deriveAesKey(secret, 'request'),
      deriveAesKey(secret, 'response'),
    ])

    const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, secret)

    return {
      wrappedSecret: bytesToBase64(new Uint8Array(wrapped)),
      data: body === undefined ? null : await aesEncrypt(requestKey, body),
      responseKey,
    }
  } finally {
    // Best-effort scrub. The derived keys are non-extractable, so from here on the
    // secret exists only inside WebCrypto.
    secret.fill(0)
  }
}

/** Decrypts a response envelope using the key kept from `encryptRequest`. */
export async function decryptResponse<T>(responseKey: CryptoKey, payload: string): Promise<T> {
  const bytes = base64ToBytes(payload)
  const iv = bytes.slice(0, IV_BYTES)
  const ciphertext = bytes.slice(IV_BYTES)

  // Throws if the tag fails to verify — tampering, or a derivation mismatch (see
  // point 2 of the contract above).
  const plaintext = await crypto.subtle.decrypt({ name: AES, iv }, responseKey, ciphertext)

  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

/** The `VITE_ENCRYPTION_ENABLED` switch, for code that needs to branch on it. */
export function isEncryptionEnabled(): boolean {
  return config.encryption.enabled
}
