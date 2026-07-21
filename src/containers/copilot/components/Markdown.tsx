/**
 * Minimal Markdown renderer for assistant replies.
 *
 * The ML assistant answers in Markdown — `**bold**`, `*italic*`, numbered and
 * bulleted lists, `code`, links — which otherwise shows its literal asterisks and
 * list markers in the chat. This renders the common subset those replies actually
 * use, and it tolerates INCOMPLETE markup: a `**` whose partner hasn't streamed in
 * yet stays literal until it does, so it is safe to call on every token while the
 * answer is still typing out.
 *
 * Deliberately not a full CommonMark parser (no tables, blockquotes, nested lists,
 * images, setext headings) — just the subset these replies use, with no dependency.
 */

import { Fragment, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }

// Priority-ordered so the first match at a position wins: `code` first (an
// asterisk inside a code span stays literal), then **bold**, then *italic*, then
// a [label](url) link. Underscore forms are intentionally omitted so snake_case
// words are never mistaken for emphasis. Fresh RegExp per call — `g` is stateful
// and this recurses.
const INLINE_SRC = '(`[^`]+`)|(\\*\\*[\\s\\S]+?\\*\\*)|(\\*[^*\\n]+?\\*)|(\\[[^\\]]+\\]\\([^)]+\\))'

function renderInline(text: string, keyBase: string): ReactNode[] {
  const re = new RegExp(INLINE_SRC, 'g')
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}i${i++}`
    const tok = m[0]
    if (m[1]) {
      out.push(
        <code
          key={key}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-brand-navy dark:bg-white/10 dark:text-slate-100"
        >
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (m[2]) {
      out.push(
        <strong key={key} className="font-semibold text-brand-navy dark:text-slate-50">
          {renderInline(tok.slice(2, -2), key)}
        </strong>,
      )
    } else if (m[3]) {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>)
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)
      out.push(
        link ? (
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="text-brand-cyan underline underline-offset-2 hover:opacity-80"
          >
            {link[1]}
          </a>
        ) : (
          tok
        ),
      )
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Render a block's text, keeping intentional single newlines as line breaks. */
function renderMultiline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  text.split('\n').forEach((line, idx) => {
    if (idx > 0) out.push(<br key={`${keyBase}br${idx}`} />)
    out.push(<Fragment key={`${keyBase}l${idx}`}>{renderInline(line, `${keyBase}l${idx}`)}</Fragment>)
  })
  return out
}

/** Group lines into paragraphs, headings and (ordered/unordered) lists. */
function parseBlocks(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'p', text: para.join('\n') })
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }

  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*$/.test(line)) {
      flushPara()
      flushList()
      continue
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      flushPara()
      flushList()
      blocks.push({ kind: 'h', text: heading[1] })
      continue
    }
    // Ordered: "1." or "1)". Unordered: "-", "*", "+" followed by a space (so a
    // "**bold**" line, which has no space after the marker, is not a list).
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flushPara()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push(ordered[1])
      continue
    }
    const unordered = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (unordered) {
      flushPara()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push(unordered[1])
      continue
    }
    flushList()
    para.push(line)
  }
  flushPara()
  flushList()
  return blocks
}

/**
 * A blinking caret for the tail of a still-streaming answer. Threaded into the
 * LAST block's inline content so it sits right after the final character rather
 * than dropping to its own line.
 */
const caretEl = (
  <span
    aria-hidden
    className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-brand-cyan motion-safe:animate-caret-blink"
  />
)

export default function Markdown({
  text,
  caret = false,
  className,
}: {
  text: string
  /** Append a blinking caret after the last character (streaming answers). */
  caret?: boolean
  className?: string
}) {
  const blocks = parseBlocks(text)

  if (!blocks.length) return caret ? caretEl : null

  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((b, i) => {
        const key = `b${i}`
        const tail = caret && i === blocks.length - 1 ? caretEl : null
        if (b.kind === 'h') {
          return (
            <p key={key} className="font-semibold text-brand-navy dark:text-slate-50">
              {renderInline(b.text, key)}
              {tail}
            </p>
          )
        }
        if (b.kind === 'list') {
          const items = b.items.map((it, j) => (
            <li key={`${key}li${j}`}>
              {renderInline(it, `${key}li${j}`)}
              {tail && j === b.items.length - 1 ? tail : null}
            </li>
          ))
          return b.ordered ? (
            <ol key={key} className="list-decimal space-y-1 pl-5 marker:text-slate-400">
              {items}
            </ol>
          ) : (
            <ul key={key} className="list-disc space-y-1 pl-5 marker:text-slate-400">
              {items}
            </ul>
          )
        }
        return (
          <p key={key}>
            {renderMultiline(b.text, key)}
            {tail}
          </p>
        )
      })}
    </div>
  )
}
