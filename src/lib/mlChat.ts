/**
 * The copilot's chat wiring — the two halves of one turn, joined by a `requestId`
 * the caller mints per message:
 *
 *   1. `postChatbotMessage`  POST {backend}/api/v1/chatbot/message
 *      `{ sessionId, requestId, prompt }` — AUTHED (the `http` layer attaches the
 *      Bearer token). The backend forwards the prompt to the ML service; the reply
 *      arrives over the stream, not here. If the backend also echoes an answer in
 *      its body we return it, otherwise the caller reads the stream.
 *   2. `streamChat`          GET {ML}/chat/stream?request_id=… (SSE)
 *      The answer streams back as `event: token` frames.
 *
 * The two run CONCURRENTLY: open the stream and fire the POST together, so the
 * stream is connected before the turn starts and reads the live frames. (Opening
 * it only AFTER the turn has finished makes the ML host replay everything as one
 * `event: done` blob with no reasoning/answer boundary.)
 *
 * Reasoning never leaks: the model's private thinking arrives as `event: reasoning`
 * and the answer as `event: token`; `streamChat` renders ONLY `token` frames (and
 * drops `done`/`error`/anything else), so the visible reply is answer-only.
 *
 * SSE quirks handled below (all seen on this ML host):
 *  - the event type is STICKY — only an `event:` line changes it, and several
 *    `data:` lines can follow one `event:` line;
 *  - each `data:` line is its own complete `{"content":"…"}` JSON.
 */

import config from '@/config'
import { http } from '@/lib/http'

/** Opts out of ngrok's free-tier browser-warning interstitial on the ML host. */
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' } as const

export interface ChatMessageArgs {
  /** The chat conversation id — minted per conversation, reused across its turns. */
  sessionId: string
  /** UUID minted per message; ties this POST to its `/chat/stream` read. */
  requestId: string
  prompt: string
  signal?: AbortSignal
}

/** Loose shape of the backend envelope's `data` for a chat message. */
interface ChatMessageData {
  content?: string
  answer?: string
  reply?: string
  response?: string
  sessionId?: string
  requestId?: string
}

/**
 * POST the prompt to the backend (authed, plaintext to match the endpoint). The
 * backend hands off to ML — the reply streams over `streamChat` — so the body is
 * usually just an ACK; if it happens to echo the answer we return that instead so
 * the caller can settle on it without waiting for the stream.
 */
export async function postChatbotMessage({
  sessionId,
  requestId,
  prompt,
  signal,
}: ChatMessageArgs): Promise<string> {
  const res = await http.post<{ data?: ChatMessageData }>(
    config.chat.message,
    { sessionId, requestId, prompt },
    { skipEncryption: true, signal },
  )
  const d = res?.data
  return (d?.content ?? d?.answer ?? d?.reply ?? d?.response ?? '').trim()
}

export interface StreamHandlers {
  /** A live answer chunk — append it to the visible reply. */
  onToken?: (chunk: string) => void
  /** A live reasoning chunk — the model thinking before it answers (not rendered). */
  onReasoning?: (chunk: string) => void
  signal?: AbortSignal
}

/** One `data:` payload; the ML host wraps each chunk as `{ "content": "…" }`. */
function chunkOf(data: string): string {
  if (!data || data === '{}' || data === '[DONE]') return ''
  try {
    return (JSON.parse(data) as { content?: string }).content ?? ''
  } catch {
    return ''
  }
}

/**
 * Open the SSE stream for `requestId` and pump the answer to the handlers,
 * rendering tokens live. Resolves with the full accumulated answer once the
 * stream ends (so the caller can settle the final message authoritatively).
 *
 * ONLY `event: token` frames feed the answer; `event: reasoning` goes to
 * `onReasoning` (unused today) and every other event — notably a late-open
 * `event: done` replay that concatenates reasoning + answer — is DROPPED, so
 * nothing here can leak the model's thinking into the reply.
 */
export async function streamChat(requestId: string, handlers: StreamHandlers = {}): Promise<string> {
  const url = `${config.mlChat.stream}?request_id=${encodeURIComponent(requestId)}`
  // `ngrok-skip-browser-warning` dodges ngrok's free-tier HTML interstitial when the
  // browser hits the ML host directly (no dev proxy). Same-origin in proxy mode, so
  // it's harmless there. See src/lib/http.ts for the same header on the main API.
  const res = await fetch(url, {
    headers: { accept: 'text/event-stream', ...NGROK_HEADERS },
    signal: handlers.signal,
  })
  if (!res.ok || !res.body) throw new Error(`chat stream failed (${res.status})`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let event = 'message' // sticky until an `event:` line changes it
  let answer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Dispatch every complete line; keep the trailing partial in the buffer.
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.replace(/\r$/, '')
      if (!line || line.startsWith(':')) continue // blank or comment
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
        continue
      }
      if (!line.startsWith('data:')) continue
      const chunk = chunkOf(line.slice(5).trim())
      if (!chunk) continue
      if (event === 'reasoning') handlers.onReasoning?.(chunk)
      else if (event === 'token') {
        answer += chunk
        handlers.onToken?.(chunk)
      }
      // Any other event (e.g. a `done` replay or an `error`) is intentionally ignored.
    }
  }

  return answer
}
