/**
 * Builds the PDF receipt for a request-summary card and hands it to the browser
 * as a download.
 *
 * `jspdf` is imported dynamically so it never enters the main bundle — the ~350kB
 * library is fetched on the first Download click and cached from then on. Keep it
 * that way: a static import here would put a PDF writer in front of every visitor.
 *
 * Pure and React-free on purpose, so it can be reused by any surface that needs
 * the same document (the dashboard, an email attachment job, a print button).
 */

import { CLIENT_NAME, VENDOR_NAME } from '@/constants/constants'

/** Brand palette, mirrored from `--color-brand-*` in `index.css` as RGB triples. */
const NAVY: [number, number, number] = [10, 30, 53]
const CYAN: [number, number, number] = [44, 165, 217]
const SLATE: [number, number, number] = [100, 116, 139]
const HAIRLINE: [number, number, number] = [226, 232, 240]

/** A4 portrait, millimetres. */
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 18
const CONTENT_W = PAGE_W - MARGIN * 2
const RIGHT_EDGE = PAGE_W - MARGIN
const BOTTOM_LIMIT = PAGE_H - 26

/**
 * Leftmost point a value may reach before wrapping. Labels own everything to the
 * left of it. Values are set flush RIGHT against the margin — same as the card on
 * screen, where `<dd>` is `text-right` — so both columns land on the page margins
 * and the full-width rules have something anchored at each end.
 */
const VALUE_LIMIT = MARGIN + 58

/** Row metrics, in mm. Padding is deliberately asymmetric: optical centring wants
 *  slightly more space above a baseline than below it. */
const LINE_H = 4.4
const ROW_PAD_TOP = 3.6
const ROW_PAD_BOTTOM = 3.0

export interface ReceiptCustomer {
  name: string
  id: string
  email: string
  phone: string
}

export interface ReceiptInput {
  /** The card's heading, e.g. "Start service request". */
  title: string
  /** The card's label/value pairs, already token-resolved. */
  rows: [string, string][]
  /** Reference id from the closing line, when the request has completed. */
  reference?: string | null
  customer?: ReceiptCustomer
  /** Overrides the configured client brand — mainly for tests. */
  companyName?: string
  /** Fixed timestamp, for deterministic tests. Defaults to now. */
  issuedAt?: Date
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** `20 Jul 2026, 17:16` — unambiguous across locales, unlike a bare numeric date. */
function formatStamp(date: Date): string {
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', ',')
}

export function receiptFileName(input: ReceiptInput, issuedAt: Date): string {
  const stamp = issuedAt.toISOString().slice(0, 10)
  const tail = input.reference ? slugify(input.reference) : stamp
  return `${slugify(input.companyName ?? CLIENT_NAME)}-${slugify(input.title)}-${tail}.pdf`
}

/**
 * Lays the receipt out and returns the document. Split from the download so the
 * same page can be produced without touching the DOM — which is what makes it
 * testable, and what a future "attach to email" path would call.
 */
export async function buildReceiptPdf(input: ReceiptInput) {
  const { jsPDF } = await import('jspdf')

  const issuedAt = input.issuedAt ?? new Date()
  const company = input.companyName ?? CLIENT_NAME
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  doc.setProperties({
    title: `${input.title} — receipt`,
    subject: input.reference ? `Reference ${input.reference}` : input.title,
    author: company,
    creator: VENDOR_NAME,
  })

  let y = MARGIN

  /* ------------------------------ header ------------------------------- */
  // The client's name is the masthead — this is their document, not ours.
  // Both texts share one baseline; sizing them differently is no reason to sit
  // them at different heights.
  const mastheadBaseline = y + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...NAVY)
  doc.text(company, MARGIN, mastheadBaseline)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  doc.text('SERVICE RECEIPT', RIGHT_EDGE, mastheadBaseline, { align: 'right' })

  y += 9
  doc.setDrawColor(...CYAN)
  doc.setLineWidth(0.7)
  doc.line(MARGIN, y, RIGHT_EDGE, y)

