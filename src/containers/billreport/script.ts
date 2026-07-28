

import {
  BadgeDollarSign,
  Leaf,
  ListChecks,
  FileSearch,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { CardId } from '@/containers/billreport/components/cardRegistry'
import {
  BILL_META,
  BILL_RATING,
  BILL_TIP,
  CONNECTED_REWARDS,
  PEER_USAGE,
  PERIOD,
  PROFILE,
  REPORT,
  TOP_TWO_END_USES,
  actionById,
  endUseById,
  fmtUnits,
  fmtUsd,
  usd,
} from '@/data/billReport'

export type Step =
  | { kind: 'user'; text: string }
  | { kind: 'status'; text: string }
  | { kind: 'ai'; text: string; reasoning?: string; tools?: string[] }
  | { kind: 'card'; card: CardId }
  | { kind: 'done'; text: string }

/** How long the thread waits before revealing each kind of step. */
export const PACE: Record<Step['kind'], number> = {
  user: 260,
  status: 520,
  ai: 900,
  card: 620,
  done: 700,
}

/* ------------------------------ the opening ------------------------------- */

/**
 * The question the analysis answers — offered to the customer, never sent for
 * them.
 *
 * It is NOT the first entry in `OPENING` below, and that separation is the
 * point: the screen opens on an empty conversation and waits. An analysis that
 * has already run before anyone asked reads as a dashboard that happens to look
 * like a chat, and it throws away the one thing the format is for — showing that
 * a customer's own question produced it.
 */
export const OPENING_PROMPT = `Open my ${BILL_META.documentType} for June and tell me everything you can — not just what it says, but what it means.`

/** What plays once the customer sends. The user's own turn is posted by the engine. */
export const OPENING: Step[] = [
  { kind: 'status', text: `Opening account ${BILL_META.accountNumber} · ${BILL_META.customerName}` },
  { kind: 'status', text: `Loading the ${PERIOD.short} report · 20 reported values` },
  { kind: 'status', text: 'Benchmarking against the comparison group' },
  { kind: 'status', text: 'Reconciling against the same window last year' },
  { kind: 'status', text: 'Modeling cost, carbon, end-use split and a savings plan' },
  {
    kind: 'ai',
    reasoning:
      `The reported figures are the peer comparison — ${fmtUnits(PEER_USAGE.efficient)} / ${fmtUnits(PEER_USAGE.similar)} / ${fmtUnits(PEER_USAGE.you)} units, a ${BILL_RATING.headlineComparisonPct}% gap — the year-on-year pair, and ${BILL_TIP.highestEndUse.toLowerCase()} named as the largest end use.\n\nThe interesting tension is between two of them: the year-on-year line is a decrease and reads as encouraging, while the peer comparison says this home is half again above its neighbours. Both are true. Leading with the good news would be dishonest, and leading with the bad news alone would be useless, so the framing has to hold both — the direction is right, the distance is not.\n\nCost, carbon and the end-use split are not reported at all. I can derive them, but the derivation rests on a blended rate I have to choose, so every one of those figures has to be labelled as mine rather than the utility's.`,
    tools: ['load_account', 'benchmark_peers', 'model_end_use', 'build_savings_plan'],
    text: `Report loaded — 20 reported values, nothing ambiguous. Here is the short version: this home is moving in the right direction and is still a long way from where it should be.\n\nUsage fell ${Math.abs(REPORT.yoy.units)} units against the same window last year, which is real progress. But it sits ${REPORT.vsSimilar.pct}% above similar homes and ${REPORT.vsEfficient.pct}% above the efficient ones, and at that gap the year costs about ${fmtUsd(REPORT.annual.excessCost)} more than the neighbours pay. The good news and the bad news look the same size on the statement and are very different in magnitude.`,
  },
  { kind: 'card', card: 'headline' },
  {
    kind: 'ai',
    text: 'Start with the comparison the report leads on, because the shape of it matters more than the headline percentage.',
  },
  { kind: 'card', card: 'peer' },
  {
    kind: 'ai',
    text: `Now the year-on-year pair — the part of the report that feels like a win.`,
  },
  { kind: 'card', card: 'yoy' },
  {
    kind: 'ai',
    reasoning:
      'One reported period cannot show a trend, so anything twelve-month here is modeled. Worth building anyway: the single most useful question about a gap this size is whether it is seasonal — a bad cooling summer is a different problem from a bad building — and a modeled profile anchored on the reported period answers the shape of that question even where the exact monthly values are indicative.',
    text: 'Only one period is reported, so I modeled the surrounding year to answer the question a single reading cannot: is this a summer problem, or is it the house?',
  },
  { kind: 'card', card: 'trend' },
  {
    kind: 'ai',
    text: `Your smart meter already answered where it goes — the report names ${BILL_TIP.highestEndUse.toLowerCase()}. Here is that split with the period's ${fmtUnits(REPORT.period.units)} units apportioned across it.`,
  },
  { kind: 'card', card: 'endUse' },
  {
    kind: 'ai',
    text: `No cost figure is reported anywhere on this account — the report's "unit" mixes kWh and therms, so no tariff applies to it directly. These are mine, at a stated blended rate.`,
  },
  { kind: 'card', card: 'money' },
  { kind: 'card', card: 'carbon' },
  {
    kind: 'ai',
    reasoning:
      "Six measures, each sized against this home's own end-use split rather than a generic household, then ranked by annual value. The report's own tip is included and honestly placed: it is real, it is free, and it is the smallest line — putting it first would flatter the report at the customer's expense.",
    tools: ['build_savings_plan', 'check_program_eligibility'],
    text: `So: what actually changes it. Six measures, ranked by what they are worth here rather than by how often they get recommended.`,
  },
  { kind: 'card', card: 'plan' },
  { kind: 'card', card: 'programs' },
  {
    kind: 'done',
    text: `Analysis complete for ${PERIOD.label} — ${fmtUsd(REPORT.plan.savingsUsdPerYear)} a year identified against a ${fmtUsd(REPORT.annual.excessCost)} gap. Ref ${BILL_META.statementRef}`,
  },
]

/* ------------------------------ follow-ups -------------------------------- */

export interface FollowUp {
  id: string
  /** The chip's label. */
  label: string
  Icon: LucideIcon
  /** What is posted into the thread as the customer's turn. */
  prompt: string
  steps: Step[]
}

export const FOLLOW_UPS: FollowUp[] = [
  {
    id: 'why',
    label: `Why am I ${BILL_RATING.headlineComparisonPct}% above?`,
    Icon: Users,
    prompt: `Why is my home ${BILL_RATING.headlineComparisonPct}% above similar homes? What is actually driving it?`,
    steps: [
      { kind: 'status', text: 'Decomposing the gap by end use' },
      {
        kind: 'ai',
        reasoning:
          'The honest answer has a boundary in it. I can decompose the gap into end uses and I can say which ones are anomalous against a regional profile, but the account holds no home size, no occupancy and no equipment ages — the profile that would carry all of that is only part-filled. So I can say where the energy goes and which shares look wrong; I cannot say the house is under-insulated, only that the pattern is consistent with it.',
        tools: ['decompose_gap', 'compare_to_regional_profile'],
        text: `Three things, in order of size.\n\n**Lighting is the loudest anomaly.** It holds ${endUseById('lighting').sharePct}% of a June period. In an all-LED house of this size that share is roughly half — so the gap here is not about how much light gets used, it is about what is producing it.\n\n**Electronics sit at ${endUseById('electronics').sharePct}% with almost no daily variation.** Load that flat is standby draw, not use. You are paying for equipment that is on because nobody switched it off, not because anyone is using it.\n\n**${TOP_TWO_END_USES.labels.join(' and ').toLowerCase()} are ${TOP_TWO_END_USES.sharePct}% of the period between them.** That share is normal; the absolute number is not. This is where the volume lives, and it is why the plan spends its effort there.\n\nThe pattern across all three — a gap that holds in mild months as well as harsh ones, flat overnight load, lighting that behaves like a pre-LED house — is the signature of a building and its equipment rather than of how the household behaves.`,
      },
      { kind: 'card', card: 'endUse' },
      {
        kind: 'ai',
        text: `One caveat worth stating: your ${PROFILE.name} is only ${PROFILE.completionPct}% complete, so the comparison group is being built from thinner data than it could be. Answering the last ${PROFILE.missing.length} questions would tighten it — and could move the ${BILL_RATING.headlineComparisonPct}% in either direction.`,
      },
    ],
  },
  {
    id: 'plan',
    label: 'How do I get out of Fair?',
    Icon: ListChecks,
    prompt: 'What would it actually take to get out of the Fair band?',
    steps: [
      { kind: 'status', text: 'Solving for the band threshold' },
      {
        kind: 'ai',
        reasoning:
          `The band boundary is at ${REPORT.threshold.goodBandAt} and the score sits at ${REPORT.score}, so the threshold question and the full-plan question have different answers and should not be blurred. Worth checking the tempting claim before making it: the one free action reaches ${REPORT.threshold.freeOnlyScore} and the two cheapest reach ${REPORT.threshold.twoCheapestScore} — neither clears the boundary. The ${REPORT.quickWins.count} low-effort measures reach ${REPORT.quickWins.projectedScore}. Lead with that, since it is both true and the better answer.`,
        tools: ['solve_score_threshold', 'rank_by_payback'],
        text: `Less than you would think, but more than the free tip.\n\nThe ${REPORT.plan.projectedBand} band starts at ${REPORT.threshold.goodBandAt} and you are at ${REPORT.score}. Worth being precise here: the free tip on its own gets you to ${REPORT.threshold.freeOnlyScore}, and the two cheapest actions together reach ${REPORT.threshold.twoCheapestScore} — closer, but still ${REPORT.band}.\n\n**The ${REPORT.quickWins.count} low-effort measures do clear it.** ${fmtUsd(REPORT.quickWins.upfrontUsd)} upfront in total, no contractor, and they take the score to **${REPORT.quickWins.projectedScore}** — comfortably into ${REPORT.quickWins.projectedBand} — while saving about ${fmtUsd(REPORT.quickWins.savingsUsdPerYear)} a year.\n\nThe full six-measure plan is a different ambition: ${REPORT.plan.projectedScore}, ${REPORT.plan.gapClosedPct}% of the distance to your neighbours closed, and its ${fmtUsd(REPORT.plan.upfrontUsd)} back in ${REPORT.plan.paybackMonths} months. After that it is ${fmtUsd(REPORT.plan.savingsUsdPerYear)} a year, every year.\n\nWhat none of it will do is reach the efficient homes' ${fmtUnits(REPORT.annual.efficient)} units a year. That needs equipment replaced — the water heater and the HVAC — and that is a different conversation with a different budget.`,
      },
      { kind: 'card', card: 'plan' },
    ],
  },
  {
    id: 'cost',
    label: 'What will next month cost?',
    Icon: BadgeDollarSign,
    prompt: 'What is this going to cost me next month, and over the next year?',
    steps: [
      { kind: 'status', text: 'Projecting the next period' },
      {
        kind: 'ai',
        reasoning:
          'One reported period and one reported year-on-year rate. Carrying last July forward on that rate is the only projection the data supports; a regression on modeled months would look more sophisticated and mean nothing, since it would be fitting to numbers I generated. Say which it is.',
        tools: ['project_period', 'price_at_blended_rate'],
        text: `**${REPORT.forecast.month}: about ${fmtUsd(REPORT.forecast.cost, 2)}** — ${fmtUnits(REPORT.forecast.units)} units.\n\nThat is last July carried forward on the year-on-year rate this bill reports. It is the only projection the data actually supports: everything else I have for the intervening months is modeled, and fitting a curve to my own model would look rigorous and tell you nothing.\n\n**Across a full year: about ${fmtUsd(REPORT.annual.cost)}.** Of that, ${fmtUsd(REPORT.annual.excessCost)} is purely the gap to similar homes — the amount a comparable household on your street does not pay. Run the plan and roughly ${fmtUsd(REPORT.plan.savingsUsdPerYear)} of it comes back each year.`,
      },
      { kind: 'card', card: 'money' },
    ],
  },
  {
    id: 'carbon',
    label: 'What about emissions?',
    Icon: Leaf,
    prompt: 'How much CO₂ does this represent?',
    steps: [
      { kind: 'status', text: 'Applying the blended emissions factor' },
      {
        kind: 'ai',
        text: `About **${REPORT.carbon.annualTonnes} tonnes of CO₂e a year** for the whole house.\n\nThe part worth acting on is the excess: **${REPORT.carbon.excessTonnes} tonnes** that similar homes on the same street are simply not emitting. Offsetting that would take about ${REPORT.carbon.treesToOffsetExcess} mature trees working for a year, or it is the same as driving ${fmtUnits(REPORT.carbon.carMilesEquivalent)} miles.\n\nThe savings plan removes roughly half of it — carbon tracks units, so the same measures do both jobs at once.`,
      },
      { kind: 'card', card: 'carbon' },
    ],
  },
  {
    id: 'rebates',
    label: 'What can I claim?',
    Icon: Sparkles,
    prompt: 'What programmes and rebates am I eligible for?',
    steps: [
      { kind: 'status', text: 'Checking programmes named on the bill' },
      {
        kind: 'ai',
        tools: ['check_program_eligibility'],
        text: `Two things are already attached to your own account, and one of them has a number attached.\n\n**${CONNECTED_REWARDS.name}** is worth ${fmtUsd(CONNECTED_REWARDS.annualCreditUsd)} a year in credits, and the thermostat that qualifies you also cuts the heating and cooling load — together about ${fmtUsd(usd(actionById('thermostat').unitsPerYear) + CONNECTED_REWARDS.annualCreditUsd)} a year here. Adjustments are capped at four degrees and you can leave whenever you like.\n\n**The ${PROFILE.name}** pays nothing directly but is the reason several numbers on this page carry a caveat. It is ${PROFILE.completionPct}% complete; ${PROFILE.missing.length} more questions would finish it.\n\n**${BILL_META.partner}** rebates cover the duct and insulation work, which is why its upfront cost in the plan is quoted after the rebate rather than before.`,
      },
      { kind: 'card', card: 'programs' },
    ],
  },
  {
    id: 'sources',
    label: 'What is reported vs modeled?',
    Icon: FileSearch,
    prompt: 'Which of these numbers are reported, and which did you work out yourself?',
    steps: [
      { kind: 'status', text: 'Separating reported values from derived ones' },
      {
        kind: 'ai',
        text: `Fair question, and the honest split is roughly: **nine facts are reported, everything else is mine.**\n\nUsage, the two peer benchmarks, the year-on-year pair, the rating band, the largest end use, the top tip, the rewards offer and the profile percentage — those come off your account. Every dollar, every kilogram of CO₂, the end-use percentages, the twelve-month history and the whole savings plan are derived, and they rest on a blended rate I chose rather than a tariff anyone published.\n\nHere is every reported value, then the provenance for each derived figure.`,
      },
      { kind: 'card', card: 'extracted' },
      { kind: 'card', card: 'provenance' },
    ],
  },
]
