/**
 * Owns the Copilot screen's conversation state and scenario playback, so
 * `index.tsx` stays a thin view.
 *
 * The engine is decoupled from any particular look: it exposes already
 * token-resolved messages and transient "thinking" phrases, and consumers just
 * render. That is what would let a second presentation (a voice concierge, an
 * embedded widget) stay behaviourally identical without duplicating this file.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { toast } from 'sonner'
import i18n from '@/i18n'
import { getIcon } from '@/containers/copilot/utils/iconMap'
import { postChatbotMessage, streamChat } from '@/lib/mlChat'
import { findAccount, findCustomer, type Account, type Customer } from '@/data/customers'
import { getScenario, type ChatStep } from '@/data/scenarios'
import { findUseCase, useCases, type UseCase } from '@/data/useCases'
import { DATA_SOURCE_META, type DataSource } from '@/redux/dataSourceSlice'
import { clearScenario } from '@/redux/demoSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'

/**
 * A single rendered chat entry. `step` is already token-resolved against the
 * active customer/account/data-source, so presentational layers can render it
 * directly without touching the raw scenario data.
 */
export interface Msg {
  id: number
  /**
   * Which conversation this entry belongs to. The seeded greeting is 0; every
   * new scenario run or free exchange increments it. This is what lets a single
   * settled thread be split back into the separate conversations it holds, so
   * each one closes with its own Copy / Share / Export bar.
   */
  conversationId: number
  step: ChatStep
}

/** A use-case suggestion with its resolved lucide icon component. */
export interface EnginePill extends UseCase {
  Icon: ReturnType<typeof getIcon>
}

/** A live identity challenge: the storyboard is held until a code is entered. */
export interface OtpPrompt {
  channel: 'sms' | 'email'
  /** Instruction to show above the entry boxes, already token-resolved. */
  text: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * How long each "working" phrase is shown before the next. The engine's hold
 * duration (see `play`) and the phrase cycler both derive from this one
 * constant, so the shimmer cadence can never drift between them.
 */
export const THINK_INTERVAL_MS = 750

/** The verification code shown on auto-verified OTP cards (presentation-only). */
export const OTP_DIGITS = ['6', '2', '9', '1', '0', '4'] as const

/**
 * Scenarios whose OTP step is a real challenge — playback stops and waits for
 * the customer to key a code in — rather than a card that auto-verifies itself.
 *
 * Whether the challenge actually fires also depends on the active mode: only
 * modes with `promptsForOtp` ask (see DATA_SOURCE_META). Every other scenario
 * keeps the auto-verified card in both modes.
 */
const OTP_ENTRY_SCENARIOS = new Set(['start-service'])

/**
 * Cycle through a list of phrases one at a time (used by the "thinking"
 * indicator). Kept here so its timing stays locked to the engine's playback.
 */
export function useCyclingPhrase(phrases: string[], intervalMs = THINK_INTERVAL_MS): string {
  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
    if (phrases.length <= 1) return
    const t = setInterval(() => setI((p) => (p + 1 < phrases.length ? p + 1 : p)), intervalMs)
    return () => clearInterval(t)
  }, [phrases, intervalMs])
  return phrases[Math.min(i, phrases.length - 1)]
}

function greeting(name: string) {
  const h = new Date().getHours()
  const part =
    h < 12
      ? i18n.t('copilot:greeting.morning')
      : h < 18
        ? i18n.t('copilot:greeting.afternoon')
        : i18n.t('copilot:greeting.evening')
  return i18n.t('copilot:greeting.line', { part, name: name.split(' ')[0] })
}

// Default "working" phrases shown (shimmering, one at a time) before a response.
// Resolved fresh (in the active language) at play time, and the {account}/{source}
// tokens they still carry are token-resolved by `resolve` afterwards.
const thinkIntent = () => [
  i18n.t('copilot:think.analysing'),
  i18n.t('copilot:think.intent'),
  i18n.t('copilot:think.checkingAccount'),
]
const thinkStatus = () => [i18n.t('copilot:think.requesting'), i18n.t('copilot:think.processing')]
const thinkSummary = () => [i18n.t('copilot:think.compiling'), i18n.t('copilot:think.summarising')]
const thinkFallback = () => [i18n.t('copilot:think.analysing'), i18n.t('copilot:think.matching')]

/**
 * Which "thinking" phrases to shimmer before a step appears. Authored `think`
 * on the step wins; otherwise a default is chosen by kind. Returns null for
 * plain follow-up lines, which fall back to the simple typing dots.
 */
