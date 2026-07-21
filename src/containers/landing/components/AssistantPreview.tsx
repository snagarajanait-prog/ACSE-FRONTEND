/**
 * The still of the assistant that sits beside the hero copy.
 *
 * Deliberately NOT the live chat — it is a fixed frame, so the page never
 * competes with the real copilot for attention and nothing here can get out of
 * sync with the engine. The content mirrors the `high-bill` storyboard so the
 * promise on the landing page matches what the demo actually does.
 *
 * Two elements are floated outside the card's bounds (the intent chips above and
 * the throughput pill below-left). They are positioned rather than in flow, so
 * the card keeps a clean rectangle — and both collapse into the flow on phones,
 * where there is no margin to float into.
 */

import { Activity, Bot, Check } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

const CHIPS = [
  { key: 'resolvePayment', active: true },
  { key: 'scheduleAppointment', active: false },
  { key: 'fieldVisit', active: false },
]

const STEPS = ['identity', 'analysis', 'escalation']

export default function AssistantPreview() {
  const { t } = useTranslation('landing')
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Intent chips. Floated over the card's top edge only at xl+: the three
          chips need ~450px on one line, and between lg and xl the two-column
          hero squeezes this card below that — so there they stay in flow above
          the card, exactly as they do on phones. */}
      <div className="mb-3 flex flex-wrap gap-2 xl:absolute xl:-top-5 xl:left-4 xl:right-4 xl:mb-0 xl:flex-nowrap">
        {CHIPS.map((c) => (
          <span
            key={c.key}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm ring-1',
              c.active
                ? 'bg-brand-cyan/10 text-brand-cyan ring-brand-cyan/25 dark:bg-brand-cyan/15 dark:ring-brand-cyan/30'
                : 'bg-white text-slate-600 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                c.active ? 'bg-brand-cyan' : 'bg-slate-300 dark:bg-slate-500',
              )}
            />
            {t(`preview.chips.${c.key}`)}
          </span>
        ))}
      </div>

      {/* The extra top padding only applies where the chips actually float in. */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_24px_60px_-24px_rgba(10,30,53,0.28)] ring-1 ring-slate-200/80 sm:p-5 xl:pt-8 dark:bg-white/[0.04] dark:shadow-[0_24px_70px_-30px_rgba(44,165,217,0.45)] dark:ring-white/10 dark:backdrop-blur-xl">
        {/* Agent header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-cyan/12 dark:bg-brand-cyan/20">
            <Bot className="h-4 w-4 text-brand-cyan" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-brand-navy dark:text-slate-100">
            <Trans
              t={t}
              i18nKey="preview.agentName"
              components={{ 1: <span className="font-normal text-slate-400" /> }}
            />
          </p>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30">
            {t('preview.active')}
          </span>
        </div>

        {/* Exchange */}
        <div className="space-y-2.5 py-4">
          <p className="rounded-xl rounded-tl-sm bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-200 dark:bg-white/[0.03] dark:text-slate-300 dark:ring-white/10">
            {t('preview.userMessage')}
          </p>
          <p className="ml-auto w-[92%] rounded-xl rounded-tr-sm bg-brand-cyan/[0.10] px-3 py-2.5 text-[13px] leading-relaxed text-brand-navy ring-1 ring-brand-cyan/15 dark:bg-brand-cyan/15 dark:text-slate-100 dark:ring-brand-cyan/25">
            {t('preview.agentMessage')}
          </p>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          {t('preview.workOrder', { order: '#FA-40721', team: 'B' })}
        </p>

        {/* Resolution trail */}
        <ul className="mt-3 space-y-px overflow-hidden rounded-xl">
          {STEPS.map((s) => (
            <li
              key={s}
              className="flex items-center gap-2.5 bg-slate-50/80 px-3 py-2.5 dark:bg-white/[0.03]"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-brand-cyan" />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-brand-navy dark:text-slate-200">
                {t(`preview.steps.${s}.label`)}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                {t(`preview.steps.${s}.status`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Throughput pill — floated off the card's lower-left at sm+. */}
      <div className="mt-3 flex sm:absolute sm:-bottom-5 sm:left-2 sm:mt-0">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] shadow-[0_10px_30px_-12px_rgba(10,30,53,0.4)] ring-1 ring-slate-200/80 dark:bg-brand-navy dark:ring-white/10">
          <Activity className="h-3.5 w-3.5 text-brand-cyan" />
          <span className="font-semibold text-brand-navy dark:text-slate-100">
            {t('preview.live')}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {t('preview.requestsResolved', { value: '1,284' })}
          </span>
        </span>
      </div>
    </div>
  )
}