  /* ------------------------------- title -------------------------------- */
  y += 11
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text(input.title, MARGIN, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text(`Issued ${formatStamp(issuedAt)}`, MARGIN, y)
  if (input.reference) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(`Reference ${input.reference}`, RIGHT_EDGE, y, { align: 'right' })
  }

  /* ------------------------------ customer ------------------------------ */
  if (input.customer) {
    y += 11
    y = section(doc, 'Customer', y)
    y = fieldRows(doc, y, [
      ['Name', input.customer.name],
      ['Customer number', input.customer.id],
      ['Email', input.customer.email],
      ['Phone', input.customer.phone],
    ])
  }

  /* ------------------------------- details ------------------------------ */
  y += 10
  y = section(doc, 'Request details', y)
  y = fieldRows(doc, y, input.rows)

  /* -------------------------------- footer ------------------------------ */
  footer(doc)

  return { doc, fileName: receiptFileName(input, issuedAt) }
}

/** Builds the receipt and hands it to the browser as a file download. */
export async function downloadReceiptPdf(input: ReceiptInput): Promise<void> {
  const { doc, fileName } = await buildReceiptPdf(input)
  doc.save(fileName)
}

type Doc = InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>

/**
 * Small-caps section heading with a hairline under it. Returns the y of that
 * hairline — which is the top edge of the rows that follow, so heading rule and
 * row rules form one continuous grid rather than two systems with a gap.
 */
function section(doc: Doc, label: string, y: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text(label.toUpperCase(), MARGIN, y)

  const rule = y + 2.4
  doc.setDrawColor(...HAIRLINE)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, rule, RIGHT_EDGE, rule)
  return rule
}

/**
 * Label/value rows: label flush left, value flush right, a hairline closing each
 * row. Both columns sit on the page margins so they line up with the rules and
 * the masthead above.
 *
 * `y` tracks the row's TOP edge (the rule above it), not its baseline. Deriving
 * the baseline from that is what keeps the spacing even — the previous version
 * advanced by the text height and then back-tracked the rule, which left every
 * rule closer to the row below it than the row above.
 *
 * Values wrap within their column and the row grows to fit, so a long service
 * address never overprints the next line or runs off the page.
 */
function fieldRows(doc: Doc, startY: number, rows: [string, string][]): number {
  let y = startY

  for (const [label, value] of rows) {
    const lines = doc.splitTextToSize(String(value), RIGHT_EDGE - VALUE_LIMIT) as string[]
    const height = ROW_PAD_TOP + (lines.length - 1) * LINE_H + ROW_PAD_BOTTOM

    // Page break before drawing, so a row is never split across pages.
    if (y + height > BOTTOM_LIMIT) {
      footer(doc)
      doc.addPage()
      y = MARGIN
    }

    const baseline = y + ROW_PAD_TOP

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...SLATE)
    doc.text(String(label), MARGIN, baseline)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    // One call per line rather than handing jsPDF the array: its own line spacing
    // is a multiple of the font size, which would not match LINE_H above and would
    // drift out of step with the row height computed from it.
    lines.forEach((line, i) => {
      doc.text(line, RIGHT_EDGE, baseline + i * LINE_H, { align: 'right' })
    })

    y += height
    doc.setDrawColor(...HAIRLINE)
    doc.setLineWidth(0.15)
    doc.line(MARGIN, y, RIGHT_EDGE, y)
  }

  return y
}

function footer(doc: Doc): void {
  const y = PAGE_H - 16
  doc.setDrawColor(...HAIRLINE)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...SLATE)
  doc.text(`Powered by ${VENDOR_NAME}`, MARGIN, y + 5)
  doc.text(
    'Illustrative conversation · non-production data',
    PAGE_W - MARGIN,
    y + 5,
    { align: 'right' },
  )
  // Second line kept separate so the disclaimer never collides with the credit.
  doc.text(
    'This receipt confirms a request was logged. It is not a bill or a payment confirmation.',
    MARGIN,
    y + 9,
    { maxWidth: CONTENT_W },
  )
}
