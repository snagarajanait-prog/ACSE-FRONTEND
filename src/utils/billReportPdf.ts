/**
 * The analysis as a TWO-page PDF, laid out the way the report itself is.
 *
 * Two pages is a hard requirement, and it is the requirement that decides what
 * goes in. There are two ways to fit more into a fixed space — shrink it, or cut
 * it — and the first one has already been tried here. An earlier draft held all
 * of this on two pages at 6–8pt with 3mm between: four KPI tiles, two packed
 * rails, a waterfall, a donut, a six-row cost list and a table. Everything
 * fitted and nothing led. A reader opening it had no idea where to look, which
 * is a worse failure than leaving something out.
 *
 * So this cuts instead. What survives is every REPORTED fact — those are the
 * customer's own figures and dropping one would be a lie of omission — plus the
 * analysis that changes a decision. What went is listed at the bottom of this
 * comment, with the reasoning, so nobody has to guess whether it was dropped or
 * lost.
 *
 * The layout grammar is the report's own — see `assets/Bills/`. Four moves:
 *
 *   1. BANDS. The page is a stack of horizontal bands separated by hairline
 *      rules. One band carries one idea. Nothing spans a rule.
 *   2. A GREY RAIL down the right, full-bleed to the page edge, running the
 *      height of each band.
 *   3. ONE HERO NUMBER per band, in that rail, set enormous — 30pt+, in colour,
 *      with a short kicker above it. That figure is the band's headline and the
 *      only thing on the band competing for the eye.
 *   4. AIR. Large, light section headings; body at a readable size; generous
 *      space between everything. This is the part a density pass always eats
 *      first, and it is the part doing the work.
 *
 *   Page 1 — the diagnosis. The comparison, the rating, last year.
 *   Page 2 — where it goes, what to do, what is already on offer.
 *
 * CUT, and why:
 *
 *   • The full twelve-month line chart. The biggest single item at ~90mm, and
 *     its finding — that the gap survives every season, so it is the building
 *     and not the weather — is preserved by the sparkline in page 1's third
 *     rail. A sparkline cannot be read off precisely, but that claim was never
 *     about precise values.
 *   • The waterfall. It and the action table encoded the same six savings; the
 *     table also carries upfront cost and effort, so the table stayed.
 *   • The four KPI tiles. They restated the plan's rail figures inside boxes,
 *     and a page with a grey rail, a table and four tinted tiles has three
 *     competing containers on it.
 *   • Carbon's own figures, the percentile's own line, and the quick-win
 *     threshold arithmetic. All three survive as clauses rather than blocks.
 *
 * Charts keep the screen's rules — thin marks, hairline grid, one accent against
 * a de-emphasis gray, values at the data end — because a printout that encodes
 * the same numbers differently from the screen is a second design system nobody
 * asked for.
 *
 * `jspdf` is imported dynamically, as in the other two documents. Keep it that
 * way: a static import would put a ~350kB PDF writer in front of every visitor.
 */
import { VENDOR_NAME } from '@/constants/constants'
import {
  ASSUMPTIONS,
  BILL_META,
  BILL_RATING,
  BILL_TIP,
  CONNECTED_REWARDS,
  END_USES,
  HISTORY,
  MAILING,
  PEER_USAGE,
  PERIOD,
  PROFILE,
  REPORT,
  SAVING_ACTIONS,
  TOP_TWO_END_USES,
  YEAR_OVER_YEAR,
  actionById,
  fmtUnits,
  fmtUsd,
  usd,
} from '@/data/billReport'
import { qrMatrix } from '@/utils/qr'
import {
  CONTENT_W,
  CYAN,
  MARGIN,
  NAVY,
  PAGE_W,
  RIGHT_EDGE,
  SLATE,
  STRIPE,
  WHITE,
  chipRight,
  continuePage,
  formatStamp,
  loadLogo,
  masthead,
  slugify,
  type Doc,
} from '@/utils/pdfTheme'

type RGB = [number, number, number]

/* --------------------------------- palette -------------------------------- */

/**
 * The print palette, mirrored from `.viz-root`'s LIGHT values in `index.css` —
 * paper is always the light surface, so the dark steps never apply here. These
 * are the same hexes the validator cleared for a white surface.
 */
const ACCENT: RGB = [15, 91, 124] // --viz-accent
const CONTEXT: RGB = [135, 149, 168] // --viz-context
const GRID: RGB = [232, 237, 243] // --viz-grid
const INK_MUTED: RGB = [100, 116, 139] // --viz-ink-muted
const GOOD: RGB = [4, 120, 87] // --viz-good
const WARNING: RGB = [180, 83, 9] // --viz-warning
const CRITICAL: RGB = [220, 38, 38] // --viz-critical
/** Lightest step of the ordinal cyan ramp — the "before" in a before/after pair. */
const RAMP_1: RGB = [103, 193, 230]

/**
 * The Fair / Good / Great scale, coloured as the report colours it: a three-step
 * quality ramp rather than one marked segment against grey track.
 *
 * These are status colours doing their own job, not a categorical set, and every
 * segment is direct-labelled with a caret over the marked one — so identity
 * never rests on hue. That is what makes a warm-to-cool ramp legitimate here
 * where it would not be for three unrelated series.
 */
const BAND_RAMP: RGB[] = [
  [180, 83, 9], // Fair — orange
  [202, 138, 4], // Good — yellow
  [4, 120, 87], // Great — green
]

/**
 * Categorical hues for the end-use donut — the one chart here whose segments are
 * genuinely separate identities rather than one measure at different sizes.
 *
 * Validated as a set against a white surface: lightness band, chroma floor,
 * adjacent CVD ΔE 9.1 and normal-vision ΔE 19.6 all pass. Three of the six sit
 * under 3:1 against white, which is a WARN and not dismissable — the relief is
 * the legend beside the ring, which direct-labels every segment with its name
 * and value, so no reader ever has to identify a slice by colour alone.
 *
 * The brand cyan leads deliberately: the largest end use is the point of the
 * chart, and it should be the report's own colour.
 */
