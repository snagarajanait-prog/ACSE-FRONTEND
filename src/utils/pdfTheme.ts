/**
 * Page geometry, palette and the branded furniture shared by every PDF the app
 * produces — the request receipt (`receipt.ts`) and the conversation transcript
 * (`transcriptPdf.ts`).
 *
 * Both documents are handed to the same customer, often on the same day, so they
 * have to look like they came from the same company. Keeping the margins, the
 * brand colours AND the masthead/footer drawing here is what guarantees that: a
 * rebrand or a margin change lands in both at once instead of drifting apart one
 * edit at a time.
 */

import logoUrl from '@/assets/acse-solutions-logo.png'
import { VENDOR_NAME } from '@/constants/constants'

/** Brand palette, mirrored from `--color-brand-*` in `index.css` as RGB triples. */
export const NAVY: [number, number, number] = [10, 30, 53]
export const CYAN: [number, number, number] = [44, 165, 217]
export const RED: [number, number, number] = [227, 57, 53]
export const SLATE: [number, number, number] = [100, 116, 139]
export const HAIRLINE: [number, number, number] = [226, 232, 240]

/** Print-only tints. They exist to give the page colour without competing with
 *  the brand hexes above, so none of them is saturated enough to read as an
 *  accent — they are backgrounds. */
export const WHITE: [number, number, number] = [255, 255, 255]
/** Right-hand end of the masthead gradient. Same hue family as NAVY, lifted. */
export const NAVY_LIFT: [number, number, number] = [22, 69, 111]
/** Alternating row fill — white with a breath of the brand cyan in it. */
export const STRIPE: [number, number, number] = [241, 247, 251]
/** Footer band. */
export const MIST: [number, number, number] = [244, 247, 250]
/** Muted text on navy, where SLATE would disappear. */
export const SLATE_LIGHT: [number, number, number] = [148, 163, 184]

/** A4 portrait, millimetres — matching the `unit: 'mm'` the documents use. */
export const PAGE_W = 210
export const PAGE_H = 297
export const MARGIN = 18
export const CONTENT_W = PAGE_W - MARGIN * 2
export const RIGHT_EDGE = PAGE_W - MARGIN

/** Masthead band, full-bleed, and the colour rule that closes it. */
export const BAND_H = 42
export const ACCENT_H = 1.8

/** First baseline of body content, clear of the masthead. */
export const CONTENT_TOP = BAND_H + ACCENT_H + 12
/** Same, on a continuation page — no masthead there, just the accent rule. */
export const CONTINUED_TOP = ACCENT_H + 14

/** Footer band height, and the lowest y a document may draw at before breaking. */
export const FOOTER_H = 24
export const BOTTOM_LIMIT = PAGE_H - FOOTER_H - 6

/**
 * The jsPDF document instance type, derived from the dynamic import so neither
 * document has to name it (and so `jspdf` stays out of the main bundle — see the
 * note in `receipt.ts`).
 */
export type Doc = InstanceType<Awaited<typeof import('jspdf')>['jsPDF']>

type RGB = [number, number, number]

/** `20 Jul 2026, 17:16` — unambiguous across locales, unlike a bare numeric date. */
export function formatStamp(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Lowercase, hyphen-joined — used to build download file names. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ---------------------------------- logo ---------------------------------- */

/**
 * The ACSE lockup as a base64 PNG, which is the only form `addImage` accepts.
 *
 * Fetched from the bundled asset rather than inlined as a string constant: at
 * 36KB the artwork would add ~48KB of base64 to the main bundle, which defeats
 * the point of loading `jspdf` lazily in the first place. Vite emits the PNG as
 * a normal fingerprinted file, so this is a same-origin hit that the browser
 * cache serves instantly on every subsequent download.
 *
 * Memoised because a customer who downloads a receipt usually downloads the
 * transcript too, and the second document should not re-fetch.
 */
let logoPromise: Promise<string | null> | null = null

export function loadLogo(): Promise<string | null> {
  logoPromise ??= (async () => {
    try {
      const response = await fetch(logoUrl)
      if (!response.ok) return null
      const bytes = new Uint8Array(await response.arrayBuffer())
      // Chunked: `String.fromCharCode(...bytes)` on a 36KB array overflows the
      // argument limit in every engine.
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      }
      return `data:image/png;base64,${btoa(binary)}`
    } catch {
      // A missing logo must never cost the customer their receipt — the masthead
      // falls back to a text lockup.
      return null
    }
  })()
  return logoPromise
}

