/**
 * The use-case grid. Every card with a `scenario` is a live entry point: it
 * hands that storyboard to the copilot, which auto-plays it on arrival.
 */

import {
  ArrowLeftRight,
  BellRing,
  CloudOff,
  Droplets,
  FileText,
  Gauge,
  Power,
  TrendingUp,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'

interface UseCaseCard {
  icon: LucideIcon
  /** Translation key under `useCases.cards`. */
  key: string
  /** Optional scenario to jump straight into when clicked. */
  scenario?: string
}

const cards: UseCaseCard[] = [
  { icon: Power, key: 'startService', scenario: 'start-service' },
  { icon: ArrowLeftRight, key: 'paymentArrangement', scenario: 'payment-arrangement' },
  { icon: UserCog, key: 'updateContact', scenario: 'update-contact' },
  { icon: CloudOff, key: 'reportOutage', scenario: 'report-outage' },
  { icon: Droplets, key: 'reportLeak', scenario: 'report-leak' },
  { icon: TrendingUp, key: 'highBill', scenario: 'high-bill' },
  { icon: Gauge, key: 'meterRead' },
  { icon: BellRing, key: 'autopayOutreach' },
  { icon: FileText, key: 'newService' },
]

interface UseCasesSectionProps {
  onAskAcseAi: (scenarioId?: string) => void
}

export default function UseCasesSection({ onAskAcseAi }: UseCasesSectionProps) {
  const { t } = useTranslation('landing')
  return (
    <section id="use-cases" className="border-b border-border bg-slate-50/70 dark:bg-white/[0.02]">
      <div className="container py-20 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-cyan">
            {t('useCases.eyebrow')}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-slate-100">
            {t('useCases.heading')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('useCases.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <button
              key={c.key}
              onClick={() => onAskAcseAi(c.scenario)}
              className="group flex flex-col rounded-xl border border-border bg-background p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-cyan/40 hover:shadow-md dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-cyan/10 transition-colors group-hover:bg-brand-cyan/20">
                <c.icon className="h-5 w-5 text-brand-cyan" />
              </span>
              <h3 className="mt-4 font-semibold text-brand-navy dark:text-slate-100">
                {t(`useCases.cards.${c.key}.title`)}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(`useCases.cards.${c.key}.body`)}
              </p>
              {c.scenario && (
                <span className="mt-3 text-sm font-medium text-brand-cyan opacity-0 transition-opacity group-hover:opacity-100">
                  {t('useCases.runScenario')}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button size="lg" onClick={() => onAskAcseAi()}>
            {t('useCases.tryAll')}
          </Button>
        </div>
      </div>
    </section>
  )
}
