/**
 * Lays a conversation transcript out as a multi-page PDF.
 *
 * Sibling to `receipt.ts` — same masthead, margins and palette (both pull them
 * from `pdfTheme.ts`), so a customer holding a receipt and a transcript sees one
 * company rather than two templates. The difference is the body: a receipt is a
 * fixed label/value grid, this is an unbounded flow that has to paginate.
 *
 * `jspdf` is imported dynamically for the same reason as in `receipt.ts` — the
 * ~350kB library must never enter the main bundle. Keep it that way.
 */

import i18n from '@/i18n'
import { ASSISTANT_NAME, channelLabel, type Transcript } from '@/containers/copilot/utils/transcript'
import { VENDOR_NAME } from '@/constants/constants'
import {
  BOTTOM_LIMIT,
  CONTENT_W,
  CYAN,
  MARGIN,
  NAVY,
  RED,
  RIGHT_EDGE,
  SLATE,
  WHITE,
  chipRight,
  continuePage,
  fieldRows,
  loadLogo,
  masthead,
  sectionHeading,
  type Doc,
} from '@/utils/pdfTheme'

/** Body metrics, in mm. */
const LINE_H = 4.6
const SPEAKER_GAP = 3.4
const TURN_GAP = 4.4

/** Speaker labels and the summary grid indent from the left margin. */
const INDENT = 4

export async function buildTranscriptPdf(transcript: Transcript) {
  // Both awaited together: the logo fetch is independent of the library, and
  // serialising them would add a round trip to every download.
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()])
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  doc.setProperties({
    title: transcript.title,
    subject: `${transcript.company} — conversation transcript`,
    author: transcript.company,
    creator: VENDOR_NAME,
  })

  let y = header(doc, transcript, logo)

  for (const entry of transcript.entries) {
    switch (entry.kind) {
      case 'user':
        y = turn(doc, y, i18n.t('copilot:transcript.you'), entry.text, 'customer')
        break
      case 'ai':
        y = turn(doc, y, ASSISTANT_NAME, entry.text, 'assistant')
        break
      case 'status':
        y = aside(doc, y, entry.text)
        break
      case 'otp':
        y = aside(
          doc,
          y,
          i18n.t('copilot:transcript.identityVerifiedPlain', {
            channel: channelLabel(entry.channel),
            text: entry.text,
          }),
        )
        break
      case 'summary':
        y = summary(doc, y, entry.title, entry.rows)
        break
      case 'done':
        y = done(doc, y, entry.text, entry.reference)
        break
    }
  }

  // No footer band: the downloaded conversation reads as clean prose, with none
  // of the powered-by / page-number / disclaimer furniture the receipt carries.
  return { doc, fileName: `${transcript.fileBase}.pdf` }
}

/** Builds the transcript and hands it to the browser as a file download. */
export async function downloadTranscriptPdf(transcript: Transcript): Promise<void> {
  const { doc, fileName } = await buildTranscriptPdf(transcript)
  doc.save(fileName)
}

/* --------------------------------- header --------------------------------- */

function header(doc: Doc, t: Transcript, logo: string | null): number {
  // The ACSE lockup is the masthead and the client is named as who the document
  // is for — see `masthead` in `pdfTheme.ts`.
  let y = masthead(doc, { kind: i18n.t('copilot:transcript.kind'), company: t.company, logo })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...NAVY)
  doc.text(t.title, MARGIN, y)

  // A conversation that ended in a logged request is filed under that reference.
  // It gets the same solid-cyan chip the receipt puts on its own title line, so
  // the two documents can be matched to each other at a glance.
  if (t.reference) {
    chipRight(doc, RIGHT_EDGE, y, `REF ${t.reference}`, CYAN, WHITE)
  }

  /* ------------------------------ context ------------------------------- */
  const contextLabel = i18n.t('copilot:transcript.context')
  y += 12
  y = sectionHeading(doc, contextLabel, y, CYAN)
  y = fieldRows(doc, y, t.meta, continuePage, { label: contextLabel, accent: CYAN })

  return y + 11
}

