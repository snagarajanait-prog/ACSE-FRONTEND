/**
 * A tiny, dependency-free Markdown renderer — just enough for the assistant's live
 * replies, which come back as markdown (bold, ordered/unordered lists, paragraphs).
 *
 * Deliberately NOT a full CommonMark implementation and NOT `dangerouslySetInnerHTML`:
 * everything is parsed to React elements, so there is no HTML-injection surface. If
 * the model ever needs richer output (tables, links, code blocks), reach for a real
 * library then rather than growing this by hand.
 *
 * Supported: `**bold**`, `` `code` ``, `- `/`* ` bullet lists, `1.` ordered lists,
 * `#`–`###` headings, and blank-line-separated paragraphs with soft line breaks.
 */

import { Fragment, type ReactNode } from 'react'

/** Split a line into inline nodes, handling `**bold**` and `` `code` ``. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // One regex, two alternatives: bold (**…**) or inline code (`…`).
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>)
    if (m[1] !== undefined) {
      nodes.push(<strong key={key++}>{m[1]}</strong>)
    } else if (m[2] !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
        >
          {m[2]}
        </code>,
      )
    }
    last = pattern.lastIndex
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  return nodes
}

/** A parsed block: a heading, a list, or a paragraph (with its raw lines). */
type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; lines: string[] }

/** Group the raw text into blocks: lists, headings and blank-line paragraphs. */
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', lines: para })
      para = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushPara()
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line)

    if (heading) {
      flushPara()
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
    } else if (bullet) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else if (ordered) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ol') last.items.push(ordered[1])
      else blocks.push({ type: 'ol', items: [ordered[1]] })
    } else {
      para.push(line)
    }
  }
  flushPara()
  return blocks
}

export default function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const size =
              block.level === 1 ? 'text-lg' : block.level === 2 ? 'text-base' : 'text-[15px]'
            return (
              <p key={i} className={`font-semibold text-brand-navy dark:text-slate-50 ${size}`}>
                {renderInline(block.text)}
              </p>
            )
          }
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            )
          default:
            return (
              <p key={i}>
                {block.lines.map((ln, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {renderInline(ln)}
                  </Fragment>
                ))}
              </p>
            )
        }
      })}
    </div>
  )
}
