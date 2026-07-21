/**
 * Above-the-fold: the pitch on the left, a still of the assistant on the right.
 *
 * Light and airy rather than a solid brand slab — the weight comes from the
 * headline alone, on the page's own surface. Nothing is painted behind it, so
 * the section flips with the theme instead of being tinted in both palettes.
 */

import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'
import AssistantPreview from '@/containers/landing/components/AssistantPreview'

const stats = [
  { value: '85%', labelKey: 'hero.stats.callVolume' },
  { value: '24/7', labelKey: 'hero.stats.alwaysOn' },
  { value: '11+', labelKey: 'hero.stats.workflows' },
]

interface HeroProps {
  onAskAcseAi: () => void
}

export default function Hero({ onAskAcseAi }: HeroProps) {
  const { t } = useTranslation('landing')
  return (
    <section id="top" className="relative overflow-hidden bg-background">
      <div className="container relative grid items-center gap-14 py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-20">
        {/* Left: copy */}
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
            {t('hero.badge')}
          </span>

          {/* The three lines are spans, not a wrapped sentence: the break points
              are part of the design (the blue line has to stand alone), and
              leaving it to `text-balance` reflows them at every breakpoint. */}
          <h1 className="mt-4 text-[2.25rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-brand-navy sm:text-5xl lg:text-[3.5rem] dark:text-white">
            <span className="block">{t('hero.titleLine1')}</span>
            <span className="block text-brand-cyan">{t('hero.titleLine2')}</span>
            <span className="block">{t('hero.titleLine3')}</span>
          </h1>

          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
            {t('hero.subtitle')}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button size="lg" onClick={onAskAcseAi} className="group rounded-full px-7">
              {t('common.askAcseAi')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <a
              href="#platform"
              className="rounded-md px-1 py-2 text-[15px] font-semibold text-brand-navy underline-offset-4 outline-none transition-colors hover:text-brand-cyan focus-visible:ring-2 focus-visible:ring-brand-cyan dark:text-slate-200 dark:hover:text-brand-cyan"
            >
              {t('hero.seePlatform')}
            </a>
          </div>

          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
            {stats.map((s) => (
              <div key={s.labelKey}>
                <dt className="text-[2rem] font-extrabold leading-none tracking-tight text-brand-cyan">
                  {s.value}
                </dt>
                <dd className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                  {t(s.labelKey)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right: assistant still */}
        <div className="animate-fade-in [animation-delay:120ms]">
          <AssistantPreview />
        </div>
      </div>
    </section>
  )
}
