/**
 * The right column: everything the analysis DERIVED.
 *
 * Mirror image of `BillAccountPanel`. That panel holds only figures the utility
 * reports; this one holds only figures we computed — the score, the gap in
 * money, the savings plan, the forecast. The screen's left/right axis therefore
 * *is* the reported/modeled boundary, which is a stronger signal than any label
 * because a viewer absorbs it from position alone.
 *
 * The recommendations are the point of the column, not decoration: each one's
 * action posts a real question into the conversation rather than opening a
 * dead-end screen, so an insight can be acted on without retyping it. `busy`
 * mirrors the engine's `playing`, so a card cannot queue a turn on top of one
 * already in flight.
 *
 * Two presentations, both hosted by `../index.tsx`: the persistent xl+ column,
 * and the below-xl overlay (which passes `onClose` to gain a dismiss control).
 */

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Gauge,
  Gift,
  Lightbulb,
  PlugZap,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import ChartLegend from '@/containers/billreport/components/charts/ChartLegend'
import { LARGEST_VS_REST } from '@/containers/billreport/components/charts/legendKeys'
import EmphasisBars from '@/containers/billreport/components/charts/EmphasisBars'
import ScoreMeter from '@/containers/billreport/components/charts/ScoreMeter'
import {
  BILL_META,
  CONNECTED_REWARDS,
  END_USES,
  PERIOD,
  REPORT,
  fmtSignedPct,
  fmtUnits,
  fmtUsd,
} from '@/data/billReport'
import { cn } from '@/utils/cn'

const CARD =
  'rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10'

type Tone = 'critical' | 'positive' | 'neutral'

const TONE_SURFACE: Record<Tone, string> = {
  critical: 'bg-red-50 ring-red-600/15 dark:bg-brand-red/10 dark:ring-brand-red/30',
  positive: 'bg-emerald-50 ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/25',
  neutral: 'bg-brand-cyan/[0.06] ring-brand-cyan/20 dark:bg-brand-cyan/10 dark:ring-brand-cyan/25',
}

const TONE_CHIP: Record<Tone, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-brand-red/15 dark:text-red-400',
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  neutral: 'bg-brand-cyan/15 text-[#0f5b7c] dark:bg-brand-cyan/20 dark:text-brand-cyan',
}

/** Solid enough to read as the card's primary action. */
const TONE_ACTION: Record<Tone, string> = {
  critical: 'bg-brand-red text-white hover:bg-red-700 focus-visible:ring-brand-red dark:hover:bg-red-500',
  positive:
    'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400',
  neutral:
    'bg-brand-navy text-white hover:bg-brand-navy/90 focus-visible:ring-brand-cyan dark:bg-brand-cyan dark:text-brand-navy dark:hover:bg-brand-cyan/90',
}

/**
 * The three things worth doing something about, each wired to the follow-up
 * that answers it. Ids match `FOLLOW_UPS` in `../script.ts`.
 */
const RECOMMENDATIONS: {
  id: string
  tone: Tone
  Icon: typeof TriangleAlert
  badge: string
  title: string
  body: string
  cta: string
  /** The follow-up posted into the conversation. */
  ask: string
}[] = [
  {
    id: 'gap',
    tone: 'critical',
    Icon: TriangleAlert,
    badge: 'Costing you',
    title: `${fmtUsd(REPORT.annual.excessCost)} a year above your neighbours`,
    body: `A gap of ${fmtSignedPct(REPORT.vsSimilar.pct)} that holds in every season — which points at the building, not the weather.`,
    cta: 'Why is it so high?',
    ask: 'why',
  },
  {
    id: 'plan',
    tone: 'positive',
    Icon: Lightbulb,
    badge: 'Recoverable',
    title: `${fmtUsd(REPORT.plan.savingsUsdPerYear)} a year, ${REPORT.plan.paybackMonths} months to pay back`,
    body: `Six measures sized against this home. The ${REPORT.quickWins.count} low-effort ones alone reach a score of ${REPORT.quickWins.projectedScore}.`,
    cta: 'Show me the plan',
    ask: 'plan',
  },
  {
    id: 'rewards',
    tone: 'neutral',
    Icon: Gift,
    badge: 'Unclaimed',
    title: `${fmtUsd(CONNECTED_REWARDS.annualCreditUsd)} a year already on the table`,
    body: `${CONNECTED_REWARDS.name} is offered on this account and has not been taken up.`,
    cta: 'What can I claim?',
    ask: 'rebates',
  },
]

export interface BillInsightsPanelProps {
  /** Post a follow-up into the conversation, by its `FOLLOW_UPS` id. */
  onAsk: (followUpId: string) => void
  /** True while a turn is in flight — actions lock rather than queue. */
  busy: boolean
  /** Supplied by the overlay presentation only; the inline column has no close. */
  onClose?: () => void
}