const CATEGORICAL: RGB[] = [
  [22, 120, 159], // brand cyan-dark
  [235, 104, 52], // orange
  [27, 175, 122], // aqua
  [237, 161, 0], // yellow
  [232, 123, 164], // magenta
  [74, 58, 167], // violet
]

/* --------------------------------- geometry ------------------------------- */

/**
 * The band grid: a wide content column, then the grey rail, which runs to the
 * PAGE edge rather than to the margin.
 *
 * Bleeding the rail off the right is the report's most recognisable move and it
 * is why the panel reads as part of the page furniture rather than as a box
 * someone dropped on it. Rail text is inset by its own padding, so nothing sets
 * closer to the trim than the 8mm below.
 */
const LEFT_W = 112
const RAIL_X = 138
const RAIL_W = PAGE_W - RAIL_X
const RAIL_PAD = 8
const RAIL_TX = RAIL_X + RAIL_PAD
const RAIL_TW = RAIL_W - RAIL_PAD * 2

/** Nothing prints below this. A4 is 297; most printers cannot reach the last 5. */
const FOOT_LIMIT = 284

/* ------------------------------- entry points ----------------------------- */

export function billReportFileName(issuedAt: Date): string {
  return `${slugify(BILL_META.provider)}-home-energy-analysis-${slugify(BILL_META.accountNumber)}-${issuedAt
    .toISOString()
    .slice(0, 10)}.pdf`
}

/** Builds the document without touching the DOM, so it stays testable. */
export async function buildBillReportPdf(issuedAtInput?: Date) {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()])

  const issuedAt = issuedAtInput ?? new Date()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  doc.setProperties({
    title: `${BILL_META.provider} Home Energy Report — analysis`,
    subject: `Account ${BILL_META.accountNumber} · ${PERIOD.label}`,
    author: BILL_META.provider,
    creator: VENDOR_NAME,
  })

  pageStanding(doc, logo, issuedAt)
  pageAction(doc)

  // No footer band. `paginate` from `pdfTheme` is deliberately NOT called: its
  // contents — the powered-by credit and the disclaimer — are already on the
  // page (the masthead carries the credit, the closing footnote the disclaimer),
  // and this document prints its own page marks. The receipt still uses
  // `paginate`, which is why the helper stays in `pdfTheme`.

  return { doc, fileName: billReportFileName(issuedAt) }
}

export async function downloadBillReportPdf(): Promise<void> {
  const { doc, fileName } = await buildBillReportPdf()
  doc.save(fileName)
}

/* ============================== band grammar =============================== */

/**
 * The grey panel behind a band's rail. Drawn FIRST, before anything that sits on
 * it — jsPDF paints in call order and has no z-index.
 */
function rail(doc: Doc, top: number, height: number): void {
  doc.setFillColor(...STRIPE)
  doc.rect(RAIL_X, top, RAIL_W, height, 'F')
}

/**
 * A section heading: large, and set in regular weight rather than bold.
 *
 * The report's headings are big and light, which is what lets them organise a
 * page without shouting over the figure that is supposed to be its headline. The
 * small-caps chip this replaces did the opposite — it was loud, tiny, and
 * competed with the number beside it.
 */
function sectionTitle(doc: Doc, x: number, y: number, text: string, size = 13.5): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...NAVY)
  doc.text(text, x, y)
  return y + 5
}

/** The hairline that closes a band. */
function divider(doc: Doc, y: number, from = MARGIN, to = RIGHT_EDGE): void {
  doc.setDrawColor(...GRID)
  doc.setLineWidth(0.4)
  doc.line(from, y, to, y)
}

/**
 * The band's headline figure, in the rail.
 *
 * One per band, and never anywhere else on the page — the whole point of setting
 * something at 40pt is that it is the only thing at 40pt.
 *
 * Returns the figure's ADVANCE WIDTH so a caller can set a unit beside it. That
 * matters: the width has to be measured while the hero's own font is still
 * active. Measuring afterwards, at the small font, and scaling by the size ratio
 * is close enough to look right and wrong enough to drift the moment either size
 * changes — which is exactly what the first draft did.
 */
function hero(doc: Doc, y: number, value: string, tone: RGB, size = 40, x = RAIL_TX): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  doc.setTextColor(...tone)
  doc.text(value, x, y)
  return doc.getTextWidth(value)
}

/** Small text in the rail — the line that says what the hero figure is. */
function railText(
  doc: Doc,
  y: number,
  lines: [text: string, bold: boolean][],
  size = 8.5,
  lead = 3.9,
): number {
  let ty = y
  for (const [text, bold] of lines) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(bold ? NAVY : SLATE))
    const wrapped = doc.splitTextToSize(text, RAIL_TW) as string[]
    wrapped.forEach((line, i) => doc.text(line, RAIL_TX, ty + i * lead))
    ty += wrapped.length * lead
  }
  return ty
}

/** Body copy in the content column. Returns the y beneath it. */
function body(
  doc: Doc,
  x: number,
  y: number,
  text: string,
  width: number,
  size = 8.5,
  tone: RGB = SLATE,
  lead = 3.9,
): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...tone)
  const lines = doc.splitTextToSize(text, width) as string[]
  lines.forEach((line, i) => doc.text(line, x, y + i * lead))
  return y + lines.length * lead
}

/** A quiet, italic footnote. */
function note(doc: Doc, y: number, text: string, width = CONTENT_W, x = MARGIN): number {
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.2)
  doc.setTextColor(...INK_MUTED)
  const lines = doc.splitTextToSize(text, width) as string[]
  lines.forEach((line, i) => doc.text(line, x, y + i * 3.1))
  return y + lines.length * 3.1
}

