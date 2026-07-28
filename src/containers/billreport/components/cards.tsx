/**
 * Every card the analysis can put in the thread, keyed by id.
 *
 * The thread script (`../script.ts`) names cards by id and knows nothing about
 * their contents; this file knows nothing about when it is shown. That split is
 * what lets a follow-up question re-show a card the opening analysis already
 * used without either side special-casing the other.
 *
 * All figures come from `@/data/billReport` — none are typed in here, so the
 * screen and the PDF can never quote different numbers.
 */

import {
  BadgeDollarSign,
  CalendarRange,
  ClipboardList,
  Gauge,
  Gift,
  Leaf,
  ListChecks,
  PlugZap,
  FileSearch,
  ShieldQuestion,
  TrendingDown,
  Users,
} from 'lucide-react'
import CardShell, { MiniStat, OriginChip } from '@/containers/billreport/components/CardShell'
import QrCode from '@/containers/billreport/components/QrCode'
import ChartFrame from '@/containers/billreport/components/charts/ChartFrame'
import {
  LARGEST_VS_REST,
  USE_VS_EXCESS,
  YOU_VS_GROUP,
} from '@/containers/billreport/components/charts/legendKeys'
import CompareColumns from '@/containers/billreport/components/charts/CompareColumns'
import EmphasisBars from '@/containers/billreport/components/charts/EmphasisBars'
import GapTrack from '@/containers/billreport/components/charts/GapTrack'
import ScoreMeter from '@/containers/billreport/components/charts/ScoreMeter'
import { StatRow, StatTile } from '@/containers/billreport/components/charts/StatTile'
import TrendChart from '@/containers/billreport/components/charts/TrendChart'
import {
  ASSUMPTIONS,
  BILL_META,
  BILL_RATING,
  BILL_TIP,
  CONNECTED_REWARDS,
  END_USES,
  EXTRACTED_FIELDS,
  FIELD_GROUPS,
  HISTORY,
  PEER_USAGE,
  PERIOD,
  PROFILE,
  PROVENANCE,
  REPORT,
  SAVING_ACTIONS,
  TOP_TWO_END_USES,
  YEAR_OVER_YEAR,
  actionById,
  fmtSignedPct,
  fmtUnits,
  fmtUsd,
  usd,
} from '@/data/billReport'
import { cn } from '@/utils/cn'

/* ------------------------------- 1. Headline ------------------------------ */

export function HeadlineCard() {
  return (
    <CardShell
      icon={Gauge}
      title="Where this home stands"
      kicker={`${PERIOD.label} · account #${BILL_META.accountNumber}`}
      origin="mixed"
      footer={
        <>
          The score is anchored on the report's own two benchmarks — efficient homes score 100,
          the group average scores 70 — which is why it lands in{' '}
          <strong className="font-semibold text-brand-navy dark:text-slate-100">Fair</strong>, the
          same band the report's own meter marks.
        </>
      }
    >
      <StatRow className="mb-5">
        <StatTile
          label="Efficiency score"
          value={`${REPORT.score}`}
          tone="warning"
          delta={{ text: `+${REPORT.scoreDeltaPts} pts vs last year`, good: true }}
          hint={`${REPORT.band} band`}
        />
        <StatTile
          label="Vs similar homes"
          value={fmtSignedPct(REPORT.vsSimilar.pct)}
          tone="critical"
          hint={`${fmtUnits(REPORT.vsSimilar.units)} units more this period`}
        />
        <StatTile
          label="A year of that gap"
          value={fmtUsd(REPORT.annual.excessCost)}
          tone="critical"
          hint="Modeled at the blended rate"
        />
        <StatTile
          label="Group position"
          value={`Top ${100 - REPORT.percentile}%`}
          tone="warning"
          hint={`Uses more than about ${REPORT.percentile}% of similar homes`}
        />
      </StatRow>

      <ScoreMeter
        score={REPORT.score}
        band={REPORT.band}
        deltaPts={REPORT.scoreDeltaPts}
        projected={{ score: REPORT.plan.projectedScore, band: REPORT.plan.projectedBand }}
      />
    </CardShell>
  )
}

/* ----------------------------- 2. Peer comparison ------------------------- */