/** Natural size of `acse-solutions-logo.png`, for aspect-correct placement. */
const LOGO_ASPECT = 900 / 470

/* --------------------------------- drawing -------------------------------- */

/**
 * Right-aligned text with letter spacing.
 *
 * `doc.text(…, { align: 'right' })` cannot be used for this: jsPDF measures the
 * string with `getStringUnitWidth`, which knows nothing about the character
 * spacing set by `setCharSpace`, so it anchors the text as if the spacing were
 * zero and the block overhangs the right margin by `spacing × length`. On a long
 * label — "CONVERSATION TRANSCRIPT" — that runs clean off the page.
 *
 * So the width is computed here (PDF's `Tc` adds its advance after every glyph,
 * the last one included) and the text is drawn left-aligned from the result.
 */
export function textRightSpaced(
  doc: Doc,
  text: string,
  right: number,
  y: number,
  spacing: number,
): void {
  doc.setCharSpace(spacing)
  doc.text(text, right - (doc.getTextWidth(text) + spacing * text.length), y)
  doc.setCharSpace(0)
}

/**
 * A horizontal gradient, faked as adjacent strips because PDF gradients (shading
 * dictionaries) are not something jsPDF exposes.
 *
 * Strips overlap by a hair: abutting fills are anti-aliased independently by
 * most viewers, which leaves a visible white seam between every pair.
 */
export function gradientBar(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  from: RGB,
  to: RGB,
  steps = 80,
): void {
  const stripe = w / steps
  for (let i = 0; i < steps; i += 1) {
    const t = steps === 1 ? 0 : i / (steps - 1)
    doc.setFillColor(
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t),
    )
    doc.rect(x + i * stripe, y, stripe + 0.15, h, 'F')
  }
}

/**
 * The colour rule that closes the masthead and opens a continuation page.
 *
 * Two segments rather than one cyan-to-red gradient: interpolating between the
 * brand's blue and its red passes straight through a muddy grey-purple at the
 * midpoint. A hard split keeps both hues as themselves.
 */
export function accentRule(doc: Doc, y: number): void {
  const split = PAGE_W * 0.68
  gradientBar(doc, 0, y, split, ACCENT_H, CYAN, [26, 122, 165], 48)
  doc.setFillColor(...RED)
  doc.rect(split - 0.15, y, PAGE_W - split + 0.15, ACCENT_H, 'F')
}

/**
 * The masthead: full-bleed navy band, ACSE lockup on a white card at the left,
 * document kind and client name ranged right.
 *
 * The lockup is the masthead because these documents are ACSE's product — the
 * client is named as who the document is *for*. The white card behind it is not
 * decoration: the wordmark's "SOLUTIONS" is set in brand grey (#6D6E71), which
 * on navy drops to roughly 3:1 and reads as mud. On white the artwork is exactly
 * the artwork.
 *
 * Returns the y at which body content may start.
 */
