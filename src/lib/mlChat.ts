/**
 * Client for the ML assistant service — the copilot's real backend.
 *
 * This service is deliberately NOT routed through `lib/http`: it lives on its own
 * origin (`config.mlBaseUrl`), takes plaintext (no encryption envelope), uses no
 * Bearer token, and — crucially — answers with Server-Sent Events, which the
 * JSON-only `http` layer cannot read. So it gets its own small, purpose-built
 * client here.
 *
 * The conversation is two calls that share a `request_id`:
 *   1. POST /chat          — kicks a turn off; also returns the whole answer.
 *   2. GET  /chat/stream   — SSE feed of the same turn, token by token:
 *        `event: reasoning` frames (the model's private thinking) then
 *        `event: token` frames (the answer the customer sees).
 *
 * Wire format note: a single event block may carry several `data:` lines under
 * one `event:` line, and each `data:` line is its own complete JSON object —
 * `{ "content": "..." }`. The parser below treats the event type as *sticky*
 * (only an explicit `event:` line changes it) and dispatches each `data:` line as
 * it arrives, which is what makes the grouped-`data:` frames work.
 */

import config from '@/config'

/** Opts every request out of ngrok's free-tier browser-warning interstitial. */
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' } as const

/** The POST /chat request body, in the service's snake_case wire shape. */
interface ChatWireBody {
  message: string
  request_id: string
  thread_id: string
}

/** The POST /chat response, exactly as the service returns it. */
export interface MlChatResponse {
  content: string
  reasoning: string
  thread_id: string
  request_id: string
}

export interface SendChatArgs {
  message: string
  /** Correlates the POST with its SSE stream. Unique per turn. */
  requestId: string
  /** Conversation id — reuse it across a session so the model keeps context. */
  threadId?: string
  signal?: AbortSignal
}

/**
 * A fresh, unique id for a single turn. `crypto.randomUUID` where available (all
 * current browsers over HTTPS/localhost); a timestamp+random string otherwise.
 */
export function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

/** POST a message and get the full answer back (also fans out over the stream). */
export async function sendChatMessage({
  message,
  requestId,
  threadId = 'default',
  signal,
}: SendChatArgs): Promise<MlChatResponse> {
  const body: ChatWireBody = { message, request_id: requestId, thread_id: threadId }
  const res = await fetch(config.ml.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json', ...NGROK_HEADERS },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`ML /chat POST failed: ${res.status} ${res.statusText}`)
  return (await res.json()) as MlChatResponse
}

export interface StreamHandlers {
  /** A chunk of the model's private reasoning. */
  onReasoning?: (chunk: string) => void
  /** A chunk of the answer shown to the customer. */
  onToken?: (chunk: string) => void
  /** Escape hatch for any other event type the service may add later. */
  onEvent?: (event: string, content: string) => void
  signal?: AbortSignal
}

/** Pull `content` out of one SSE `data:` payload, tolerating a non-JSON line. */
function contentOf(dataPayload: string): string {
  try {
    const parsed = JSON.parse(dataPayload) as { content?: unknown }
    return typeof parsed?.content === 'string' ? parsed.content : ''
  } catch {
    // Not JSON — treat the raw line as the content so nothing is silently dropped.
    return dataPayload
  }
}

/**
 * Open the SSE stream for `requestId` and drive the handlers until it closes.
 * Resolves when the server ends the stream; rejects on a transport/HTTP error or
 * if the request is aborted.
 */
export async function streamChat(requestId: string, handlers: StreamHandlers): Promise<void> {
  const url = `${config.ml.chatStream}?request_id=${encodeURIComponent(requestId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'text/event-stream', ...NGROK_HEADERS },
    signal: handlers.signal,
  })
  if (!res.ok) throw new Error(`ML /chat/stream GET failed: ${res.status} ${res.statusText}`)
  if (!res.body) throw new Error('ML /chat/stream returned no body to read')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // Sticky across event blocks: only an explicit `event:` line changes it, which
  // is how grouped `data:` lines (no repeated `event:` header) keep their type.
  let currentEvent = 'message'

  const handleLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, '')
    if (line === '' || line.startsWith(':')) return // block separator / comment
    if (line.startsWith('event:')) {
      currentEvent = line.slice('event:'.length).trim()
      return
    }
    if (line.startsWith('data:')) {
      const payload = line.slice('data:'.length).trim()
      if (!payload) return
      const content = contentOf(payload)
      if (currentEvent === 'reasoning') handlers.onReasoning?.(content)
      else if (currentEvent === 'token') handlers.onToken?.(content)
      handlers.onEvent?.(currentEvent, content)
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.indexOf('\n')) >= 0) {
        handleLine(buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
      }
    }
    // Flush anything the server sent without a trailing newline.
    if (buffer) handleLine(buffer)
  } finally {
    // Free the connection promptly if we bailed early (abort / caller unmount).
    reader.cancel().catch(() => {})
  }
}