export function PeerCard() {
  return (
    <CardShell
      icon={Users}
      title="Against homes like yours"
      kicker="The comparison the report leads with, exactly as reported"
      origin="bill"
      footer={
        <>
          The wider bracket is the one worth watching: it is nearly double the gap to the group
          average, costs{' '}
          <strong className="font-semibold text-brand-navy dark:text-slate-100">
            {fmtUsd(REPORT.annual.excessVsEfficientCost)} a year
          </strong>{' '}
          at the blended rate, and it is the gap the savings plan is sized against.
        </>
      }
    >
      <ChartFrame
        title={`Your use against homes like yours — ${PERIOD.label}`}
        subtitle="Combined electricity and natural gas, in units"
        series={USE_VS_EXCESS}
        table={{
          columns: ['Group', 'Units', 'Vs you'],
          rows: [
            ['Efficient homes', PEER_USAGE.efficient, `−${fmtUnits(REPORT.vsEfficient.units)}`],
            ['Similar homes', PEER_USAGE.similar, `−${fmtUnits(REPORT.vsSimilar.units)}`],
            ['You', PEER_USAGE.you, '—'],
          ],
          highlightRow: 2,
        }}
        footnote={BILL_META.efficientDefinition}
      >
        <GapTrack
          subject={{ label: 'You', value: PEER_USAGE.you }}
          marks={[
            {
              id: 'efficient',
              label: 'Efficient homes',
              value: PEER_USAGE.efficient,
              tooltip: 'The least-using 20% of your comparison group',
            },
            {
              id: 'similar',
              label: 'Similar homes',
              value: PEER_USAGE.similar,
              tooltip: 'The group average',
            },
          ]}
          gaps={[
            {
              id: 'vs-similar',
              from: PEER_USAGE.similar,
              label: `+${fmtUnits(REPORT.vsSimilar.units)} over the average · ${fmtSignedPct(REPORT.vsSimilar.pct)}`,
              tone: 'critical',
            },
            {
              id: 'vs-efficient',
              from: PEER_USAGE.efficient,
              label: `+${fmtUnits(REPORT.vsEfficient.units)} over efficient homes · ${fmtSignedPct(REPORT.vsEfficient.pct)}`,
            },
          ]}
          fills={['Up to the group average', 'Above the group average']}
        />
      </ChartFrame>
    </CardShell>
  )
}

/* ------------------------------ 3. Year on year --------------------------- */

export function YearOverYearCard() {
  return (
    <CardShell
      icon={TrendingDown}
      title="Against the same period last year"
      kicker="The one piece of genuinely good news on the report"
      origin="bill"
    >
      <ChartFrame
        title="Your energy use compared to last year"
        subtitle="Same 29-day window, one year apart"
        series={[
          { label: PERIOD.priorYearShort, color: 'var(--viz-ramp-1)' },
          { label: PERIOD.short, color: 'var(--viz-accent)' },
        ]}
        table={{
          columns: ['Period', 'Units', 'Est. cost'],
          rows: [
            [PERIOD.priorYearLabel, YEAR_OVER_YEAR.lastYear, fmtUsd(usd(YEAR_OVER_YEAR.lastYear), 2)],
            [PERIOD.label, YEAR_OVER_YEAR.thisYear, fmtUsd(usd(YEAR_OVER_YEAR.thisYear), 2)],
          ],
          highlightRow: 1,
        }}
        footnote={BILL_META.unitDefinition}
      >
        <CompareColumns
          data={[
            { id: 'last', label: PERIOD.priorYearLabel, value: YEAR_OVER_YEAR.lastYear },
            { id: 'this', label: PERIOD.label, value: YEAR_OVER_YEAR.thisYear, current: true },
          ]}
          callout={
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/25">
              <p className="text-[26px] font-bold leading-none text-emerald-700 dark:text-emerald-400">
                {YEAR_OVER_YEAR.statedChangePct}%
              </p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-slate-600 dark:text-slate-300">
                {fmtUnits(Math.abs(REPORT.yoy.units))} units less than last June — about{' '}
                {fmtUsd(REPORT.yoy.costSaved, 2)} kept.
              </p>
            </div>
          }
        />
      </ChartFrame>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
        <span className="font-semibold text-brand-navy dark:text-slate-100">
          The report's explanation:
        </span>{' '}
        {YEAR_OVER_YEAR.billExplanation}
      </p>

      <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:ring-amber-400/25">
        <p className="text-[12px] leading-relaxed text-amber-900 dark:text-amber-100">
          <span className="font-semibold">Worth saying plainly:</span> a 2% year-on-year improvement
          against a {REPORT.vsSimilar.pct}% gap to the neighbours means this house is not closing the distance. At this
          rate it would take well over a decade to reach the group average.
        </p>
      </div>
    </CardShell>
  )
}