export function masthead(
  doc: Doc,
  options: { kind: string; company: string; stamp?: string; logo: string | null },
): number {
  const { kind, company, stamp, logo } = options

  gradientBar(doc, 0, 0, PAGE_W, BAND_H, NAVY, NAVY_LIFT)

  // Two soft cyan blooms, so the band has some depth rather than reading as a
  // flat swatch. Opacity is reset immediately — jsPDF's graphics state is global
  // and would otherwise wash out every fill that follows.
  doc.setGState(doc.GState({ opacity: 0.14 }))
  doc.setFillColor(...CYAN)
  doc.circle(PAGE_W - 26, 6, 26, 'F')
  doc.circle(PAGE_W - 68, BAND_H - 4, 18, 'F')
  doc.setGState(doc.GState({ opacity: 1 }))

  // Crop the blooms to the band. jsPDF exposes no clipping path worth using
  // here, and without this the lower circle bleeds a pale disc down into the
  // body of the page — right behind the reference chip. Painting the page back
  // to white is safe because nothing has been drawn below the band yet.
  doc.setFillColor(...WHITE)
  doc.rect(0, BAND_H, PAGE_W, PAGE_H - BAND_H, 'F')

  /* ------------------------------- lockup -------------------------------- */
  const cardW = 46
  const cardH = 26
  const cardY = (BAND_H - cardH) / 2
  doc.setFillColor(...WHITE)
  doc.roundedRect(MARGIN, cardY, cardW, cardH, 3, 3, 'F')

  if (logo) {
    const artW = cardW - 8
    const artH = artW / LOGO_ASPECT
    doc.addImage(logo, 'PNG', MARGIN + 4, cardY + (cardH - artH) / 2, artW, artH)
  } else {
    // Text lockup, used only if the artwork failed to load.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...RED)
    doc.text('ACSE', MARGIN + cardW / 2, cardY + 13, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setTextColor(109, 110, 113)
    // Nudged left by half the spacing jsPDF does not account for when centring —
    // same blind spot as `textRightSpaced` above.
    const spacing = 1.4
    doc.setCharSpace(spacing)
    doc.text('SOLUTIONS', MARGIN + cardW / 2 - (spacing * 'SOLUTIONS'.length) / 2, cardY + 18.5, {
      align: 'center',
    })
    doc.setCharSpace(0)
  }

  /* -------------------------------- titles -------------------------------- */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...CYAN)
  textRightSpaced(doc, kind.toUpperCase(), RIGHT_EDGE, 17, 1.1)

  doc.setFontSize(15)
  doc.setTextColor(...WHITE)
  doc.text(company, RIGHT_EDGE, 26.5, { align: 'right' })

  if (stamp) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...SLATE_LIGHT)
    doc.text(stamp, RIGHT_EDGE, 32.5, { align: 'right' })
  }

  accentRule(doc, BAND_H)
  return CONTENT_TOP
}

/**
 * Opens a continuation page: the accent rule alone, so the colour carries across
 * the document without repeating the whole masthead. Returns the body start y.
 */
export function continuePage(doc: Doc): number {
  doc.addPage()
  accentRule(doc, 0)
  return CONTINUED_TOP
}

/**
 * A pill — used for the reference id, and for anything else that wants to read
 * as a token rather than as prose. Sized to its text and ranged right from `x`.
 */
export function chipRight(
  doc: Doc,
  x: number,
  baseline: number,
  text: string,
  fill: RGB,
  fg: RGB,
): void {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  const w = doc.getTextWidth(text) + 9

  doc.setFillColor(...fill)
  doc.roundedRect(x - w, baseline - 5.1, w, 7.2, 3.6, 3.6, 'F')

  doc.setTextColor(...fg)
  doc.text(text, x - w / 2, baseline - 0.3, { align: 'center' })
}

/**
 * Small-caps section heading with a colour tab in the margin. Returns the y of
 * the first row beneath it.
 *
 * The tab colour is the section's own — it is what lets a reader find "Request
 * details" on a page of otherwise uniform grey type.
 */
