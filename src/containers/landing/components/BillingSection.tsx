/**
 * Billing exception handling, plus the closing CTA band.
 */

import { AlertTriangle, CalendarRange, ClipboardList, Gauge, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'

const rows = [
  { icon: AlertTriangle, key: 'usageAlerts' },
  { icon: ShieldAlert, key: 'maxBill' },
  { icon: Gauge, key: 'zeroReads' },
  { icon: CalendarRange, key: 'schedule' },
  { icon: ClipboardList, key: 'orderStatus' },
]

interface BillingSectionProps {
  onAskAcseAi: () => void
}

export default function BillingSection({ onAskAcseAi }: BillingSectionProps) {
  const { t } = useTranslation('landing')
  return (
    <section id="billing" className="border-b border-border bg-background">
      <div className="container py-20 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-cyan">
            {t('billing.eyebrow')}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-slate-100">
            {t('billing.heading')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('billing.subtitle')}</p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl divide-y divide-border rounded-2xl border border-border bg-background shadow-sm dark:bg-white/[0.03]">
          {rows.map((r) => (
            <div key={r.key} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-navy dark:bg-brand-cyan/15">
                <r.icon className="h-5 w-5 text-brand-cyan" />
              </span>
              <div className="sm:w-48 sm:shrink-0">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-cyan">
                  {t(`billing.rows.${r.key}.tag`)}
                </p>
                <p className="mt-0.5 font-semibold text-brand-navy dark:text-slate-100">
                  {t(`billing.rows.${r.key}.title`)}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`billing.rows.${r.key}.body`)}
              </p>
            </div>
          ))}
        </div>

        {/* CTA band */}
        <div className="brand-gradient-hero mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl px-8 py-12 text-center">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">{t('billing.cta.heading')}</h3>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">{t('billing.cta.subtitle')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={onAskAcseAi}>
              {t('billing.cta.seeItInAction')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              href="#contact"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              {t('billing.cta.talkToUs')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
