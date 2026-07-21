/**
 * "What we do" — the four platform pillars beside the capability list.
 */

import { Headphones, PlugZap, ReceiptText, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const pillars = [
  { icon: Headphones, key: 'customerService' },
  { icon: ReceiptText, key: 'billing' },
  { icon: Wrench, key: 'field' },
  { icon: PlugZap, key: 'integrations' },
]

const promiseKeys = ['handleService', 'autopay', 'fieldActivities', 'billingAnomalies']

export default function PlatformSection() {
  const { t } = useTranslation('landing')
  return (
    <section id="platform" className="border-b border-border bg-background">
      <div className="container py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-cyan">
              {t('platform.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-slate-100">
              {t('platform.heading')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t('platform.subtitle')}</p>
            <ul className="mt-6 space-y-3">
              {promiseKeys.map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-3 text-[15px] text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                    ✓
                  </span>
                  {t(`platform.promises.${k}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((p) => (
              <div
                key={p.key}
                className="rounded-xl border border-border bg-slate-50/60 p-6 transition-colors hover:border-brand-cyan/40 hover:bg-background dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-navy dark:bg-brand-cyan/15">
                  <p.icon className="h-5 w-5 text-brand-cyan" />
                </span>
                <h3 className="mt-4 font-semibold text-brand-navy dark:text-slate-100">
                  {t(`platform.pillars.${p.key}.title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`platform.pillars.${p.key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