/* -------------------------------- 4. Trend -------------------------------- */

export function TrendCard() {
  return (
    <CardShell
      icon={CalendarRange}
      title="Twelve months, side by side"
      kicker="One reported period anchors a modeled seasonal profile"
      origin="modeled"
      footer={
        <>
          The gap never closes — not in a mild month, not in a harsh one. A gap that survives every
          season is structural: it is the building and its equipment, not the weather or a busy
          week.
        </>
      }
    >
      <ChartFrame
        title="Monthly use — this home against the group"
        subtitle="Only Jun 2026 is reported; the rest is a modeled seasonal profile"
        series={[
          { label: 'You', color: 'var(--viz-accent)', shape: 'line' },
          { label: 'Similar homes', color: 'var(--viz-context)', shape: 'line' },
        ]}
        table={{
          columns: ['Month', 'You', 'Similar', 'Gap'],
          rows: HISTORY.map((m) => [
            `${m.label} ${m.year}${m.reported ? ' (reported)' : ''}`,
            m.you,
            m.similar,
            `+${fmtUnits(m.you - m.similar)}`,
          ]),
          highlightRow: HISTORY.length - 1,
        }}
        footnote={
          <>
            Over the full twelve months this home uses {fmtUnits(REPORT.annual.you)} units against
            the group's {fmtUnits(REPORT.annual.similar)} — {fmtSignedPct(REPORT.annual.gapPct)}.
          </>
        }
      >
        <TrendChart data={HISTORY} />
      </ChartFrame>
    </CardShell>
  )
}

/* ------------------------------ 5. End uses ------------------------------- */

export function EndUseCard() {
  return (
    <CardShell
      icon={PlugZap}
      title="Where the energy actually goes"
      kicker={`Your smart meter names ${BILL_TIP.highestEndUse.toLowerCase()} as the largest draw`}
      origin="mixed"
      footer={
        <>
          Appliances and heating/cooling together are{' '}
          <strong className="font-semibold text-brand-navy dark:text-slate-100">
            {TOP_TWO_END_USES.sharePct}%
          </strong>{' '}
          of the
          period. Any plan that does not touch those two is decorating around the problem.
        </>
      }
    >
      <ChartFrame
        title={`End-use split — ${PERIOD.label}`}
        subtitle={`${fmtUnits(PEER_USAGE.you)} units apportioned across six end uses`}
        series={LARGEST_VS_REST}
        table={{
          columns: ['End use', 'Units', 'Share', 'Est. cost'],
          rows: END_USES.map((e) => [e.label, e.units, `${e.sharePct}%`, fmtUsd(usd(e.units), 2)]),
          highlightRow: 0,
        }}
        footnote="Shares are a regional split re-weighted so appliances lead, which is what the bill's smart-meter line asserts. Treat the ranking as firm and the exact percentages as indicative."
      >
        <EmphasisBars
          data={END_USES.map((e) => ({
            id: e.id,
            label: e.label,
            value: e.units,
            emphasis: e.isTop,
            valueLabel: `${fmtUnits(e.units)} · ${e.sharePct}%`,
            caption: e.note,
            tooltip: `${fmtUnits(e.units)} units — about ${fmtUsd(usd(e.units), 2)} this period`,
          }))}
        />
      </ChartFrame>
    </CardShell>
  )
}

/* -------------------------------- 6. Money -------------------------------- */