/**
 * The ✗ the report puts beside its failed check.
 *
 * Drawn as two strokes: jsPDF's standard fonts are WinAnsi-encoded and have no
 * U+2717, so the character prints as a pair of unrelated glyphs. Same trap as
 * the arrow and the CO₂ subscript elsewhere in this file.
 */
function crossMark(doc: Doc, cx: number, cy: number, r = 1.5, tone: RGB = CRITICAL): void {
  doc.setDrawColor(...tone)
  doc.setLineWidth(0.55)
  doc.setLineCap('round')
  doc.line(cx - r, cy - r, cx + r, cy + r)
  doc.line(cx + r, cy - r, cx - r, cy + r)
  doc.setLineCap('butt')
}

/** The page's own foot: the mailing marks the report carries, smallest type on it. */
function pageFoot(doc: Doc, y: number, withCodes: boolean): void {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5)
  doc.setTextColor(...CONTEXT)
  const text = withCodes
    ? `${MAILING.printCode} · ${MAILING.carrierRoute} · ${MAILING.batchRef}`
    : MAILING.printCode
  doc.text(text, MARGIN, y)
}

/* ================================== page 1 ================================= */

/**
 * The diagnosis — the mirror of the report's own page 1, plus last year.
 *
 * Three bands: the neighbourhood comparison with the 49% beside it, the rating
 * scale with our score beside it, and last year with the 2% beside it.
 */