export default function BillInsightsPanel({ onAsk, busy, onClose }: BillInsightsPanelProps) {
  const topUses = END_USES.slice(0, 4)

  return (
    // Scoped for the same reason as the account panel: any mark added inline
    // here later would otherwise read the chart palette from nowhere.
    <div className="viz-root flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-cyan to-brand-navy text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-navy dark:text-slate-100">
            AI insights
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            Modeled for #{BILL_META.accountNumber} · {PERIOD.short}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close insights"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 space-y-3.5 overflow-y-auto p-4">
        {/* Score */}
        <Reveal step={0}>
          <div className={CARD}>
            <Heading icon={Gauge}>Efficiency score</Heading>
            <div className="mt-3">
              <ScoreMeter
                score={REPORT.score}
                band={REPORT.band}
                deltaPts={REPORT.scoreDeltaPts}
                projected={{ score: REPORT.plan.projectedScore, band: REPORT.plan.projectedBand }}
              />
            </div>
          </div>
        </Reveal>

        {/* The money, four ways */}
        <Reveal step={1}>
          <div className={CARD}>
            <Heading icon={BadgeDollarSign}>What it means in money</Heading>
            {/* A plain 2-column grid, not the thread's `StatRow`: that one goes
                four-across at the md breakpoint, which is a VIEWPORT query and
                would fire inside this 340px column on any desktop. */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Tile
                label="A year of the gap"
                value={fmtUsd(REPORT.annual.excessCost)}
                tone="critical"
              />
              <Tile
                label="Recoverable"
                value={`${fmtUsd(REPORT.plan.savingsUsdPerYear)}/yr`}
                tone="positive"
              />
              <Tile label="Payback" value={`${REPORT.plan.paybackMonths} mo`} tone="positive" />
              <Tile
                label="Score after"
                value={`${REPORT.plan.projectedScore}`}
                tone="positive"
                hint={REPORT.plan.projectedBand}
              />
            </div>
          </div>
        </Reveal>

        {/* Where it goes */}
        <Reveal step={2}>
          <div className={CARD}>
            <Heading icon={PlugZap}>Where it goes</Heading>
            <ChartLegend items={LARGEST_VS_REST} className="mt-2.5" />
            <div className="mt-2">
              <EmphasisBars
                thickness={10}
                // Narrower than the thread's default: this column is 340px, and
                // the 80px gutter there would leave almost no bar to read.
                gutter={44}
                data={topUses.map((e) => ({
                  id: e.id,
                  label: e.label,
                  value: e.units,
                  valueLabel: `${e.sharePct}%`,
                  emphasis: e.isTop,
                  tooltip: `${fmtUnits(e.units)} units this period`,
                }))}
              />
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500">
              Top four of six. Appliances lead, which is what the report's smart-meter line says.
            </p>
          </div>
        </Reveal>

        {/* Act on this */}
        <Reveal step={3}>
          <div className={CARD}>
            <Heading icon={Lightbulb}>Act on this</Heading>
            <div className="mt-3 space-y-2.5">
              {RECOMMENDATIONS.map((rec) => (
                <div key={rec.id} className={cn('rounded-xl p-3 ring-1', TONE_SURFACE[rec.tone])}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-md',
                        TONE_CHIP[rec.tone],
                      )}
                    >
                      <rec.Icon className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide',
                        rec.tone === 'critical' && 'text-red-700 dark:text-red-400',
                        rec.tone === 'positive' && 'text-emerald-700 dark:text-emerald-400',
                        rec.tone === 'neutral' && 'text-[#0f5b7c] dark:text-brand-cyan',
                      )}
                    >
                      {rec.badge}
                    </span>
                  </div>

                  <p className="mt-2 text-[13px] font-semibold leading-snug text-brand-navy dark:text-slate-100">
                    {rec.title}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {rec.body}
                  </p>

                  <button
                    type="button"
                    onClick={() => onAsk(rec.ask)}
                    disabled={busy}
                    className={cn(
                      'mt-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-brand-navydeep',
                      TONE_ACTION[rec.tone],
                    )}
                  >
                    {rec.cta}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Next period */}
        <Reveal step={4}>
          <div className={CARD}>
            <Heading icon={CalendarClock}>Next period</Heading>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {REPORT.forecast.month}
                </p>
                <p className="mt-1 text-2xl font-bold leading-none text-brand-navy dark:text-slate-100">
                  {fmtUsd(REPORT.forecast.cost, 2)}
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {fmtUnits(REPORT.forecast.units)} units projected
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500">
              {REPORT.forecast.basis}.
            </p>
          </div>
        </Reveal>

        <p className="px-1 pb-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
          Every figure in this column is modeled from the reported usage, not billed. The reported
          figures themselves are in the left-hand column.
        </p>
      </div>
    </div>
  )
}

/** The below-xl presentation: the same panel, over a scrim. */
export function BillInsightsOverlay(props: BillInsightsPanelProps & { onClose: () => void }) {
  const { onClose } = props

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/30 motion-safe:animate-fade-in dark:bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI insights"
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200 motion-safe:animate-rise-in',
          'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[380px] sm:max-w-[90%] sm:rounded-none sm:rounded-l-2xl',
          'dark:bg-[#0c1c2c] dark:ring-white/10',
        )}
      >
        <span
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-300 sm:hidden dark:bg-white/20"
        />
        <div className="min-h-0 flex-1">
          <BillInsightsPanel {...props} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Heading({ icon: Icon, children }: { icon: typeof Gauge; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-brand-cyan" />
      <p className="text-sm font-medium text-brand-navy dark:text-slate-100">{children}</p>
    </div>
  )
}

function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone: Tone
  hint?: string
}) {
  return (
    <div className={cn('rounded-xl p-2.5 ring-1', TONE_SURFACE[tone])}>
      <p
        className={cn(
          'text-[19px] font-bold leading-none',
          tone === 'critical' && 'text-red-700 dark:text-red-400',
          tone === 'positive' && 'text-emerald-700 dark:text-emerald-400',
          tone === 'neutral' && 'text-brand-navy dark:text-slate-100',
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10.5px] font-medium leading-tight text-slate-500 dark:text-slate-400">
        {label}
        {hint && <span className="block text-[10px] opacity-80">{hint}</span>}
      </p>
    </div>
  )
}

/** Staggered entrance, so the column reads as assembled rather than appearing whole. */
function Reveal({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div className="motion-safe:animate-row-reveal" style={{ animationDelay: `${step * 70}ms` }}>
      {children}
    </div>
  )
}
