/**
 * Turns a played conversation into something the customer can take away — the
 * shared model behind Copy, Share and every Export format.
 *
 * Every format (clipboard text, Markdown file, PDF) renders from the same
 * `TranscriptEntry[]`, so a change to what the transcript *says* is one edit
 * here rather than three edits that slowly disagree with each other.
 *
 * Two deliberate omissions:
 *   - the OTP digits never leave the screen. A verification code sitting in a
 *     downloaded file (or on the clipboard) is a habit worth not teaching, so
 *     the entry records only that identity was confirmed, and how.
 *   - typing/thinking indicators are transient UI, not conversation.
 *
 * React-free on purpose, so a test or a future server-side export can call it.
 */

import type { Msg } from '@/containers/copilot/hooks/useChatEngine'
import { splitReference } from '@/containers/copilot/utils/splitReference'
import { CLIENT_NAME, VENDOR_NAME } from '@/constants/constants'
import type { Account, Customer } from '@/data/customers'
import { DATA_SOURCE_META, type DataSource } from '@/redux/dataSourceSlice'
import { formatStamp, slugify } from '@/utils/pdfTheme'

/** How the assistant signs its turns in an exported transcript. */
export const ASSISTANT_NAME = 'ACSE AI'
const CUSTOMER_NAME = 'You'

/** A single exportable line of conversation, stripped of playback concerns. */
export type TranscriptEntry =
  | { kind: 'user'; text: string }
  | { kind: 'ai'; text: string }
  | { kind: 'status'; text: string }
  | { kind: 'otp'; channel: 'sms' | 'email'; text: string }
  | { kind: 'summary'; title: string; rows: [string, string][] }
  | { kind: 'done'; text: string; reference: string | null }

export interface TranscriptContext {
  customer?: Customer
  account?: Account
  /** Active mode — resolved to its neutral, customer-facing platform name. */
  source?: DataSource
  /** Overrides the configured client brand — mainly for tests. */
  companyName?: string
  /** Fixed timestamp, for deterministic tests. Defaults to now. */
  issuedAt?: Date
}

export interface Transcript {
  /** Document heading, e.g. `Conversation with ACSE AI`. */
  title: string
  company: string
  issuedAt: Date
  /** Context header rendered above the turns in every format. */
  meta: [string, string][]
  /** Reference id of the last completed request, if the thread produced one. */
  reference: string | null
  entries: TranscriptEntry[]
  markdown: string
  text: string
  /** File name without an extension — each exporter appends its own. */
  fileBase: string
}

/**
 * The disclaimer every format carries. The transcript is a record of a demo
 * conversation, and saying so travels with the file rather than staying behind
 * on the screen the file was downloaded from.
 */
const DISCLAIMER =
  'Illustrative conversation · non-production data. This transcript is a record of what was discussed. It is not a bill or a payment confirmation.'

