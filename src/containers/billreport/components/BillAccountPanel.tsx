/**
 * The left column: the account, and every figure the utility actually reports.
 *
 * This panel and `BillInsightsPanel` on the right split along the same line the
 * whole screen is built on — REPORTED here, MODELED there. Nothing on this side
 * is computed by us: if a number appears in this column, a customer can find it
 * on their statement. That makes the layout itself carry the distinction, so a
 * viewer picks it up from where a figure sits before reading a single chip.
 *
 * There is deliberately no document, no page, no upload and no thumbnail here. A
 * utility already holds these numbers in its billing system; what is worth
 * demonstrating is the analysis, not an extraction step.
 */

import { CalendarRange, Gift, Lightbulb, MapPin, Receipt, User, Users, X } from 'lucide-react'
import { OriginChip } from '@/containers/billreport/components/CardShell'
import ChartLegend from '@/containers/billreport/components/charts/ChartLegend'
import ChartTooltip from '@/containers/billreport/components/charts/ChartTooltip'
import { useChartTooltip } from '@/containers/billreport/components/charts/useChartTooltip'
import { USE_VS_EXCESS } from '@/containers/billreport/components/charts/legendKeys'
import GapTrack from '@/containers/billreport/components/charts/GapTrack'
import Sparkline from '@/containers/billreport/components/charts/Sparkline'
import {
  BILL_META,
  BILL_RATING,
  BILL_TIP,
  CONNECTED_REWARDS,
  HISTORY,
  PEER_USAGE,
  PERIOD,
  PROFILE,
  REPORT,
  YEAR_OVER_YEAR,
  fmtSignedPct,
  fmtUnits,
} from '@/data/billReport'
import { cn } from '@/utils/cn'

const CARD =
  'rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10'