function thinkPhrasesFor(step: ChatStep, prevWasUser: boolean): string[] | null {
  const authored = 'think' in step ? step.think : undefined
  if (authored && authored.length) return authored
  switch (step.kind) {
    case 'status':
      return thinkStatus()
    case 'summary':
      return thinkSummary()
    case 'ai':
      return prevWasUser ? thinkIntent() : null
    default:
      return null
  }
}

export interface ChatEngine {
  customer: Customer | undefined
  account: Account | undefined
  source: DataSource
  meta: (typeof DATA_SOURCE_META)[DataSource]
  pills: EnginePill[]
  messages: Msg[]
  /** Sequence of shimmering "working" phrases, or null when not thinking. */
  thinking: string[] | null
  /** True while the simple typing-dots indicator should show. */
  typing: boolean
  /** True while a storyboard/response is playing (locks the composer). */
  playing: boolean
  /**
   * Set while the storyboard is held on an identity challenge. Render an entry
   * box for it; `playing` stays true throughout, so the composer stays locked
   * and the code is the only way forward.
   */
  otpPrompt: OtpPrompt | null
  /** Accept the typed code and resume the held storyboard. */
  submitOtp: (code: string) => void
  /**
   * Set while the storyboard is held waiting for the customer to type their own
   * turn — every scripted `user` line after the opening one becomes a real
   * prompt. `hint` is that scripted line, offered as a one-tap suggested reply.
   * `playing` stays true throughout, but the composer is UNLOCKED (unlike the
   * OTP hold): the customer's reply is what resumes the conversation.
   */
  awaitingUser: { hint: string } | null
  /** Accept a typed (or suggested) reply and resume the held storyboard. */
  submitUserTurn: (text: string) => void
  draft: string
  setDraft: (v: string) => void
  onSend: () => void
  startScenario: (id: string, userText?: string) => void
  resetConversation: () => void
  /** Attach to the scrollable message container; auto-scrolls to newest. */
  scrollRef: RefObject<HTMLDivElement | null>
}