export function MoneyCard() {
  return (
    <CardShell
      icon={BadgeDollarSign}
      title="What the gap costs"
      kicker={`Modeled at $${ASSUMPTIONS.ratePerUnit.toFixed(2)} per combined unit`}
      origin="modeled"
      footer={
        <>
          Every figure on this card moves with one number. Change the blended rate and they all
          re-scale together — nothing here is quoted from a tariff, because the bill's "unit"
          deliberately mixes kWh and therms and no published rate applies to it directly.
        </>
      }
    >
      <StatRow className="mb-4">
        <StatTile
          label="This period"
          value={fmtUsd(REPORT.period.cost, 2)}
          hint={`${fmtUnits(REPORT.period.units)} units over ${PERIOD.days} days`}
          spark={HISTORY.map((m) => m.you)}
        />
        <StatTile
          label="A year at this rate"
          value={fmtUsd(REPORT.annual.cost)}
          hint={`${fmtUnits(REPORT.annual.you)} units`}
        />
        <StatTile
          label="Above similar homes"
          value={fmtUsd(REPORT.annual.excessCost)}
          tone="critical"
          hint="Per year, purely the gap"
        />
        <StatTile
          label="Above efficient homes"
          value={fmtUsd(REPORT.annual.excessVsEfficientCost)}
          tone="critical"
          hint="Per year — the ceiling on what is available"
        />
      </StatRow>

      <ChartFrame
        title="A year of energy, by group"
        subtitle="Twelve months at the blended rate"
        series={YOU_VS_GROUP}
        table={{
          columns: ['Group', 'Units / year', 'Cost / year'],
          rows: [
            ['Efficient homes', REPORT.annual.efficient, fmtUsd(REPORT.annual.efficientCost)],
            ['Similar homes', REPORT.annual.similar, fmtUsd(REPORT.annual.similarCost)],
            ['You', REPORT.annual.you, fmtUsd(REPORT.annual.cost)],
          ],
          highlightRow: 2,
        }}
      >
        <EmphasisBars
          thickness={18}
          data={[
            {
              id: 'efficient',
              label: 'Efficient homes',
              value: REPORT.annual.efficientCost,
              valueLabel: fmtUsd(REPORT.annual.efficientCost),
              caption: `${fmtUnits(REPORT.annual.efficient)} units a year`,
            },
            {
              id: 'similar',
              label: 'Similar homes',
              value: REPORT.annual.similarCost,
              valueLabel: fmtUsd(REPORT.annual.similarCost),
              caption: `${fmtUnits(REPORT.annual.similar)} units a year`,
            },
            {
              id: 'you',
              label: 'You',
              value: REPORT.annual.cost,
              valueLabel: fmtUsd(REPORT.annual.cost),
              emphasis: true,
              caption: `${fmtUnits(REPORT.annual.you)} units a year`,
            },
          ]}
        />
      </ChartFrame>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
        <MiniStat label={`Next period · ${REPORT.forecast.month}`} value={fmtUsd(REPORT.forecast.cost, 2)} />
        <MiniStat label="Projected units" value={fmtUnits(REPORT.forecast.units)} />
        <p className="min-w-[180px] flex-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {REPORT.forecast.basis}.
        </p>
      </div>
    </CardShell>
  )
}

/* ------------------------------- 7. Carbon -------------------------------- */