export default function BillAccountPanel({ className }: { className?: string }) {
  const { tip, onPointer, onFocusMark, hide } = useChartTooltip()

  return (
    // `viz-root` on the panel, not just on the individual charts. The chart
    // primitives each declare it, but marks hand-rolled inline here do not —
    // and a `var(--viz-accent)` outside the scope resolves to nothing and paints
    // an invisible bar, which is exactly what happened to the year-on-year
    // columns below. Scoping the container makes that class of bug impossible.
    <div className={cn('viz-root flex h-full flex-col', className)}>
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-navy text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
          <Receipt className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-navy dark:text-slate-100">
            Account
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {BILL_META.provider} · {BILL_META.documentType}
          </p>
        </div>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Identity */}
        <div className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-brand-navy dark:text-slate-100">Customer</p>
            <OriginChip origin="bill" />
          </div>
          <div className="space-y-3">
            <Row icon={User} label="Name" value={BILL_META.customerName} />
            <Row icon={Receipt} label="Account number" value={`#${BILL_META.accountNumber}`} />
            <Row icon={MapPin} label="Service address" value={BILL_META.serviceAddress} />
            <Row
              icon={CalendarRange}
              label="Billing period"
              value={`${PERIOD.label} · ${PERIOD.days} days`}
            />
          </div>
        </div>

        {/* Neighbourhood comparison — the headline the report is built around,
            so it gets the chart rather than a grid of numbers. Every figure here
            is reported: the three usage totals, the headline gap, the rating band. */}
        <div className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-navy dark:text-slate-100">
              <Users className="h-4 w-4 shrink-0 text-brand-cyan" />
              Neighbourhood
            </p>
            <OriginChip origin="bill" />
          </div>

          {/* The headline, stated once and loudly. */}
          <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-600/15 dark:bg-brand-red/10 dark:ring-brand-red/30">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-bold leading-none text-red-700 dark:text-red-400">
                {fmtSignedPct(REPORT.vsSimilar.pct)}
              </span>
              <span className="text-[11.5px] font-semibold text-red-700 dark:text-red-400">
                vs similar homes
              </span>
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
              {fmtUnits(REPORT.vsSimilar.units)} units more than the group average this period, and{' '}
              {fmtUnits(REPORT.vsEfficient.units)} more than the efficient homes.
            </p>
            {/* The report marks this sentence with a ✗ — it is a failed check,
                not an observation. Dropping the mark and keeping the words is
                how a rendition quietly softens the source. */}
            {BILL_RATING.verdictIsAdverse && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-red-700 dark:text-red-400">
                <X className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
                <span>{BILL_RATING.verdict}</span>
              </p>
            )}
          </div>

          {/* The comparison the report leads with, in the same form the thread
              card and the PDF use. Compact, and with the labels shortened to
              match — at 340px the full ones would run into each other. */}
          <div className="mt-3.5">
            <GapTrack
              compact
              subject={{ label: 'You', value: PEER_USAGE.you }}
              marks={[
                {
                  id: 'efficient',
                  label: 'Efficient',
                  value: PEER_USAGE.efficient,
                  tooltip: 'The least-using 20% of the group',
                },
                {
                  id: 'similar',
                  label: 'Average',
                  value: PEER_USAGE.similar,
                  tooltip: 'The group average',
                },
              ]}
              gaps={[
                {
                  id: 'vs-similar',
                  from: PEER_USAGE.similar,
                  label: `+${fmtUnits(REPORT.vsSimilar.units)} vs average`,
                  tone: 'critical',
                },
                {
                  id: 'vs-efficient',
                  from: PEER_USAGE.efficient,
                  label: `+${fmtUnits(REPORT.vsEfficient.units)} vs efficient`,
                },
              ]}
              fills={['Up to the group average', 'Above the group average']}
            />
          </div>

          <ChartLegend items={USE_VS_EXCESS} className="mt-3" />

          {/* The report's own Fair / Good / Great meter. */}
          <BandStrip />

          <p className="mt-3 text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500">
            {BILL_META.efficientDefinition}
          </p>
        </div>

        {/* The rest of the reported figures */}
        <div className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-navy dark:text-slate-100">
              <CalendarRange className="h-4 w-4 shrink-0 text-brand-cyan" />
              This period
            </p>
            <OriginChip origin="bill" />
          </div>

          {/* Last year against this year, as the report draws it. */}
          <div className="flex items-end gap-3">
            {/* 76px, not 62: the value caption, a 40px bar and the month label
                come to 75, and the old box clipped the top off the stack. */}
            <div className="flex items-end gap-2" style={{ height: 76 }}>
              {[
                { label: PERIOD.priorYearShort, value: YEAR_OVER_YEAR.lastYear, current: false },
                { label: PERIOD.short, value: YEAR_OVER_YEAR.thisYear, current: true },
              ].map((col) => (
                <div
                  key={col.label}
                  className="group flex w-[52px] flex-col items-center justify-end rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                  tabIndex={0}
                  onPointerMove={(e) =>
                    onPointer(e, {
                      rows: [
                        {
                          value: `${fmtUnits(col.value)} units`,
                          label: col.label,
                          color: col.current ? 'var(--viz-accent)' : 'var(--viz-ramp-1)',
                        },
                      ],
                    })
                  }
                  onPointerLeave={hide}
                  onFocus={(e) =>
                    onFocusMark(e, {
                      rows: [
                        {
                          value: `${fmtUnits(col.value)} units`,
                          label: col.label,
                          color: col.current ? 'var(--viz-accent)' : 'var(--viz-ramp-1)',
                        },
                      ],
                    })
                  }
                  onBlur={hide}
                >
                  <span
                    className={cn(
                      'mb-1 text-[11px] tabular-nums',
                      col.current
                        ? 'font-bold text-brand-navy dark:text-slate-100'
                        : 'font-semibold text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {fmtUnits(col.value)}
                  </span>
                  <div
                    className="viz-grow-y w-full rounded-t-[4px] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                    style={{
                      // Zero-based, so the two bars come out nearly equal. That
                      // is the truth — the readings are 3% apart — and the -2%
                      // beside them carries the magnitude. Starting the scale at
                      // a floor would make the change look dramatic, which is
                      // the oldest way a chart lies.
                      height: Math.round((col.value / YEAR_OVER_YEAR.lastYear) * 40),
                      background: col.current ? 'var(--viz-accent)' : 'var(--viz-ramp-1)',
                    }}
                  />
                  <span className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {col.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="min-w-0 flex-1 rounded-xl bg-emerald-50 p-2.5 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/25">
              <p className="text-[20px] font-bold leading-none text-emerald-700 dark:text-emerald-400">
                {YEAR_OVER_YEAR.statedChangePct}%
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-slate-600 dark:text-slate-300">
                {fmtUnits(Math.abs(REPORT.yoy.units))} units less than last year
              </p>
            </div>
          </div>

          <ChartLegend
            items={[
              { label: PERIOD.priorYearShort, color: 'var(--viz-ramp-1)' },
              { label: PERIOD.short, color: 'var(--viz-accent)' },
            ]}
            className="mt-3"
          />

          {/* The year between those two readings.
              Two reported points cannot make a line — a segment between them
              would only restate the -2% and imply readings we do not have. The
              twelve-month profile IS worth drawing, and it is modeled, so it
              carries its own chip rather than borrowing the card's. */}
          <div className="mt-3.5 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                The year in between
              </p>
              <OriginChip origin="modeled" />
            </div>
            <ChartLegend
              items={[{ label: 'Your monthly usage', color: 'var(--viz-accent)', shape: 'line' }]}
              className="mt-2"
            />
            <Sparkline
              points={HISTORY.map((m) => m.you)}
              pointLabels={HISTORY.map((m) => `${m.label} ${m.year}`)}
              formatValue={(v) => `${fmtUnits(v)} units`}
              seriesLabel="your usage"
              height={38}
              label={`Modeled monthly usage from ${HISTORY[0].label} ${HISTORY[0].year} to ${HISTORY[HISTORY.length - 1].label} ${HISTORY[HISTORY.length - 1].year}`}
              className="mt-2"
            />
            <div className="mt-1 flex justify-between text-[9.5px] text-slate-400 dark:text-slate-500">
              <span>
                {HISTORY[0].label} {HISTORY[0].year}
              </span>
              <span>
                Peak {fmtUnits(Math.max(...HISTORY.map((m) => m.you)))} in January
              </span>
              <span>
                {HISTORY[HISTORY.length - 1].label} {HISTORY[HISTORY.length - 1].year}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <Fact label="Largest end use" value={BILL_TIP.highestEndUse} />
          </div>
        </div>

        {/* What the report itself offers */}
        <div className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-brand-navy dark:text-slate-100">
              On your account
            </p>
            <OriginChip origin="bill" />
          </div>

          <div className="space-y-2.5">
            <div className="rounded-lg bg-brand-cyan/[0.06] p-2.5 ring-1 ring-brand-cyan/20 dark:bg-brand-cyan/10 dark:ring-brand-cyan/25">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-navy dark:text-slate-100">
                <Lightbulb className="h-3 w-3 shrink-0 text-brand-cyan" />
                {BILL_TIP.title}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                The report's own top tip.
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-2.5 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/25">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-navy dark:text-slate-100">
                <Gift className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {CONNECTED_REWARDS.name}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                Up to ${CONNECTED_REWARDS.annualCreditUsd} a year in bill credits, not yet claimed.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-2.5 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:ring-amber-400/25">
              <p className="text-[11.5px] font-semibold text-brand-navy dark:text-slate-100">
                {PROFILE.name} · {PROFILE.completionPct}%
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                {PROFILE.missing.length} questions outstanding, so the comparison group is rougher
                than it needs to be.
              </p>
            </div>
          </div>
        </div>

        <p className="px-1 pb-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
          Everything in this column is reported on the account. The analysis, and every figure marked
          "Modeled", is on the right.
        </p>
        <ChartTooltip tip={tip} />
      </div>
    </div>
  )
}

/**
 * The report's own Fair / Good / Great meter.
 *
 * It marks a BAND, not a position — the report gives a band and nothing finer,
 * so this fills the current segment and leaves the others as track. Putting a
 * marker somewhere inside "Fair" would invent a precision the source does not
 * have. (The modeled 0–100 score, which does have a position, lives in the
 * insights column on the other side.)
 */
function BandStrip() {
  return (
    <div className="viz-root mt-4">
      <div className="flex gap-0.5">
        {BILL_RATING.bands.map((band, i) => {
          const current = band === BILL_RATING.current
          return (
            <div key={band} className="flex-1">
              <div
                className="h-2 rounded-[2px]"
                style={{
                  background: current
                    ? 'var(--viz-warning)'
                    : `var(--viz-ramp-${i + 1})`,
                  opacity: current ? 1 : 0.28,
                }}
              />
              <p
                className={cn(
                  'mt-1.5 text-center text-[10px]',
                  current
                    ? 'font-bold text-amber-700 dark:text-amber-300'
                    : 'font-medium text-slate-400 dark:text-slate-500',
                )}
              >
                {band}
              </p>
            </div>
          )
        })}
      </div>
      {/* The report's own gloss on what the meter is for. Kept verbatim: it is
          the one line that tells a reader the band is a comparison and not a
          grade the utility awarded them. */}
      <p className="mt-2 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
        {BILL_RATING.contextNote}
      </p>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="break-words text-[13px] font-medium text-slate-800 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  )
}


function Fact({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-white/[0.03]">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          'text-[12.5px] font-semibold',
          good ? 'text-emerald-700 dark:text-emerald-400' : 'text-brand-navy dark:text-slate-100',
        )}
      >
        {value}
      </p>
    </div>
  )
}