/* ---------------------------------- flow ---------------------------------- */

/**
 * Reserve vertical space, breaking to a new page if the block will not fit.
 * Every writer calls this *before* drawing, so a block is never split across a
 * page boundary mid-sentence.
 */
function reserve(doc: Doc, y: number, need: number): number {
  if (y + need <= BOTTOM_LIMIT) return y
  return continuePage(doc)
}

function wrap(doc: Doc, text: string, width: number): string[] {
  return doc.splitTextToSize(text, width) as string[]
}

/**
 * A spoken turn: a small speaker label with the body under it. The customer's
 * label is set in slate and the assistant's in cyan — the same asymmetry the
 * screen uses to tell the two voices apart at a glance, carried into print.
 */
function turn(
  doc: Doc,
  startY: number,
  speaker: string,
  text: string,
  who: 'customer' | 'assistant',
): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const lines = wrap(doc, text, CONTENT_W - INDENT)

  let y = reserve(doc, startY, SPEAKER_GAP + lines.length * LINE_H + TURN_GAP)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...(who === 'assistant' ? CYAN : SLATE))
  doc.text(speaker.toUpperCase(), MARGIN, y)

  y += SPEAKER_GAP
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  lines.forEach((line, i) => doc.text(line, MARGIN + INDENT, y + i * LINE_H))

  return y + lines.length * LINE_H + TURN_GAP
}

/** A system line (status, identity verification) — quieter than a spoken turn. */
function aside(doc: Doc, startY: number, text: string): number {
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  const lines = wrap(doc, text, CONTENT_W - INDENT - 3)

  let y = reserve(doc, startY, lines.length * LINE_H + TURN_GAP)

  doc.setTextColor(...SLATE)
  // A cyan tick in the margin marks the line as the system speaking, so it reads
  // as machinery even when the italics are lost to a black-and-white printer.
  doc.setDrawColor(...CYAN)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y - 2.6, MARGIN, y + (lines.length - 1) * LINE_H + 1)

  lines.forEach((line, i) => doc.text(line, MARGIN + INDENT, y + i * LINE_H))

  return y + lines.length * LINE_H + TURN_GAP
}

/** A request-summary card: heading plus the same striped grid as the receipt. */
function summary(doc: Doc, startY: number, title: string, rows: [string, string][]): number {
  // Keep the heading with at least its first row; a title stranded alone at the
  // foot of a page reads as a lost section.
  let y = reserve(doc, startY, 20)

  y = sectionHeading(doc, title, y, RED)
  y = fieldRows(doc, y, rows, continuePage, { label: title, accent: RED })

  return y + TURN_GAP + 2
}

/** The closing confirmation, with its reference id given emphasis. */
function done(doc: Doc, startY: number, text: string, reference: string | null): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  const lines = wrap(doc, text, CONTENT_W - INDENT)
  const height = lines.length * LINE_H + (reference ? LINE_H + 2 : 0) + TURN_GAP + 2

  const y = reserve(doc, startY, height)

  doc.setFillColor(...CYAN)
  doc.rect(MARGIN, y - 3, 1.4, lines.length * LINE_H + (reference ? LINE_H : 0), 'F')

  doc.setTextColor(...NAVY)
  lines.forEach((line, i) => doc.text(line, MARGIN + INDENT, y + i * LINE_H))

  // The same solid-cyan pill the receipt gives the reference, so the id a
  // customer reads back over the phone looks identical in both documents.
  if (reference) {
    chipRight(doc, RIGHT_EDGE, y + lines.length * LINE_H + 2, `REF ${reference}`, CYAN, WHITE)
  }

  return y + height
}

/* The transcript intentionally omits the footer band and `Page n of m` — the
 * downloaded conversation is left to close on its own last line. (The receipt
 * still finishes with the shared `paginate` footer from `pdfTheme.ts`.) */