export function CarbonCard() {
  return (
    <CardShell
      icon={Leaf}
      title="The footprint behind the bill"
      kicker={`Modeled at ${ASSUMPTIONS.kgCo2PerUnit} kg CO₂e per combined unit`}
      origin="modeled"
      footer={
        <>
          The equivalences are the excess only — not the whole footprint. They describe the part of
          this home's emissions that similar homes on the same street are not producing.
        </>
      }
    >
      <StatRow className="mb-4">
        <StatTile
          label="A year of emissions"
          value={`${REPORT.carbon.annualTonnes} t`}
          hint="CO₂e, all fuels combined"
        />
        <StatTile
          label="The excess"
          value={`${REPORT.carbon.excessTonnes} t`}
          tone="warning"
          hint="Above what similar homes emit"
        />
        <StatTile
          label="Trees to offset it"
          value={`${REPORT.carbon.treesToOffsetExcess}`}
          tone="good"
          hint="Mature trees, working for a year"
        />
        <StatTile
          label="Or driving"
          value={`${fmtUnits(REPORT.carbon.carMilesEquivalent)} mi`}
          hint="In an average passenger car"
        />
      </StatRow>

      <ChartFrame
        title="Annual CO₂e, by group"
        subtitle="Tonnes a year at the blended emissions factor"
        series={YOU_VS_GROUP}
        table={{
          columns: ['Group', 'Tonnes CO₂e / year'],
          rows: [
            ['Efficient homes', (REPORT.annual.efficient * ASSUMPTIONS.kgCo2PerUnit / 1000).toFixed(2)],
            ['Similar homes', (REPORT.annual.similar * ASSUMPTIONS.kgCo2PerUnit / 1000).toFixed(2)],
            ['You', REPORT.carbon.annualTonnes.toFixed(2)],
          ],
          highlightRow: 2,
        }}
      >
        <EmphasisBars
          thickness={18}
          data={[
            {
              id: 'efficient',
              label: 'Efficient homes',
              value: REPORT.annual.efficient,
              valueLabel: `${((REPORT.annual.efficient * ASSUMPTIONS.kgCo2PerUnit) / 1000).toFixed(2)} t`,
            },
            {
              id: 'similar',
              label: 'Similar homes',
              value: REPORT.annual.similar,
              valueLabel: `${((REPORT.annual.similar * ASSUMPTIONS.kgCo2PerUnit) / 1000).toFixed(2)} t`,
            },
            {
              id: 'you',
              label: 'You',
              value: REPORT.annual.you,
              valueLabel: `${REPORT.carbon.annualTonnes.toFixed(2)} t`,
              emphasis: true,
            },
          ]}
        />
      </ChartFrame>
    </CardShell>
  )
}

/* --------------------------------- 8. Plan -------------------------------- */

const EFFORT_LABEL = { low: 'Low effort', medium: 'Medium effort', high: 'Contractor' } as const

