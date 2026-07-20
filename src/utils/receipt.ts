/**
 * Builds the PDF receipt for a request-summary card and hands it to the browser
 * as a download.
 *
 * `jspdf` is imported dynamically so it never enters the main bundle — the ~350kB
 * library is fetched on the first Download click and cached from then on. Keep it
 * that way: a static import here would put a PDF writer in front of every visitor.
 *
 * The page furniture — masthead, accent rule, striped rows, footer — lives in
 * `pdfTheme.ts` and is shared with the transcript, so the two documents cannot
 * drift into looking like two different companies.
 *
 * React-free on purpose, so it can be reused by any surface that needs the same
 * document (the dashboard, an email attachment job, a print button).
 */

import { CLIENT_NAME, VENDOR_NAME } from '@/constants/constants'
import {
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
  formatStamp,
  loadLogo,
  masthead,
  paginate,
  sectionHeading,
  slugify,
  type Doc,
} from '@/utils/pdfTheme'

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

const DISCLAIMER =
  'This receipt confirms a request was logged. It is not a bill or a payment confirmation.'

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
  // Both awaited together: the logo fetch is independent of the library, and
  // serialising them would add a round trip to every download.
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()])

  const issuedAt = input.issuedAt ?? new Date()
  const company = input.companyName ?? CLIENT_NAME
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  doc.setProperties({
    title: `${input.title} — receipt`,
    subject: input.reference ? `Reference ${input.reference}` : input.title,
    author: company,
    creator: VENDOR_NAME,
  })

  let y = masthead(doc, {
    kind: 'Service receipt',
    company,
    stamp: `Issued ${formatStamp(issuedAt)}`,
    logo,
  })

  /* ------------------------------- title -------------------------------- */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...NAVY)
  doc.text(input.title, MARGIN, y)

  // The reference is the one thing a customer reads back over the phone, so it
  // gets the only solid-cyan element on the page.
  if (input.reference) {
    chipRight(doc, RIGHT_EDGE, y, `REF ${input.reference}`, CYAN, WHITE)
  }

  y += 5.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text('Keep this for your records.', MARGIN, y)

  /* ------------------------------ customer ------------------------------ */
  if (input.customer) {
    y += 12
    y = sectionHeading(doc, 'Customer', y, CYAN)
    y = fieldRows(
      doc,
      y,
      [
        ['Name', input.customer.name],
        ['Customer number', input.customer.id],
        ['Email', input.customer.email],
        ['Phone', input.customer.phone],
      ],
      resume,
      { label: 'Customer', accent: CYAN },
    )
  }

  /* ------------------------------- details ------------------------------ */
  y += 11
  y = sectionHeading(doc, 'Request details', y, RED)
  y = fieldRows(doc, y, input.rows, resume, { label: 'Request details', accent: RED })

  paginate(doc, DISCLAIMER)

  return { doc, fileName: receiptFileName(input, issuedAt) }
}

/**
 * What a row block does when it runs out of page. Kept as a named function so
 * both sections break the same way — and so the accent rule is redrawn at the
 * top of the new page rather than the page starting bare.
 */
function resume(doc: Doc): number {
  return continuePage(doc)
}

/** Builds the receipt and hands it to the browser as a file download. */
export async function downloadReceiptPdf(input: ReceiptInput): Promise<void> {
  const { doc, fileName } = await buildReceiptPdf(input)
  doc.save(fileName)
}