export function sectionHeading(doc: Doc, label: string, y: number, accent: RGB): number {
  doc.setFillColor(...accent)
  doc.roundedRect(MARGIN, y - 2.9, 3.2, 3.2, 0.9, 0.9, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  doc.setCharSpace(0.5)
  doc.text(label.toUpperCase(), MARGIN + 6, y)
  doc.setCharSpace(0)

  return y + 3.6
}

/* --------------------------------- rows ---------------------------------- */

/** Row metrics, in mm. Padding is deliberately asymmetric: optical centring
 *  wants slightly more space above a baseline than below it. */
export const LINE_H = 4.4
const ROW_PAD_TOP = 4.8
const ROW_PAD_BOTTOM = 3.6
/** Text inset from the stripe's edge, so type never touches the fill. */
const ROW_PAD_X = 3.6

/**
 * Leftmost point a value may reach before wrapping. Labels own everything to the
 * left of it. Values are set flush RIGHT — same as the card on screen, where
 * `<dd>` is `text-right` — so both columns land on the stripe's edges.
 */
const VALUE_LIMIT = MARGIN + 60

/**
 * Label/value rows on alternating tinted stripes.
 *
 * Stripes replace the hairline rules the earlier version drew: a rule per row
 * turns a four-row block into a ladder, whereas the zebra reads as one table and
 * carries a little of the brand colour into the body of the page. Each row draws
 * its own stripe rather than sharing one panel, which is what lets a block break
 * across a page without leaving a half-drawn container behind.
 *
 * `y` tracks the row's TOP edge, not its baseline. Deriving the baseline from
 * that is what keeps the spacing even.
 *
 * Values wrap within their column and the row grows to fit, so a long service
 * address never overprints the next line or runs off the page. `onBreak` is
 * called instead of a bare `addPage` so each document keeps control of what a
 * fresh page looks like.
 *
 * `continued` re-states the section heading at the top of each new page. Without
 * it a reader who turns the page finds a bare grid of values with nothing saying
 * what they are — the rows look orphaned rather than carried over.
 */
export function fieldRows(
  doc: Doc,
  startY: number,
  rows: [string, string][],
  onBreak: (doc: Doc) => number,
  continued?: { label: string; accent: RGB },
): number {
  let y = startY
  let index = 0

  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(String(value), RIGHT_EDGE - ROW_PAD_X - VALUE_LIMIT) as string[]
    const height = ROW_PAD_TOP + (lines.length - 1) * LINE_H + ROW_PAD_BOTTOM

    // Page break before drawing, so a row is never split across pages.
    if (y + height > BOTTOM_LIMIT) {
      y = onBreak(doc)
      index = 0
      if (continued) {
        y = sectionHeading(doc, `${continued.label} (continued)`, y + 2, continued.accent)
      }
    }

    if (index % 2 === 0) {
      doc.setFillColor(...STRIPE)
      doc.roundedRect(MARGIN, y, CONTENT_W, height, 1.6, 1.6, 'F')
    }

    const baseline = y + ROW_PAD_TOP

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...SLATE)
    doc.text(String(label), MARGIN + ROW_PAD_X, baseline)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    // One call per line rather than handing jsPDF the array: its own line spacing
    // is a multiple of the font size, which would not match LINE_H above and would
    // drift out of step with the row height computed from it.
    lines.forEach((line, i) => {
      doc.text(line, RIGHT_EDGE - ROW_PAD_X, baseline + i * LINE_H, { align: 'right' })
    })

    y += height
    index += 1
  }

  return y
}

/* -------------------------------- footer ---------------------------------- */

/**
 * Stamps the footer band and `Page n of m` onto every page. Run once at the end,
 * because `m` is not known until the whole document has been laid out.
 */
export function paginate(doc: Doc, disclaimer: string): void {
  const total = doc.getNumberOfPages()
  const top = PAGE_H - FOOTER_H

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)

    doc.setFillColor(...MIST)
    doc.rect(0, top, PAGE_W, FOOTER_H, 'F')
    // Mirrors the masthead rule, so the page is bracketed by the same two hues.
    doc.setFillColor(...HAIRLINE)
    doc.rect(0, top, PAGE_W, 0.4, 'F')
    doc.setFillColor(...CYAN)
    doc.rect(0, top, PAGE_W * 0.32, 0.4, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...NAVY)
    doc.text(`Powered by ${VENDOR_NAME}`, MARGIN, top + 8)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(`Page ${page} of ${total}`, RIGHT_EDGE, top + 8, { align: 'right' })

    doc.setFontSize(7)
    doc.text(disclaimer, MARGIN, top + 13, { maxWidth: CONTENT_W })
    doc.setTextColor(...SLATE_LIGHT)
    doc.text('Illustrative conversation · non-production data', MARGIN, top + 20)
  }
}