function pageStanding(doc: Doc, logo: string | null, issuedAt: Date) {
  const y = masthead(doc, {
    kind: 'Home energy analysis',
    company: BILL_META.provider,
    stamp: `Prepared ${formatStamp(issuedAt)}`,
    logo,
  })

  // No page title here: the masthead already names the document, and the page
  // leads straight into who it is for. The identity line and the account chip
  // share one baseline so the row reads as a single header band rather than two
  // marks left floating where a heading used to sit.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  doc.text(`${BILL_META.customerName} · ${BILL_META.serviceAddress} · ${PERIOD.label}`, MARGIN, y)
  chipRight(doc, RIGHT_EDGE, y, `ACCT ${BILL_META.accountNumber}`, CYAN, WHITE)

  /* ------------------- band 1 · the neighbourhood ------------------------- */
  const b1 = y + 8
  const b1h = 72
  rail(doc, b1, b1h)

  let ly = sectionTitle(doc, MARGIN, b1 + 9, 'Energy use across homes like yours')
  ly = gapTrack(doc, MARGIN, ly + 3, LEFT_W, {
    subject: { label: 'You', value: PEER_USAGE.you },
    marks: [
      { label: 'Efficient homes', value: PEER_USAGE.efficient },
      { label: 'Similar homes', value: PEER_USAGE.similar },
    ],
    gaps: [
      {
        from: PEER_USAGE.similar,
        label: `+${fmtUnits(REPORT.vsSimilar.units)} over the average`,
        tone: CRITICAL,
      },
      {
        from: PEER_USAGE.efficient,
        label: `+${fmtUnits(REPORT.vsEfficient.units)} over efficient homes`,
        tone: INK_MUTED,
      },
    ],
    fills: ['Up to the group average', 'Above the group average'],
  })
  note(doc, ly + 4.5, `${BILL_META.efficientDefinition} ${BILL_META.unitDefinition}`, LEFT_W)

  // The rail: the report's own headline, at the report's own size.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.6)
  doc.setTextColor(...INK_MUTED)
  doc.text(PERIOD.label, RAIL_TX, b1 + 10)
  railText(doc, b1 + 19, [
    ['Your energy use was', false],
    [`${BILL_RATING.headlineComparison} than similar homes by`, true],
  ])
  hero(doc, b1 + 46, `${BILL_RATING.headlineComparisonPct}%`, CRITICAL, 42)

  // The report marks this sentence with a ✗. It is a failed check, not an
  // observation, and a rendition that keeps the words and drops the mark has
  // quietly softened the source. Centred on the first line's x-height, not its
  // baseline — a mark hung off a baseline sits visibly low.
  crossMark(doc, RAIL_TX + 1.7, b1 + 50.9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  const verdict = doc.splitTextToSize(BILL_RATING.verdict, RAIL_TW - 6) as string[]
  verdict.forEach((line, i) => doc.text(line, RAIL_TX + 6, b1 + 52 + i * 3.6))

  divider(doc, b1 + b1h + 4, MARGIN, RAIL_X - 4)

  /* ---------------------- band 2 · the rating scale ----------------------- */
  const b2 = b1 + b1h + 8
  const b2h = 40
  rail(doc, b2, b2h)

  sectionTitle(doc, MARGIN, b2 + 9, BILL_RATING.title)
  bandScale(doc, MARGIN, b2 + 15, LEFT_W)
  body(doc, MARGIN, b2 + 33, BILL_RATING.contextNote, LEFT_W, 8.5)

  railText(doc, b2 + 11, [['Our own score for this home', false]], 8)
  const scoreW = hero(doc, b2 + 28, `${REPORT.score}`, WARNING, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...INK_MUTED)
  doc.text('/100', RAIL_TX + scoreW + 1.2, b2 + 28)
  railText(
    doc,
    b2 + 33,
    [
      [`${REPORT.band} · +${REPORT.scoreDeltaPts} points on last year`, true],
      [`Higher use than about ${REPORT.percentile}% of the group.`, false],
    ],
    7.6,
    3.4,
  )

  divider(doc, b2 + b2h + 4, MARGIN, RAIL_X - 4)

  /* ------------------------- band 3 · last year --------------------------- */
  const b3 = b2 + b2h + 8
  const b3h = 58
  rail(doc, b3, b3h)

  sectionTitle(doc, MARGIN, b3 + 9, 'Your energy use compared to last year')
  yearColumns(doc, MARGIN, b3 + 15, 22)

  const qx = MARGIN + 60
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  const question = doc.splitTextToSize(YEAR_OVER_YEAR.billQuestion, LEFT_W - 62) as string[]
  question.forEach((line, i) => doc.text(line, qx, b3 + 19 + i * 3.9))
  body(
    doc,
    qx,
    b3 + 19 + question.length * 3.9 + 2.4,
    YEAR_OVER_YEAR.billExplanation,
    LEFT_W - 62,
  )

  railText(doc, b3 + 11, [
    ['This period, your energy use', false],
    [`${YEAR_OVER_YEAR.direction} by`, true],
  ])
  hero(doc, b3 + 33, `${Math.abs(YEAR_OVER_YEAR.statedChangePct)}%`, GOOD, 32)

  // The twelve-month history, as a sparkline rather than the full chart it used
  // to be. What that chart proved — the gap holds in mild months as well as
  // harsh ones, so it is the building and not the weather — is a claim about
  // SHAPE, and shape is what survives the shrink. Precise monthly values did
  // not, and were never the point of it.
  sparkline(doc, RAIL_TX, b3 + 38, RAIL_TW, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...INK_MUTED)
  doc.text('Twelve months, you against the group. The gap', RAIL_TX, b3 + 54)
  doc.text('holds in every season, mild or harsh.', RAIL_TX, b3 + 56.8)

  /* -------------------------------- the foot ------------------------------ */
  // Pinned to the bottom of the sheet rather than floated under the last band.
  // The report does the same, and it is what makes a page with room left on it
  // read as a page with room left rather than one that stopped early.
  divider(doc, FOOT_LIMIT - 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...NAVY)
  doc.text(BILL_META.pageTurnLine.lead, MARGIN, FOOT_LIMIT - 10)
  // An explicit 2mm gap, not a leading space: the run-on is set in a different
  // weight, so the space would be measured against the wrong font.
  const turnW = doc.getTextWidth(BILL_META.pageTurnLine.lead) + 2
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  doc.text(BILL_META.pageTurnLine.rest, MARGIN + turnW, FOOT_LIMIT - 10)
  pageFoot(doc, FOOT_LIMIT, true)
}

/* ================================== page 2 ================================= */

/**
 * Where it goes, what to do, and what is already on offer.
 *
 * Band 1 pairs our end-use split with the two things the report says about it —
 * that appliances are the largest draw, and its tip for the fridge inside that
 * draw. They belong together: the tip is advice about the biggest slice of the
 * ring beside it, and separating them was what made an earlier draft read as two
 * documents stapled together.
 */
function pageAction(doc: Doc) {
  let y = continuePage(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.text('Where it goes, and what to do about it', MARGIN, y)

  y += 5.4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  doc.text(
    `${BILL_META.customerName} · account #${BILL_META.accountNumber} · ${PERIOD.label}`,
    MARGIN,
    y,
  )

  /* --------------------- band 1 · the split and the tip ------------------- */
  const b1 = y + 8
  const b1h = 74
  rail(doc, b1, b1h)

  sectionTitle(doc, MARGIN, b1 + 9, `Where the ${fmtUnits(PEER_USAGE.you)} units went`)
  // The ring is sized by its LEGEND, not by itself: six rows of type is taller
  // than any ring this column has room for, so the legend sets the band height
  // and the ring is drawn to match it.
  donut(
    doc,
    MARGIN + 19,
    b1 + 34,
    17,
    9.5,
    END_USES.map((e) => ({
      label: e.label,
      value: e.units,
      valueLabel: `${fmtUnits(e.units)} · ${e.sharePct}%`,
    })),
    MARGIN + 44,
    LEFT_W - 46,
  )

  // The report's own tip, set against the ring it is advice about.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  doc.text(`${BILL_TIP.heading}: ${BILL_TIP.title}`, MARGIN, b1 + 57)
  const ty = body(doc, MARGIN, b1 + 62, BILL_TIP.body, LEFT_W, 8)
  note(
    doc,
    ty + 1,
    `Free, and at about ${fmtUsd(usd(actionById('coils').unitsPerYear))} a year the smallest measure below. Only the ring's ranking is reported; the shares are a regional split re-weighted to match it.`,
    LEFT_W,
  )

  railText(
    doc,
    b1 + 12,
    [['Based on your smart meter data, your energy use was highest in', false]],
    7.8,
    3.4,
  )
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...ACCENT)
  doc.text(BILL_TIP.highestEndUseLabel, RAIL_TX, b1 + 34)
  railText(
    doc,
    b1 + 42,
    [
      [
        `${TOP_TWO_END_USES.sharePct}% of the period is ${TOP_TWO_END_USES.labels.join(' and ').toLowerCase()} together. Anything that moves the bill has to move one of those two.`,
        false,
      ],
    ],
    7.6,
    3.4,
  )

  divider(doc, b1 + b1h + 4, MARGIN, RAIL_X - 4)

  /* ---------------------- band 2 · the cost and the plan ------------------ */
  const b2 = b1 + b1h + 8
  const b2h = 84
  rail(doc, b2, b2h)

  const ranked = [...SAVING_ACTIONS].sort(
    (a, b) => usd(b.unitsPerYear) + b.creditUsdPerYear - (usd(a.unitsPerYear) + a.creditUsdPerYear),
  )

  sectionTitle(doc, MARGIN, b2 + 9, 'What a year of this costs, and what to do about it')
  figureRow(doc, MARGIN, b2 + 17, LEFT_W, [
    { label: 'A year of energy', value: fmtUsd(REPORT.annual.cost), tone: NAVY },
    { label: 'Above similar homes', value: fmtUsd(REPORT.annual.excessCost), tone: CRITICAL },
    {
      label: 'Above efficient homes',
      value: fmtUsd(REPORT.annual.excessVsEfficientCost),
      tone: CRITICAL,
    },
  ])
  const py = actionTable(doc, b2 + 30, ranked, LEFT_W)
  note(
    doc,
    py + 4,
    `Modelled at $${ASSUMPTIONS.ratePerUnit.toFixed(2)} per combined unit — our figure, not a tariff, so nothing here is a billed amount. The ${REPORT.quickWins.count} low-effort measures alone come to ${fmtUsd(REPORT.quickWins.upfrontUsd)} and reach ${REPORT.quickWins.projectedScore}. ${BILL_META.partner} rebates cover the duct work.`,
    LEFT_W,
  )

  railText(doc, b2 + 12, [['Doing all of it saves', false]], 8)
  hero(doc, b2 + 34, fmtUsd(REPORT.plan.savingsUsdPerYear), GOOD, 30)
  railText(
    doc,
    b2 + 41,
    [
      ['a year, credits included', false],
      [
        `${fmtUsd(REPORT.plan.upfrontUsd)} upfront, paid back in ${REPORT.plan.paybackMonths} months.`,
        true,
      ],
      [
        `Closes ${REPORT.plan.gapClosedPct}% of the gap and takes the score from ${REPORT.score} to ${REPORT.plan.projectedScore} — into the ${REPORT.plan.projectedBand} band.`,
        false,
      ],
    ],
    7.6,
    3.4,
  )

  divider(doc, b2 + b2h + 4, MARGIN, RAIL_X - 4)

  /* ------------------------- band 3 · not yet claimed --------------------- */
  const b3 = b2 + b2h + 8
  const b3h = 50 // ends at 253mm; the footer rule is pinned at 256
  rail(doc, b3, b3h)

  sectionTitle(doc, MARGIN, b3 + 9, 'Not yet claimed on this account')

  const thermostat = actionById('thermostat')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  doc.text(
    `${CONNECTED_REWARDS.name} — ${fmtUsd(CONNECTED_REWARDS.annualCreditUsd)} a year, unclaimed`,
    MARGIN,
    b3 + 17,
  )
  const ry = body(
    doc,
    MARGIN,
    b3 + 21,
    `${CONNECTED_REWARDS.requirement}, ${CONNECTED_REWARDS.guardrail.toLowerCase()}, and ${CONNECTED_REWARDS.exit.toLowerCase()}. Worth ${fmtUsd(usd(thermostat.unitsPerYear) + CONNECTED_REWARDS.annualCreditUsd)} a year here with the setback. ${CONNECTED_REWARDS.signupLine}.`,
    LEFT_W,
    8,
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NAVY)
  doc.text(`${PROFILE.name} — ${PROFILE.completionPct}% complete`, MARGIN, ry + 3.5)
  body(
    doc,
    MARGIN,
    ry + 8,
    `All ${PROFILE.missing.length} outstanding — ${PROFILE.missing.join(', ').toLowerCase()} — so the ${BILL_RATING.headlineComparisonPct}% gap above is measured against a comparison group built from address data alone.`,
    LEFT_W,
    8,
  )

  // The code, centred in its rail the way the report centres it. The caption
  // clears the QR's quiet zone — `qrBlock` paints that zone in the surface
  // colour, so anything set inside it is painted over rather than beside.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.6)
  doc.setTextColor(...SLATE)
  doc.text(PROFILE.cta, RAIL_X + RAIL_W / 2, b3 + 8, { align: 'center' })
  qrBlock(doc, RAIL_X + RAIL_W / 2 - 13, b3 + 14, 26, PROFILE.qr.target, PROFILE.qr.caption)

  /* -------------------------------- the foot ------------------------------ */
  divider(doc, FOOT_LIMIT - 28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...NAVY)
  doc.text(BILL_META.helpLine, MARGIN, FOOT_LIMIT - 21)
  const helpW = doc.getTextWidth(BILL_META.helpLine) + 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  doc.text(
    `${BILL_META.links.report}  ·  ${BILL_META.links.smartEnergy}`,
    MARGIN + helpW,
    FOOT_LIMIT - 21,
  )

  note(
    doc,
    FOOT_LIMIT - 15,
    `Reported: usage, both peer benchmarks, the year-on-year pair, the rating band, the largest end use, the top tip, the rewards offer and the profile percentage. All else is modelled from those — the efficiency score, the end-use shares, the twelve-month shape, every dollar and the plan. Prepared by ${VENDOR_NAME}.`,
    CONTENT_W,
  )
  pageFoot(doc, FOOT_LIMIT, true)
}

/* ============================== drawing parts ============================== */

const EFFORT = { low: 'Low', medium: 'Medium', high: 'Contractor' } as const

/**
 * The Fair / Good / Great scale, with a caret over the band the report marks.
 *
 * All three segments are coloured, which is the report's own treatment and the
 * opposite of what this used to do — greying the unmarked bands made the scale
 * look like a progress bar that had stalled, when it is a scale.
 */
function bandScale(doc: Doc, x: number, y: number, w: number): number {
  const gap = 1.4
  const segW = (w - gap * (BILL_RATING.bands.length - 1)) / BILL_RATING.bands.length

  BILL_RATING.bands.forEach((band, i) => {
    const sx = x + i * (segW + gap)
    const current = band === BILL_RATING.current

    doc.setFillColor(...BAND_RAMP[i])
    doc.roundedRect(sx, y, segW, 4.4, 1, 1, 'F')

    if (current) {
      // The caret, above the segment — the report's marker, and the only thing
      // that says which band this account is in.
      const cx = sx + segW / 2
      doc.setFillColor(...NAVY)
      doc.triangle(cx - 2.4, y - 3.4, cx + 2.4, y - 3.4, cx, y - 0.6, 'F')
    }

    doc.setFont('helvetica', current ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...(current ? NAVY : INK_MUTED))
    doc.text(band, sx + segW / 2, y + 9.4, { align: 'center' })
  })

  return y + 12
}

/**
 * Twelve months of both series, at rail size — no axis, no grid, no labels.
 *
 * This replaces a full 90mm line chart, and the swap is only honest because of
 * what that chart was for. Its job was one claim: the gap holds in mild months
 * as well as harsh ones, so it is the building and not the weather. That is a
 * statement about two SHAPES staying apart, and two shapes staying apart is
 * exactly what survives at this size. What does not survive is reading a value
 * off it, which is why the endpoints are direct-labelled and the rest is not
 * pretending to be measurable.
 *
 * Scaled from zero, like the full chart was. A sparkline scaled to its own
 * min/max would exaggerate the separation, which is the one thing this must not
 * do when it is being used as evidence.
 */
function sparkline(doc: Doc, x: number, y: number, w: number, h: number): void {
  const peak = Math.max(...HISTORY.map((m) => Math.max(m.you, m.similar)))
  const px = (i: number) => x + (i / (HISTORY.length - 1)) * w
  const py = (v: number) => y + h - (v / peak) * h

  // Fill BETWEEN the two series, not under the top one. The claim this chart
  // exists to make is about the gap, so the gap is what gets the ink — a wash
  // running down to the baseline instead fills most of a zero-based box with
  // colour that means nothing, and the thing the reader is meant to see becomes
  // the one unfilled sliver.
  const deltas: [number, number][] = []
  let prevX = px(0)
  let prevY = py(HISTORY[0].you)
  const step = (nx: number, ny: number) => {
    deltas.push([nx - prevX, ny - prevY])
    prevX = nx
    prevY = ny
  }
  for (let i = 1; i < HISTORY.length; i += 1) step(px(i), py(HISTORY[i].you))
  for (let i = HISTORY.length - 1; i >= 0; i -= 1) step(px(i), py(HISTORY[i].similar))

  doc.setGState(doc.GState({ opacity: 0.16 }))
  doc.setFillColor(...CRITICAL)
  doc.lines(deltas, px(0), py(HISTORY[0].you), [1, 1], 'F', true)
  doc.setGState(doc.GState({ opacity: 1 }))

  doc.setLineWidth(0.5)
  doc.setLineJoin('round')
  doc.setLineCap('round')
  for (const [key, tone] of [
    ['similar', CONTEXT],
    ['you', ACCENT],
  ] as const) {
    doc.setDrawColor(...tone)
    for (let i = 1; i < HISTORY.length; i += 1) {
      doc.line(px(i - 1), py(HISTORY[i - 1][key]), px(i), py(HISTORY[i][key]))
    }
    doc.setFillColor(...tone)
    doc.circle(px(HISTORY.length - 1), py(HISTORY[HISTORY.length - 1][key]), 0.8, 'F')
  }
}

/** The prior-year and current-period columns, set as the report sets them. */
function yearColumns(doc: Doc, x: number, y: number, maxH = 30): number {
  const colW = 20
  const baseline = y + maxH + 6

  ;[
    { label: PERIOD.priorYearLabel, value: YEAR_OVER_YEAR.lastYear, current: false },
    { label: PERIOD.label, value: YEAR_OVER_YEAR.thisYear, current: true },
  ].forEach((col, i) => {
    const cx = x + i * (colW + 8)
    const ch = (col.value / YEAR_OVER_YEAR.lastYear) * maxH

    doc.setFillColor(...(col.current ? ACCENT : RAMP_1))
    doc.roundedRect(cx, baseline - ch, colW, ch, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...(col.current ? NAVY : SLATE))
    doc.text(fmtUnits(col.value), cx + colW / 2, baseline - ch - 2.2, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.6)
    doc.setTextColor(...INK_MUTED)
    const label = doc.splitTextToSize(col.label, colW + 6) as string[]
    label.forEach((line, li) =>
      doc.text(line, cx + colW / 2, baseline + 4 + li * 2.9, { align: 'center' }),
    )
  })

  return baseline + 11
}

/**
 * Two or three figures across the content column — label over value, no panel.
 *
 * The tinted tile this replaces put a box round every number, and a page with
 * four boxed numbers, a grey rail and a chart has three competing containers on
 * it. Bare figures separated by white space read as one row and let the rail
 * keep the emphasis it is there for.
 */
function figureRow(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  items: { label: string; value: string; tone: RGB }[],
): number {
  const colW = w / items.length

  items.forEach((item, i) => {
    const cx = x + i * colW

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...INK_MUTED)
    doc.text(item.label.toUpperCase(), cx, y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...item.tone)
    doc.text(item.value, cx, y + 7.4)
  })

  return y + 9
}