export function useChatEngine(): ChatEngine {
  const dispatch = useAppDispatch()
  const { selectedCustomerId, selectedAccountId, activeScenarioId, assistantSessionId } =
    useAppSelector((s) => s.demoSlice)
  const source = useAppSelector((s) => s.dataSourceSlice.source)

  const customer = findCustomer(selectedCustomerId)
  const account = findAccount(customer, selectedAccountId)

  // Keep the latest source in a ref so mid-storyboard toggles resolve live.
  const sourceRef = useRef(source)
  sourceRef.current = source

  const [messages, setMessages] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [thinking, setThinking] = useState<string[] | null>(null)
  const [playing, setPlaying] = useState(false)
  const [otpPrompt, setOtpPrompt] = useState<OtpPrompt | null>(null)
  const [awaitingUser, setAwaitingUser] = useState<{ hint: string } | null>(null)
  const [draft, setDraft] = useState('')
  const idRef = useRef(0)
  const runRef = useRef(0)
  // Bumped at the start of every scenario run / free exchange, and stamped onto
  // each pushed message, so the flat transcript carries its own conversation
  // boundaries. The seeded greeting keeps the initial 0.
  const convRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const otpResolveRef = useRef<((code: string | null) => void) | null>(null)
  const userResolveRef = useRef<((text: string | null) => void) | null>(null)
  // Aborts an in-flight ML stream when the run is torn down or superseded.
  const streamAbortRef = useRef<AbortController | null>(null)
  // True while the live conversation is a real chatbot thread, so consecutive
  // turns share one conversation id instead of each opening its own segment.
  // Cleared whenever a scripted run / context switch / reset starts something else.
  const chatConvActiveRef = useRef(false)

  const abortStream = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
  }, [])

  /**
   * Settle a held challenge: `code` resumes the storyboard, null abandons it.
   * Always call this when tearing a run down — a held `play` is parked on this
   * promise and would never finish (leaving `playing` stuck true) otherwise.
   */
  const settleOtp = useCallback((code: string | null) => {
    const resolve = otpResolveRef.current
    otpResolveRef.current = null
    setOtpPrompt(null)
    resolve?.(code)
  }, [])

  const submitOtp = useCallback((code: string) => settleOtp(code), [settleOtp])

  /**
   * Settle a held customer turn: `text` resumes the storyboard with that reply,
   * null abandons it. Like `settleOtp`, this MUST run on every teardown — a
   * parked `play` is waiting on this promise and would otherwise hang with
   * `playing` stuck true.
   */
  const settleUser = useCallback((text: string | null) => {
    const resolve = userResolveRef.current
    userResolveRef.current = null
    setAwaitingUser(null)
    resolve?.(text)
  }, [])

  const submitUserTurn = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (trimmed) settleUser(trimmed)
    },
    [settleUser],
  )

  // Reset the conversation synchronously when the customer/account context
  // changes — DURING render, so a switch never paints the new account's context
  // alongside the previous account's transcript (a post-paint effect would).
  const contextKey = `${selectedCustomerId ?? ''}:${selectedAccountId ?? ''}`
  const [renderedKey, setRenderedKey] = useState<string | null>(null)
  if (renderedKey !== contextKey) {
    setRenderedKey(contextKey)
    runRef.current++
    idRef.current = 0
    convRef.current = 0
    setPlaying(false)
    setTyping(false)
    setThinking(null)
    settleOtp(null)
    settleUser(null)
    abortStream()
    chatConvActiveRef.current = false
    setMessages(
      customer
        ? [{ id: idRef.current++, conversationId: 0, step: { kind: 'ai', text: greeting(customer.name) } }]
        : [],
    )
  }

  const resolve = useCallback(
    (text: string) => {
      if (!customer || !account) return text
      const meta = DATA_SOURCE_META[sourceRef.current]
      // Always the neutral chat vocabulary — the internal source names belong to
      // the staff-only toggle and must never reach the conversation.
      return text
        .split('{name}')
        .join(customer.name)
        .split('{account}')
        .join(account.id)
        .split('{address}')
        .join(account.serviceAddress)
        .split('{email}')
        .join(customer.email)
        .split('{source}')
        .join(meta.chatLabel)
        .split('{sourceSystem}')
        .join(meta.chatSystem)
    },
    [customer, account],
  )

  const resolveStep = useCallback(
    (step: ChatStep): ChatStep => {
      switch (step.kind) {
        case 'summary':
          return {
            ...step,
            title: resolve(step.title),
            rows: step.rows.map(([k, v]) => [resolve(k), resolve(v)] as [string, string]),
          }
        case 'otp':
          return { ...step, text: resolve(step.text) }
        default:
          return 'text' in step ? { ...step, text: resolve(step.text) } : step
      }
    },
    [resolve],
  )

  const push = useCallback((step: ChatStep) => {
    setMessages((m) => [...m, { id: idRef.current++, conversationId: convRef.current, step }])
  }, [])

  const delayFor = (step: ChatStep) => {
    if (step.kind === 'otp' || step.kind === 'summary') return 900
    if (step.kind === 'status') return 750
    const len = 'text' in step ? step.text.length : 40
    return Math.min(1500, 550 + len * 12)
  }

  const play = useCallback(
    async (steps: ChatStep[], firstUserText?: string, scenarioId?: string) => {
      const myRun = ++runRef.current
      // A scenario is a fresh conversation: give it its own id so it settles
      // with its own take-away bar rather than folding into the one before it.
      convRef.current += 1
      // Abandon a challenge / reply hold left by the run we just superseded.
      settleOtp(null)
      settleUser(null)
      abortStream()
      // A scripted storyboard is not a chatbot thread — the next chatbot turn
      // should open a fresh conversation rather than fold into this one.
      chatConvActiveRef.current = false
      setPlaying(true)
      setTyping(false)
      setThinking(null)
      const challenges =
        Boolean(scenarioId && OTP_ENTRY_SCENARIOS.has(scenarioId)) &&
        DATA_SOURCE_META[sourceRef.current].promptsForOtp

      for (let i = 0; i < steps.length; i++) {
        if (runRef.current !== myRun) return
        const raw = steps[i]

        if (raw.kind === 'user') {
          if (i === 0) {
            // The opening line IS the trigger — the pill tap or the message the
            // customer typed to start this run. Show it and move on.
            await sleep(200)
            if (runRef.current !== myRun) return
            push(firstUserText ? { kind: 'user', text: firstUserText } : resolveStep(raw))
          } else {
            // Every later customer turn is a real prompt: hold here and wait for
            // the customer to type a reply (or tap the suggested one). Nothing
            // but a submitted reply resumes this — that is what makes the
            // conversation interactive rather than a canned playback.
            const hint = (resolveStep(raw) as Extract<ChatStep, { kind: 'user' }>).text
            setAwaitingUser({ hint })
            const reply = await new Promise<string | null>((r) => {
              userResolveRef.current = r
            })
            if (runRef.current !== myRun || reply === null) return
            push({ kind: 'user', text: reply })
            await sleep(400)
          }
        } else if (raw.kind === 'otp' && raw.prompt && challenges) {
          // Hold here: no timer resumes this, only a submitted code does.
          setTyping(true)
          await sleep(delayFor(raw))
          if (runRef.current !== myRun) {
            setTyping(false)
            return
          }
          setTyping(false)
          setOtpPrompt({ channel: raw.channel, text: resolve(raw.prompt) })
          const code = await new Promise<string | null>((r) => {
            otpResolveRef.current = r
          })
          if (runRef.current !== myRun || code === null) return
          push({ ...(resolveStep(raw) as typeof raw), entered: code })
          await sleep(150)
        } else {
          const phrases = thinkPhrasesFor(raw, i > 0 && steps[i - 1].kind === 'user')
          if (phrases) {
            // Shimmering "working" phrases (Analysing → Requesting → …).
            setThinking(phrases.map(resolve))
            await sleep(Math.max(1000, phrases.length * THINK_INTERVAL_MS))
            if (runRef.current !== myRun) {
              setThinking(null)
              return
            }
            setThinking(null)
          } else {
            // Plain typing dots for simple follow-up lines.
            setTyping(true)
            await sleep(delayFor(raw))
            if (runRef.current !== myRun) {
              setTyping(false)
              return
            }
            setTyping(false)
          }
          push(resolveStep(raw))
          await sleep(150)
        }
      }
      setPlaying(false)
    },
    [push, resolve, resolveStep, settleOtp, settleUser, abortStream],
  )

  /**
   * A real chatbot turn. POST the prompt to the backend (`/chatbot/message`) and
   * read the reply off the ML SSE stream, rendering tokens live. The two share a
   * per-message `requestId`; the `sessionId` is the VERIFIED session from the email
   * gate (`assistantSessionId`) — the backend rejects any id it did not mint
   * ("Session not found"), so there is nothing to generate here. The visible reply
   * is answer-only — the stream drops `reasoning`/`done` (see `lib/mlChat`).
   */
  const sendToChatbot = useCallback(
    async (prompt: string) => {
      const sessionId = assistantSessionId
      if (!sessionId) {
        // No verified session (the email gate never minted one) — the backend would
        // reject a made-up id, so surface the unavailable state instead of failing.
        push({ kind: 'user', text: prompt })
        push({ kind: 'ai', text: i18n.t('copilot:chat.mlError') })
        toast.error(i18n.t('copilot:chat.mlError'))
        return
      }

      const myRun = ++runRef.current
      // The chatbot thread is ONE continuous conversation: only the opening turn
      // starts a fresh segment; later turns append to it. The backend `sessionId`
      // is the same throughout (it came from the verified gate), so continuity is
      // inherent. A scripted run / context switch / reset clears the flag.
      if (!chatConvActiveRef.current) {
        convRef.current += 1
        chatConvActiveRef.current = true
      }
      settleOtp(null)
      settleUser(null)
      abortStream()
      setPlaying(true)
      setTyping(false)
      setThinking(null)

      push({ kind: 'user', text: prompt })
      // Working shimmer until the first answer token lands.
      setThinking(thinkFallback().map(resolve))

      const requestId = crypto.randomUUID()
      const controller = new AbortController()
      streamAbortRef.current = controller

      // Created lazily on the first token, so the thinking shimmer isn't replaced
      // by an empty bubble while we wait.
      let aiId = -1
      const setAiText = (text: string) =>
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aiId && msg.step.kind === 'ai' ? { ...msg, step: { ...msg.step, text } } : msg,
          ),
        )
      const appendToken = (chunk: string) => {
        if (runRef.current !== myRun) return
        if (aiId === -1) {
          setThinking(null)
          aiId = idRef.current++
          setMessages((m) => [
            ...m,
            { id: aiId, conversationId: convRef.current, step: { kind: 'ai', text: chunk, format: 'markdown' } },
          ])
          return
        }
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aiId && msg.step.kind === 'ai'
              ? { ...msg, step: { ...msg.step, text: msg.step.text + chunk } }
              : msg,
          ),
        )
      }

      // Open the stream FIRST (so it's connected before the turn starts and reads
      // live frames, not a late `done` replay), then fire the backend POST. The
      // stream is best-effort scenery — its failure must not sink the turn — so it
      // resolves to '' on any error.
      const streamReq = streamChat(requestId, { onToken: appendToken, signal: controller.signal }).catch(
        () => '',
      )
      const postReq = postChatbotMessage({ sessionId, requestId, prompt, signal: controller.signal })

      try {
        const [posted, streamed] = await Promise.all([postReq, streamReq])
        if (runRef.current !== myRun) return
        // Prefer an answer echoed by the backend; otherwise settle on the live
        // token text. Either way the reasoning was never in it.
        const answer = (posted || streamed).trim()
        setThinking(null)
        if (!answer) {
          if (aiId === -1) push({ kind: 'ai', text: i18n.t('copilot:chat.mlError') })
        } else if (aiId === -1) {
          aiId = idRef.current++
          setMessages((m) => [
            ...m,
            { id: aiId, conversationId: convRef.current, step: { kind: 'ai', text: answer, format: 'markdown' } },
          ])
        } else {
          setAiText(answer)
        }
      } catch (err) {
        if (runRef.current !== myRun) return
        // A supersede/teardown aborts the fetch — not an error worth surfacing.
        if ((err as Error)?.name === 'AbortError') return
        // The POST failed; stop the still-open stream so a late token can't race a
        // second bubble in behind the error line.
        controller.abort()
        setThinking(null)
        if (aiId === -1) push({ kind: 'ai', text: i18n.t('copilot:chat.mlError') })
        toast.error(i18n.t('copilot:chat.mlError'))
      } finally {
        if (runRef.current === myRun) {
          setThinking(null)
          setPlaying(false)
          streamAbortRef.current = null
        }
      }
    },
    [assistantSessionId, push, resolve, settleOtp, settleUser, abortStream],
  )

  const startScenario = useCallback(
    (id: string, userText?: string) => {
      // A use-case pill is just a canned prompt. With a verified session, send it
      // to the real chatbot API — same as if the customer had typed it — so the
      // pills hit `/chatbot/message` too, not only free-typed messages.
      const prompt = userText || findUseCase(id)?.prompt
      if (prompt && assistantSessionId) {
        void sendToChatbot(prompt)
        return
      }
      // No verified session (or unknown id): fall back to the scripted storyboard.
      const scenario = getScenario(id)
      if (!scenario) return
      void play(scenario.steps, userText, scenario.id)
    },
    [assistantSessionId, sendToChatbot, play],
  )

  /** Imperative reset (the "New chat" control). */
  const resetConversation = useCallback(() => {
    runRef.current++
    setPlaying(false)
    setTyping(false)
    setThinking(null)
    settleOtp(null)
    settleUser(null)
    abortStream()
    chatConvActiveRef.current = false
    idRef.current = 0
    convRef.current = 0
    setMessages(
      customer
        ? [{ id: idRef.current++, conversationId: 0, step: { kind: 'ai', text: greeting(customer.name) } }]
        : [],
    )
  }, [customer, settleOtp, settleUser, abortStream])

  // Auto-play a scenario requested from elsewhere (e.g. the landing use-case
  // cards, which park the id in the store before navigating here).
  useEffect(() => {
    if (activeScenarioId && customer) {
      startScenario(activeScenarioId)
      dispatch(clearScenario())
    }
  }, [activeScenarioId, customer, dispatch, startScenario])

  // Auto-scroll to newest.
  //
  // `playing` is a dependency even though it renders nothing here: when playback
  // ends, the docked composer brings its suggestion-pill row back, which shrinks
  // the scroll viewport by the row's height. Without re-pinning on that flip the
  // final message of every storyboard sits clipped behind the composer.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, thinking, otpPrompt, awaitingUser, playing])

  const onSend = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    // A reply to a held storyboard turn resumes it — it never starts a new run.
    if (awaitingUser) {
      setDraft('')
      settleUser(text)
      return
    }
    if (playing) return
    setDraft('')
    // Every typed message is a real chatbot turn — POST it to the backend and
    // stream the reply. The scripted storyboards stay behind the use-case pills.
    void sendToChatbot(text)
  }, [draft, awaitingUser, playing, settleUser, sendToChatbot])

  const meta = DATA_SOURCE_META[source]

  const pills = useMemo<EnginePill[]>(
    () => useCases.map((u) => ({ ...u, Icon: getIcon(u.icon) })),
    [],
  )

  return {
    customer,
    account,
    source,
    meta,
    pills,
    messages,
    thinking,
    typing,
    playing,
    otpPrompt,
    submitOtp,
    awaitingUser,
    submitUserTurn,
    draft,
    setDraft,
    onSend,
    startScenario,
    resetConversation,
    scrollRef,
  }
}
