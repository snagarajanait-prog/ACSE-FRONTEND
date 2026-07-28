/**
 * Plays a storyboard into a chat thread.
 *
 * A queue of steps drains on a timer, one step per tick, with the delay coming
 * from the step's own kind — status lines land fast, a paragraph of prose waits
 * long enough to read as composed rather than pasted.
 *
 * Everything is local: no API, no store, no persistence. That is the point — the
 * screen is a demo of the *output*, and wiring it to the live copilot engine
 * would make it fail whenever the backend does, in front of the client.
 *
 * The queue lives in a ref rather than state. It is mutated by the tick that
 * reads it, and putting it in state would either re-enter the effect on every
 * step or leave the timer closed over a stale copy.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FOLLOW_UPS,
  OPENING,
  OPENING_PROMPT,
  PACE,
  type FollowUp,
  type Step,
} from '@/containers/billreport/script'

export interface BillMsg {
  id: number
  step: Step
  /** Which exchange this belongs to — the opening is 0, each follow-up the next. */
  turn: number
}

/** Cycled under the spinner while the assistant is between turns. */
const THINKING_PHRASES = [
  'Reading the account',
  'Cross-checking the figures',
  'Benchmarking the group',
  'Sizing the opportunity',
]

export function useBillChat() {
  const [messages, setMessages] = useState<BillMsg[]>([])
  /**
   * Nothing plays until the customer sends. The screen opens on a hero state
   * with the suggested question under it; `started` flips on the first send and
   * is what swaps the hero for the thread.
   */
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  // Only the setter is read: `turnRef` is what the thread groups by, and this
  // exists purely to force a re-render when a new exchange begins.
  const [, setTurn] = useState(0)
  /** Follow-ups already asked — their chips drop out of the rail. */
  const [asked, setAsked] = useState<string[]>([])

  const queue = useRef<Step[]>([])
  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const turnRef = useRef(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  /** Suspended once the reader scrolls up — nothing yanks the view back down. */
  const stickToBottom = useRef(true)

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  /** Drain one step, then schedule the next. Stops when the queue empties. */
  const tick = useCallback(() => {
    const step = queue.current.shift()
    if (!step) {
      setPlaying(false)
      return
    }
    setMessages((prev) => [...prev, { id: nextId.current++, step, turn: turnRef.current }])
    timer.current = setTimeout(tick, queue.current.length ? PACE[queue.current[0].kind] : 0)
  }, [])

  // No auto-start here — only cleanup. A timer must never outlive the screen.
  useEffect(() => clearTimer, [])

  // Follow the thread down, but only while the reader is already at the bottom.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottom.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // 64px of slack: an exact comparison flips to false on a fractional
    // scrollTop and the thread stops following mid-playback.
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64
  }, [])

  /** Drop the remaining steps in at once — for a reader who does not want the show. */
  const skip = useCallback(() => {
    clearTimer()
    const rest = queue.current
    queue.current = []
    if (rest.length) {
      setMessages((prev) => [
        ...prev,
        ...rest.map((step) => ({ id: nextId.current++, step, turn: turnRef.current })),
      ])
    }
    setPlaying(false)
  }, [])

  /**
   * Run the opening analysis, posting `text` as the customer's own turn.
   *
   * Whatever they typed is what appears in the thread — not the suggested
   * wording — so the transcript reflects what was actually asked.
   */
  const start = useCallback(
    (text: string) => {
      clearTimer()
      stickToBottom.current = true
      setStarted(true)
      setMessages([{ id: nextId.current++, step: { kind: 'user', text }, turn: 0 }])
      queue.current = [...OPENING]
      setPlaying(true)
      timer.current = setTimeout(tick, 560)
    },
    [tick],
  )

  /** Post a follow-up's question and queue its answer. */
  const ask = useCallback(
    (followUp: FollowUp) => {
      clearTimer()
      turnRef.current += 1
      setTurn(turnRef.current)
      setAsked((prev) => (prev.includes(followUp.id) ? prev : [...prev, followUp.id]))
      stickToBottom.current = true

      // The question lands immediately — a typed question that waits its turn in
      // a queue reads as a dropped keystroke.
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          step: { kind: 'user', text: followUp.prompt },
          turn: turnRef.current,
        },
      ])

      queue.current = [...followUp.steps]
      setPlaying(true)
      timer.current = setTimeout(tick, 640)
    },
    [tick],
  )

  /**
   * Ask by id — what the insights column's action buttons call.
   *
   * Silently ignores an unknown id rather than throwing: the panel names
   * follow-ups by string, and a typo there should cost a dead button, not a
   * white screen in front of a client.
   */
  const askById = useCallback(
    (id: string) => {
      const followUp = FOLLOW_UPS.find((f) => f.id === id)
      if (followUp) ask(followUp)
    },
    [ask],
  )

  /**
   * A free-typed question. Nothing here is wired to a model, so it matches
   * against the follow-ups by keyword and falls back to saying so — which is
   * more honest in a demo than inventing an answer.
   */
  const askFreeText = useCallback(
    (text: string) => {
      // Before the analysis has run, ANY send runs it. Demanding the suggested
      // wording verbatim would leave someone who typed their own question
      // staring at a refusal on the very first interaction.
      if (!started) {
        start(text)
        return
      }

      const q = text.toLowerCase()
      const match =
        FOLLOW_UPS.find((f) => f.id !== 'sources' && keywordsFor(f.id).some((k) => q.includes(k))) ??
        null

      if (match) {
        ask({ ...match, prompt: text })
        return
      }

      clearTimer()
      turnRef.current += 1
      setTurn(turnRef.current)
      stickToBottom.current = true
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, step: { kind: 'user', text }, turn: turnRef.current },
      ])
      queue.current = [
        {
          kind: 'ai',
          text: "This screen runs a fixed demo script rather than a live model, so I can only answer the questions in the rail below — I would rather say that than make something up. Pick one of those and I will take it in full.",
        },
      ]
      setPlaying(true)
      timer.current = setTimeout(tick, 520)
    },
    [ask, start, started, tick],
  )

  /** Back to the hero state, waiting to be asked again. */
  const reset = useCallback(() => {
    clearTimer()
    queue.current = []
    nextId.current = 0
    turnRef.current = 0
    stickToBottom.current = true
    setMessages([])
    setTurn(0)
    setAsked([])
    setStarted(false)
    setPlaying(false)
  }, [])

  const remaining = FOLLOW_UPS.filter((f) => !asked.includes(f.id))

  return {
    messages,
    started,
    openingPrompt: OPENING_PROMPT,
    start,
    playing,
    thinkingPhrases: THINKING_PHRASES,
    scrollRef,
    onScroll,
    skip,
    ask,
    askById,
    askFreeText,
    reset,
    followUps: remaining,
    allFollowUps: FOLLOW_UPS,
  }
}

/** Keywords that route a typed question to a scripted answer. */
function keywordsFor(id: string): string[] {
  switch (id) {
    case 'why':
      return ['why', 'driving', 'cause', 'higher', 'above', 'reason']
    case 'plan':
      return ['plan', 'fix', 'reduce', 'lower', 'save', 'fair', 'improve', 'band']
    case 'cost':
      return ['cost', 'bill', 'pay', 'price', 'month', 'forecast', 'dollar', '$']
    case 'carbon':
      return ['carbon', 'co2', 'co₂', 'emission', 'footprint', 'environment']
    case 'rebates':
      return ['rebate', 'programme', 'program', 'credit', 'reward', 'claim', 'eligible']
    default:
      return []
  }
}