/**
 * The peer comparison as ONE bar — this home's — with the peer levels marked on
 * it and the gaps bracketed beneath.
 *
 * This was three bars from zero, which is the textbook emphasis form and reads
 * perfectly well. It has one flaw in this particular section: the number the
 * section is *about* is a difference, and three bars leave the reader to
 * subtract two lengths to find it. A bullet track draws the difference. The bar
 * is the home's own reading; the group average and the efficient level are marks
 * on it; the run past the average is its own segment in the critical tone; and
 * the brackets under the axis measure both gaps directly.
 *
 * The scale's maximum IS the subject's value, so the bar fills the track. That
 * is deliberate — a track with an empty tail invites the question "what would
 * fill the rest?", and there is no honest answer to it here. Zero is still the
 * origin, so every length and every bracket is proportional.
 *
 * Two fills sharing one mark need to stay apart under CVD: accent against
 * critical measures ΔE 13.5 (protan) on paper and both clear 3:1 against white.
 * They are separated by a surface seam as well as by hue, and each is named in
 * the key beneath — nothing here is carried by colour alone.
 */
function gapTrack(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  options: {
    subject: { label: string; value: number }
    /** Ascending. The LAST mark is where the bar turns critical. */
    marks: { label: string; value: number }[]
    /** Brackets under the bar, narrowest first. Each runs to the subject. */
    gaps: { from: number; label: string; tone: RGB }[]
    /** Names the two fills, in order. */
    fills: [string, string]
  },
): number {
  const { subject, marks, gaps, fills } = options
  const sx = (v: number) => x + (v / subject.value) * w
  const split = marks[marks.length - 1].value

  /** The surface seam between the two fills, and the width of an interior notch. */
  const SEAM = 0.8
  const BAR_H = 12
  const nameY = y + 3
  const valueY = y + 8.6
  const barTop = y + 11
  const barBot = barTop + BAR_H

  /* ------------------------- the readings, above -------------------------- */
  // Name over value, sat directly above the point each one marks. The subject is
  // set larger and in navy because it is the reading; the peer levels are
  // reference, and they take the secondary ink.
  const reading = (
    label: string,
    value: string,
    at: number,
    anchor: 'center' | 'right',
    subjectRow: boolean,
  ) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...INK_MUTED)
    doc.setCharSpace(0.25)
    doc.text(label.toUpperCase(), at, nameY, { align: anchor })
    doc.setCharSpace(0)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(subjectRow ? 14 : 11)
    doc.setTextColor(...(subjectRow ? NAVY : SLATE))
    doc.text(value, at, valueY, { align: anchor })
  }

  // Each reading is centred on the point it names, so the notch in the bar sits
  // directly under its own number.
  for (const m of marks) reading(m.label, fmtUnits(m.value), sx(m.value), 'center', false)
  reading(subject.label, fmtUnits(subject.value), x + w, 'right', true)

  /* -------------------------------- the bar ------------------------------- */
  doc.setFillColor(...ACCENT)
  doc.roundedRect(x, barTop, sx(split) - x - SEAM, BAR_H, 1.2, 1.2, 'F')
  doc.setFillColor(...CRITICAL)
  doc.roundedRect(sx(split), barTop, x + w - sx(split), BAR_H, 1.2, 1.2, 'F')

  // Interior marks are notched out in the surface colour rather than stroked — a
  // rule drawn ON the fill is one more ink weight to read, a gap is not.
  for (const m of marks) {
    if (m.value === split) continue
    doc.setFillColor(...WHITE)
    doc.rect(sx(m.value) - SEAM / 2, barTop, SEAM, BAR_H, 'F')
  }

  // Zero, which for a horizontal bar is the left edge and not a baseline under it.
  doc.setDrawColor(...CONTEXT)
  doc.setLineWidth(0.3)
  doc.line(x, barTop - 1.2, x, barBot + 1.2)

  /* ---------------------------- the gap brackets -------------------------- */
  let gy = barBot + 5
  for (const gap of gaps) {
    const from = sx(gap.from)
    const to = x + w

    doc.setDrawColor(...gap.tone)
    doc.setLineWidth(0.25)
    doc.line(from, gy, to, gy)
    doc.line(from, gy - 1.2, from, gy + 1.2)
    doc.line(to, gy - 1.2, to, gy + 1.2)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.4)
    doc.setTextColor(...gap.tone)
    // Centred under its own bracket, but never past the right edge — the
    // narrowest bracket is shorter than its own label.
    const half = doc.getTextWidth(gap.label) / 2
    doc.text(gap.label, Math.min((from + to) / 2, to - half), gy + 3.8, { align: 'center' })
    gy += 7
  }

  /* -------------------------------- the key ------------------------------- */
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  let kx = x
  ;(
    [
      [fills[0], ACCENT],
      [fills[1], CRITICAL],
    ] as [string, RGB][]
  ).forEach(([label, tone]) => {
    doc.setFillColor(...tone)
    doc.roundedRect(kx, gy - 2, 2.6, 2.6, 0.6, 0.6, 'F')
    doc.setTextColor(...SLATE)
    doc.text(label, kx + 4, gy)
    kx += doc.getTextWidth(label) + 13
  })

  return gy + 2
}