export function PlanCard() {
  const ranked = [...SAVING_ACTIONS].sort(
    (a, b) => b.unitsPerYear * ASSUMPTIONS.ratePerUnit + b.creditUsdPerYear -
      (a.unitsPerYear * ASSUMPTIONS.ratePerUnit + a.creditUsdPerYear),
  )

  return (
    <CardShell
      icon={ListChecks}
      title="A plan sized against the gap"
      kicker={`Six actions · ${fmtUsd(REPORT.plan.savingsUsdPerYear)} a year · pays back in ${REPORT.plan.paybackMonths} months`}
      origin="modeled"
      footer={
        <>
          Done in full, this closes{' '}
          <strong className="font-semibold text-brand-navy dark:text-slate-100">
            {REPORT.plan.gapClosedPct}%
          </strong>{' '}
          of the gap to similar homes and moves the score from {REPORT.score} to{' '}
          {REPORT.plan.projectedScore} — out of {REPORT.band} and into {REPORT.plan.projectedBand}.
          If that is too much at once, the {REPORT.quickWins.count} low-effort measures come to{' '}
          {fmtUsd(REPORT.quickWins.upfrontUsd)} upfront and reach{' '}
          <strong className="font-semibold text-brand-navy dark:text-slate-100">
            {REPORT.quickWins.projectedScore}
          </strong>{' '}
          on their own — enough to clear the {REPORT.quickWins.projectedBand} boundary without a
          contractor.
        </>
      }
    >
      <StatRow className="mb-5">
        <StatTile
          label="Saved per year"
          value={fmtUsd(REPORT.plan.savingsUsdPerYear)}
          tone="good"
          hint={`${fmtUnits(REPORT.plan.unitsPerYear)} units, plus ${fmtUsd(REPORT.plan.creditsUsdPerYear)} in credits`}
        />
        <StatTile
          label="Upfront"
          value={fmtUsd(REPORT.plan.upfrontUsd)}
          hint="After the state rebate on the duct work"
        />
        <StatTile
          label="Payback"
          value={`${REPORT.plan.paybackMonths} mo`}
          tone="good"
          hint="Then it is pure saving"
        />
        <StatTile
          label="Score after"
          value={`${REPORT.plan.projectedScore}`}
          tone="good"
          delta={{ text: `+${REPORT.plan.projectedScore - REPORT.score} pts`, good: true }}
          hint={`Into the ${REPORT.plan.projectedBand} band`}
        />
      </StatRow>

      <ChartFrame
        title="What each action is worth"
        subtitle="Annual saving, largest first — bill credits included"
        // Two accents appear here, so the legend is not optional: the cyan bars
        // are not "the biggest", they are the ones the report itself suggested.
        series={[
          { label: "The report's own tips", color: 'var(--viz-accent)' },
          { label: 'Added by this analysis', color: 'var(--viz-context)' },
        ]}
        table={{
          columns: ['Action', 'Units / yr', 'Saving / yr', 'Upfront', 'Effort'],
          rows: ranked.map((a) => [
            a.title,
            a.unitsPerYear,
            fmtUsd(usd(a.unitsPerYear) + a.creditUsdPerYear),
            a.upfrontUsd === 0 ? 'Free' : fmtUsd(a.upfrontUsd),
            EFFORT_LABEL[a.effort],
          ]),
        }}
        footnote="Savings come from published measure figures applied to this home's end-use split, so they scale with its actual load rather than a generic household."
      >
        <EmphasisBars
          data={ranked.map((a) => {
            const value = usd(a.unitsPerYear) + a.creditUsdPerYear
            return {
              id: a.id,
              label: a.title,
              value,
              valueLabel: `${fmtUsd(value)}/yr`,
              emphasis: a.fromBill,
              caption: `${EFFORT_LABEL[a.effort]} · ${a.upfrontUsd === 0 ? 'no upfront cost' : `${fmtUsd(a.upfrontUsd)} upfront`}${a.fromBill ? " · the bill's own recommendation" : ''}`,
              tooltip: a.detail,
            }
          })}
        />
      </ChartFrame>

      <ul className="mt-5 space-y-2.5">
        {ranked.map((a) => (
          <li
            key={a.id}
            className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[12.5px] font-semibold text-brand-navy dark:text-slate-100">
                {a.title}
              </span>
              {a.fromBill && <OriginChip origin="bill" />}
              <span className="ml-auto shrink-0 text-[12.5px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {fmtUsd(usd(a.unitsPerYear) + a.creditUsdPerYear)}/yr
              </span>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {a.detail}
            </p>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

/* ------------------------------- 9. Programs ------------------------------ */

export function ProgramsCard() {
  return (
    <CardShell
      icon={Gift}
      title="Not yet claimed"
      kicker="Offers already on this account, and what they are worth here"
      origin="bill"
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/25">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-semibold text-brand-navy dark:text-slate-100">
              {CONNECTED_REWARDS.name}
            </p>
            <p className="shrink-0 text-[19px] font-bold leading-none text-emerald-700 dark:text-emerald-400">
              {fmtUsd(CONNECTED_REWARDS.annualCreditUsd)}
              <span className="text-[11px] font-medium">/yr</span>
            </p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            Requires {CONNECTED_REWARDS.requirement.toLowerCase()}. {CONNECTED_REWARDS.guardrail};{' '}
            {CONNECTED_REWARDS.exit.toLowerCase()}. {CONNECTED_REWARDS.availability}.
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {CONNECTED_REWARDS.rationale}
          </p>
          <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {CONNECTED_REWARDS.signupLine} · combined with the setback saving this action is worth{' '}
            {fmtUsd(usd(actionById('thermostat').unitsPerYear) + CONNECTED_REWARDS.annualCreditUsd)} a
            year here.
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:ring-amber-400/25">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-semibold text-brand-navy dark:text-slate-100">
              {PROFILE.name}
            </p>
            <p className="shrink-0 text-[19px] font-bold leading-none text-amber-700 dark:text-amber-300">
              {PROFILE.completionPct}%
            </p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            {PROFILE.promise}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            All {PROFILE.missing.length} questions are still outstanding, and until they are answered
            the comparison group is built from thinner data than it could be — so the{' '}
            {REPORT.vsSimilar.pct}% gap is measured against a rougher set of neighbours than it
            needs to be.
          </p>
          {/* The four questions and the code that opens them. The report puts a
              QR here for a reason — the alternative is asking someone to type a
              URL off a sheet of paper — so the rendition keeps it rather than
              flattening it back to a link. */}
          <div className="mt-2.5 flex items-start gap-3">
            <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {PROFILE.missing.map((m) => (
                <li
                  key={m}
                  className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 ring-1 ring-amber-600/20 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-amber-400/25"
                >
                  {m}
                </li>
              ))}
            </ul>
            <QrCode value={PROFILE.qr.target} caption={PROFILE.qr.caption} size={78} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
          <p className="text-[13px] font-semibold text-brand-navy dark:text-slate-100">
            {BILL_META.partner} rebates
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            The duct-sealing and insulation work in the plan is rebate-eligible, which is why its
            upfront figure is quoted post-rebate. Efficient products are also discounted at{' '}
            {BILL_META.links.smartEnergy}.
          </p>
        </div>
      </div>
    </CardShell>
  )
}

/* ------------------------------ 10. Extraction ---------------------------- */

export function ExtractedCard() {
  return (
    <CardShell
      icon={FileSearch}
      title="Every reported value"
      kicker={`${EXTRACTED_FIELDS.length} figures on the ${PERIOD.short} report — nothing derived`}
      origin="bill"
      footer={
        <>
          Statement reference{' '}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px] text-slate-600 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
            {BILL_META.statementRef}
          </code>
        </>
      }
    >
      <div className="space-y-4">
        {FIELD_GROUPS.map(({ group, fields }) => (
          <div key={group}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-cyan">
              {group}
            </p>
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {fields.map((f) => (
                <li key={f.label} className="flex items-start justify-between gap-4 py-1.5">
                  <p className="min-w-0 text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    {f.label}
                  </p>
                  <p className="shrink-0 text-right text-[12px] font-semibold text-brand-navy dark:text-slate-100">
                    {f.value}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

/* ------------------------------ 11. Provenance ---------------------------- */

export function ProvenanceCard() {
  return (
    <CardShell
      icon={ShieldQuestion}
      title="Which numbers are reported, and which are ours"
      kicker="Read this before quoting anything on this page"
      origin="mixed"
      footer={
        <>
          Assumptions in full: ${ASSUMPTIONS.ratePerUnit.toFixed(2)} per combined unit ·{' '}
          {ASSUMPTIONS.kgCo2PerUnit} kg CO₂e per unit · {ASSUMPTIONS.kgCo2PerTreeYear} kg CO₂
          absorbed per mature tree per year · {ASSUMPTIONS.kgCo2PerCarMile} kg CO₂ per car mile.
        </>
      }
    >
      <ul className="space-y-2">
        {PROVENANCE.map((row) => (
          <li
            key={row.figure}
            className={cn(
              'rounded-xl p-3 ring-1',
              row.origin === 'Reported'
                ? 'bg-brand-cyan/[0.06] ring-brand-cyan/20 dark:bg-brand-cyan/10 dark:ring-brand-cyan/25'
                : 'bg-slate-50 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12.5px] font-semibold text-brand-navy dark:text-slate-100">
                {row.figure}
              </p>
              <OriginChip origin={row.origin === 'Reported' ? 'bill' : 'modeled'} />
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-slate-600 dark:text-slate-300">
              {row.basis}
            </p>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

/* -------------------------------- 12. Tip --------------------------------- */

export function TipCard() {
  return (
    <CardShell
      icon={ClipboardList}
      title="The bill's own top tip, in context"
      kicker={BILL_TIP.highestEndUseNote}
      origin="bill"
      footer={
        <>
          It is good advice and it costs nothing — but at roughly{' '}
          {fmtUsd(usd(actionById('coils').unitsPerYear))} a year it is
          the smallest line in the plan. The report leads with it because it is easy, not because
          it is the biggest.
        </>
      }
    >
      <div className="rounded-xl bg-brand-cyan/[0.06] p-3.5 ring-1 ring-brand-cyan/20 dark:bg-brand-cyan/10 dark:ring-brand-cyan/25">
        <p className="text-[13px] font-semibold text-brand-navy dark:text-slate-100">
          {BILL_TIP.title}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
          {BILL_TIP.body}
        </p>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
        Your rating band is{' '}
        <strong className="font-semibold text-brand-navy dark:text-slate-100">
          {BILL_RATING.current}
        </strong>
        , and the report's verdict is blunt: "{BILL_RATING.verdict}".
      </p>
    </CardShell>
  )
}

/* The id → component map lives in `cardRegistry.ts`, not here: a module that
 * exports anything other than components loses React Fast Refresh for all of
 * them, and this is the file being edited while a demo is on screen. */