function toEntries(messages: Msg[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = []
  for (const { step } of messages) {
    switch (step.kind) {
      case 'user':
      case 'ai':
      case 'status':
        entries.push({ kind: step.kind, text: step.text })
        break
      case 'otp':
        // `step.entered` (the digits the customer keyed in) is intentionally dropped.
        entries.push({ kind: 'otp', channel: step.channel, text: step.text })
        break
      case 'summary':
        entries.push({ kind: 'summary', title: step.title, rows: step.rows })
        break
      case 'done': {
        const { body, ref } = splitReference(step.text)
        entries.push({ kind: 'done', text: body, reference: ref })
        break
      }
    }
  }
  return entries
}

function toMeta(ctx: TranscriptContext, issuedAt: Date): [string, string][] {
  const meta: [string, string][] = []
  if (ctx.customer) {
    meta.push(['Customer', `${ctx.customer.name} (${ctx.customer.id})`])
  }
  if (ctx.account) {
    meta.push(['Account', `${ctx.account.id} · ${ctx.account.type}`])
    meta.push(['Service address', ctx.account.serviceAddress])
  }
  if (ctx.source) {
    meta.push(['Handled by', DATA_SOURCE_META[ctx.source].chatSystem])
  }
  meta.push(['Exported', formatStamp(issuedAt)])
  return meta
}

/**
 * Markdown, for pasting somewhere that renders it — a ticket, a wiki, a chat
 * with a colleague. Summary cards become tables so the label/value grid on
 * screen survives the trip.
 */
function toMarkdown(t: Omit<Transcript, 'markdown' | 'text' | 'fileBase'>): string {
  const lines: string[] = [`# ${t.title}`, '', `**${t.company}**`, '']

  for (const [label, value] of t.meta) lines.push(`- **${label}:** ${value}`)
  lines.push('', '---', '')

  for (const entry of t.entries) {
    switch (entry.kind) {
      case 'user':
        lines.push(`**${CUSTOMER_NAME}:** ${entry.text}`, '')
        break
      case 'ai':
        lines.push(`**${ASSISTANT_NAME}:** ${entry.text}`, '')
        break
      case 'status':
        lines.push(`> _${entry.text}_`, '')
        break
      case 'otp':
        lines.push(
          `> _Identity verified · ${channelLabel(entry.channel)} — ${entry.text}_`,
          '',
        )
        break
      case 'summary':
        lines.push(`### ${entry.title}`, '', '| | |', '| --- | --- |')
        for (const [k, v] of entry.rows) lines.push(`| ${k} | ${v} |`)
        lines.push('')
        break
      case 'done':
        lines.push(
          entry.reference ? `✅ ${entry.text} \`${entry.reference}\`` : `✅ ${entry.text}`,
          '',
        )
        break
    }
  }

  lines.push('---', '', `_${DISCLAIMER}_`, '', `_Powered by ${VENDOR_NAME}_`, '')
  return lines.join('\n')
}

/**
 * Plain text, for the clipboard and the `.txt` export. This is the format that
 * gets pasted into an email or a case note, so it stays readable with no
 * renderer at all — no pipes, no backticks, no heading marks.
 */
function toPlainText(t: Omit<Transcript, 'markdown' | 'text' | 'fileBase'>): string {
  const lines: string[] = [t.title, t.company, '']

  for (const [label, value] of t.meta) lines.push(`${label}: ${value}`)
  lines.push('', '—'.repeat(40), '')

  for (const entry of t.entries) {
    switch (entry.kind) {
      case 'user':
        lines.push(`${CUSTOMER_NAME}: ${entry.text}`, '')
        break
      case 'ai':
        lines.push(`${ASSISTANT_NAME}: ${entry.text}`, '')
        break
      case 'status':
        lines.push(`  · ${entry.text}`, '')
        break
      case 'otp':
        lines.push(`  · Identity verified (${channelLabel(entry.channel)}) — ${entry.text}`, '')
        break
      case 'summary':
        lines.push(`${entry.title.toUpperCase()}`)
        for (const [k, v] of entry.rows) lines.push(`  ${k}: ${v}`)
        lines.push('')
        break
      case 'done':
        lines.push(entry.reference ? `${entry.text} (${entry.reference})` : entry.text, '')
        break
    }
  }

  lines.push('—'.repeat(40), '', DISCLAIMER, `Powered by ${VENDOR_NAME}`, '')
  return lines.join('\n')
}

export function channelLabel(channel: 'sms' | 'email'): string {
  return channel === 'sms' ? 'SMS' : 'Email'
}

/**
 * The reference id of the last completed request, if any. Used to name the
 * downloaded file after the thing the customer will look it up by — a transcript
 * called `…-sr-4471-190.pdf` is findable months later; one called `…-2026-07-20`
 * is not, once there are three of them.
 */
function lastReference(entries: TranscriptEntry[]): string | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]
    if (entry.kind === 'done' && entry.reference) return entry.reference
  }
  return null
}

export function buildTranscript(messages: Msg[], ctx: TranscriptContext = {}): Transcript {
  const issuedAt = ctx.issuedAt ?? new Date()
  const company = ctx.companyName ?? CLIENT_NAME
  const entries = toEntries(messages)

  const reference = lastReference(entries)

  const base = {
    title: `Conversation with ${ASSISTANT_NAME}`,
    company,
    issuedAt,
    meta: toMeta(ctx, issuedAt),
    reference,
    entries,
  }

  const tail = reference ? slugify(reference) : issuedAt.toISOString().slice(0, 10)

  return {
    ...base,
    markdown: toMarkdown(base),
    text: toPlainText(base),
    fileBase: `${slugify(company)}-conversation-${tail}`,
  }
}

/**
 * Whether there is anything worth exporting. A thread holding only the opening
 * greeting is not a conversation, and offering to export it invites a customer
 * to download a file with nothing in it.
 */
export function hasExportableContent(messages: Msg[]): boolean {
  return messages.some((m) => m.step.kind === 'user')
}