/**
 * The profile QR, captioned as the report captions it.
 *
 * Drawn as filled squares rather than an embedded image: jsPDF would have to be
 * handed a raster, which means a canvas, which means this function could no
 * longer run outside a browser — and `buildBillReportPdf` is deliberately
 * DOM-free so it stays testable.
 *
 * Sized in whole modules. A QR whose module pitch is fractional lands its edges
 * on half-pixels once a printer rasterises it, and the resulting soft boundaries
 * are the single most common reason a printed code will not scan.
 */
function qrBlock(
  doc: Doc,
  x: number,
  y: number,
  size: number,
  value: string,
  caption: string,
): number {
  const matrix = qrMatrix(value)
  const modules = matrix.length
  const pitch = Math.floor((size / modules) * 100) / 100
  const side = pitch * modules
  /** The four-module quiet zone the standard requires. Nothing may print in it. */
  const quiet = pitch * 4

  doc.setFillColor(...WHITE)
  doc.rect(x - quiet, y - quiet, side + quiet * 2, side + quiet * 2, 'F')

  doc.setFillColor(...NAVY)
  for (let r = 0; r < modules; r += 1) {
    for (let c = 0; c < modules; c += 1) {
      if (matrix[r][c]) doc.rect(x + c * pitch, y + r * pitch, pitch, pitch, 'F')
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.4)
  doc.setTextColor(...INK_MUTED)
  doc.setCharSpace(0.3)
  doc.text(caption, x + side / 2, y + side + 4, { align: 'center' })
  doc.setCharSpace(0)

  return y + side + 5.5
}

/**
 * A donut, with its legend beside it.
 *
 * Part-to-whole, which is the one job a ring does better than a bar — "where did
 * the units go" is a question about shares of a single total, and the ring shows
 * the total as an object. Six segments is the documented ceiling and this sits
 * exactly on it.
 *
 * jsPDF has no arc primitive, so each segment is a filled polygon: centre, then
 * points stepped along the outer arc, closed. The hole is punched afterwards
 * with a white circle. Segments are separated by a small angular gap so the
 * surface does the dividing rather than a stroke.
 */
function donut(
  doc: Doc,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  segments: { label: string; value: number; valueLabel: string }[],
  legendX: number,
  legendW: number,
): number {
  const total = segments.reduce((s, x) => s + x.value, 0)
  // Start at twelve o'clock and run clockwise, which is how a ring is read.
  let angle = -Math.PI / 2
  const GAP = 0.02

  segments.forEach((seg, i) => {
    const sweep = (seg.value / total) * Math.PI * 2
    const a0 = angle + GAP / 2
    const a1 = angle + sweep - GAP / 2
    const steps = Math.max(2, Math.ceil((a1 - a0) / 0.06))

    let px = cx
    let py = cy
    const deltas: [number, number][] = []
    for (let s = 0; s <= steps; s += 1) {
      const t = a0 + (a1 - a0) * (s / steps)
      const nx = cx + Math.cos(t) * rOuter
      const ny = cy + Math.sin(t) * rOuter
      deltas.push([nx - px, ny - py])
      px = nx
      py = ny
    }

    doc.setFillColor(...CATEGORICAL[i % CATEGORICAL.length])
    doc.lines(deltas, cx, cy, [1, 1], 'F', true)
    angle += sweep
  })

  // The hole, and the total in it.
  doc.setFillColor(...WHITE)
  doc.circle(cx, cy, rInner, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...NAVY)
  doc.text(fmtUnits(total), cx, cy + 0.6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...INK_MUTED)
  doc.text('units', cx, cy + 4.6, { align: 'center' })

  /* ------------------------------- the legend ----------------------------- */
  // Every segment named and valued here — this is the relief for the three hues
  // that sit under 3:1 on white, and it is why nothing has to be read off the
  // ring by colour alone.
  const rowH = 7.6
  segments.forEach((seg, i) => {
    const ly = cy - (segments.length * rowH) / 2 + i * rowH + 3.6

    doc.setFillColor(...CATEGORICAL[i % CATEGORICAL.length])
    doc.roundedRect(legendX, ly - 2.4, 3, 3, 0.7, 0.7, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...SLATE)
    doc.text(seg.label, legendX + 5.2, ly)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(seg.valueLabel, legendX + legendW, ly, { align: 'right' })
  })

  return Math.max(cy + rOuter, cy + (segments.length * rowH) / 2) + 4
}

/**
 * The plan as a compact table: what each step costs and asks of you.
 *
 * Deliberately a table and not a second chart. The waterfall above already
 * encodes the savings; upfront cost and effort are two more dimensions, and
 * stacking them into the same picture would make it unreadable.
 */
function actionTable(doc: Doc, y: number, actions: typeof SAVING_ACTIONS, w = CONTENT_W): number {
  const rowH = 6.2
  const size = 7.6

  // The action column is MEASURED, not guessed. Two drafts of this table put it
  // at a fraction of the width — 52%, then 55% — and both times the longest
  // title ("Join Connected Rewards with a smart thermostat", set bold because it
  // is one of the report's own) ran into the savings figure beside it. Measuring
  // the widest title, in the weight it is actually set in, cannot drift when the
  // measures change. The clamp keeps the three numeric columns usable if a title
  // ever turns out to be enormous.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  const widest = Math.max(...actions.map((a) => doc.getTextWidth(a.title)))
  const actionW = Math.min(Math.max(widest + 4, w * 0.5), w * 0.64)

  const rest = w - actionW
  const cols = [MARGIN, MARGIN + actionW, MARGIN + actionW + rest * 0.38, MARGIN + actionW + rest * 0.72]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...INK_MUTED)
  doc.setCharSpace(0.3)
  doc.text('ACTION', cols[0], y)
  doc.text('SAVES / YR', cols[1], y)
  doc.text('UPFRONT', cols[2], y)
  doc.text('EFFORT', cols[3], y)
  doc.setCharSpace(0)

  doc.setDrawColor(...GRID)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, y + 1.8, MARGIN + w, y + 1.8)

  actions.forEach((a, i) => {
    const ry = y + 7.4 + i * rowH
    if (i % 2 === 0) {
      doc.setFillColor(...STRIPE)
      doc.roundedRect(MARGIN - 1.5, ry - 4, w + 3, rowH - 0.6, 0.8, 0.8, 'F')
    }

    doc.setFont('helvetica', a.fromBill ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...NAVY)
    doc.text(a.title, cols[0], ry)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOOD)
    doc.text(fmtUsd(usd(a.unitsPerYear) + a.creditUsdPerYear), cols[1], ry)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.text(a.upfrontUsd === 0 ? 'Free' : fmtUsd(a.upfrontUsd), cols[2], ry)
    doc.text(EFFORT[a.effort], cols[3], ry)
  })

  const end = y + 7.4 + actions.length * rowH
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.8)
  doc.setTextColor(...INK_MUTED)
  doc.text("Bold rows are the report's own recommendations.", MARGIN, end)

  return end + 1
}

/* No document images are embedded — the report describes the account in text.
 * The only asset this document loads is the ACSE lockup for the masthead, via
 * `loadLogo()` in `pdfTheme.ts`. */
