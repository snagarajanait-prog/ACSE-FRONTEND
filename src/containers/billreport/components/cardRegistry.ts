/**
 * Card id → component.
 *
 * Split out of `cards.tsx` so that file exports components and nothing else —
 * a module mixing components with a plain constant loses React Fast Refresh for
 * every component in it, and `cards.tsx` is exactly the file someone edits while
 * the demo is on screen.
 *
 * The storyboard names cards by these ids and never imports the components, so
 * a card can be rewritten without touching the script and vice versa.
 */

import {
  CarbonCard,
  EndUseCard,
  ExtractedCard,
  HeadlineCard,
  MoneyCard,
  PeerCard,
  PlanCard,
  ProgramsCard,
  ProvenanceCard,
  TipCard,
  TrendCard,
  YearOverYearCard,
} from '@/containers/billreport/components/cards'

export const CARDS = {
  headline: HeadlineCard,
  peer: PeerCard,
  yoy: YearOverYearCard,
  trend: TrendCard,
  endUse: EndUseCard,
  money: MoneyCard,
  carbon: CarbonCard,
  plan: PlanCard,
  programs: ProgramsCard,
  extracted: ExtractedCard,
  provenance: ProvenanceCard,
  tip: TipCard,
} as const

export type CardId = keyof typeof CARDS
