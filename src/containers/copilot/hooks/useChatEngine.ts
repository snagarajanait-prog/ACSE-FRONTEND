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
import { getIcon } from '@/containers/copilot/utils/iconMap'
import { findAccount, findCustomer, type Account, type Customer } from '@/data/customers'
import { getScenario, type ChatStep } from '@/data/scenarios'
import { useCases, type UseCase } from '@/data/useCases'
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

/** Prioritised keyword match from free-typed text to a scenario id. */
function matchScenario(text: string): string | null {
  const t = text.toLowerCase()
  const rules: [string, string[]][] = [
    ['report-leak', ['leak', 'burst', 'emergency', 'flood', 'main break']],
    ['report-outage', ['outage', 'no water', 'water out', 'pressure', 'down']],
    ['transfer-service', ['transfer', 'moving to', 'new home', 'new house']],
    ['stop-service', ['stop', 'cancel', 'close', 'move out', 'disconnect', 'end service']],
    ['start-service', ['start', 'new service', 'turn on', 'begin service']],
    ['payment-arrangement', ['payment', 'arrangement', 'installment', 'plan', "can't pay", 'extension']],
    ['high-bill', ['high', 'expensive', 'too much', 'why is my bill', 'bill so', 'overcharged']],
    ['update-contact', ['update', 'change my', 'phone', 'email', 'contact', 'number']],
  ]
  for (const [id, keys] of rules) {
    if (keys.some((k) => t.includes(k))) return id
  }
  return null
}

function greeting(name: string) {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name.split(' ')[0]}. How can I help you today?`
}

// Default "working" phrases shown (shimmering, one at a time) before a response.
// Tokens like {account}/{source} are resolved at play time.
const THINK_INTENT = ['Analysing your request', 'Understanding intent', 'Checking account {account}']
const THINK_STATUS = ['Requesting data from {source}', 'Processing records']
const THINK_SUMMARY = ['Compiling the details', 'Summarising']
const THINK_FALLBACK = ['Analysing your request', 'Matching to a workflow']

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
      return THINK_STATUS
    case 'summary':
      return THINK_SUMMARY
    case 'ai':
      return prevWasUser ? THINK_INTENT : null
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
  const { selectedCustomerId, selectedAccountId, activeScenarioId } = useAppSelector(
    (s) => s.demoSlice,
  )
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
  const [draft, setDraft] = useState('')
  const idRef = useRef(0)
  const runRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const otpResolveRef = useRef<((code: string | null) => void) | null>(null)

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

  // Reset the conversation synchronously when the customer/account context
  // changes — DURING render, so a switch never paints the new account's context
  // alongside the previous account's transcript (a post-paint effect would).
  const contextKey = `${selectedCustomerId ?? ''}:${selectedAccountId ?? ''}`
  const [renderedKey, setRenderedKey] = useState<string | null>(null)
  if (renderedKey !== contextKey) {
    setRenderedKey(contextKey)
    runRef.current++
    idRef.current = 0
    setPlaying(false)
    setTyping(false)
    setThinking(null)
    settleOtp(null)
    setMessages(
      customer ? [{ id: idRef.current++, step: { kind: 'ai', text: greeting(customer.name) } }] : [],
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
    setMessages((m) => [...m, { id: idRef.current++, step }])
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
      // Abandon a challenge left held by the run we just superseded.
      settleOtp(null)
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
          await sleep(i === 0 ? 200 : 550)
          if (runRef.current !== myRun) return
          push(firstUserText && i === 0 ? { kind: 'user', text: firstUserText } : resolveStep(raw))
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
    [push, resolve, resolveStep, settleOtp],
  )

  const startScenario = useCallback(
    (id: string, userText?: string) => {
      const scenario = getScenario(id)
      if (!scenario) return
      void play(scenario.steps, userText, scenario.id)
    },
    [play],
  )

  /** Imperative reset (the "New chat" control). */
  const resetConversation = useCallback(() => {
    runRef.current++
    setPlaying(false)
    setTyping(false)
    setThinking(null)
    settleOtp(null)
    idRef.current = 0
    setMessages(
      customer ? [{ id: idRef.current++, step: { kind: 'ai', text: greeting(customer.name) } }] : [],
    )
  }, [customer, settleOtp])

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
  }, [messages, typing, thinking, otpPrompt, playing])

  const onSend = useCallback(() => {
    const text = draft.trim()
    if (!text || playing) return
    setDraft('')
    const id = matchScenario(text)
    if (id) {
      startScenario(id, text)
      return
    }
    const myRun = ++runRef.current
    push({ kind: 'user', text })
    setPlaying(true)
    void (async () => {
      setThinking(THINK_FALLBACK.map(resolve))
      await sleep(1500)
      if (runRef.current !== myRun) return
      setThinking(null)
      push({
        kind: 'ai',
        text: 'I can help with that. Here are the things I can do right now — pick one to see it in action:',
      })
      setPlaying(false)
    })()
  }, [draft, playing, push, resolve, startScenario])

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
    draft,
    setDraft,
    onSend,
    startScenario,
    resetConversation,
    scrollRef,
  }
}
