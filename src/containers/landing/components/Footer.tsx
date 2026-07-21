/**
 * Site footer. Navy in both palettes, like the navbar — the page is bookended by
 * brand surfaces regardless of theme.
 */

import { useTranslation } from 'react-i18next'
import Logo from '@/components/Logo'

const groups = [
  {
    titleKey: 'footer.groups.platform',
    links: [
      { labelKey: 'footer.links.customerServiceAi', href: '#platform' },
      { labelKey: 'footer.links.billingAutomation', href: '#billing' },
      { labelKey: 'footer.links.fieldOperations', href: '#platform' },
      { labelKey: 'footer.links.integrations', href: '#platform' },
    ],
  },
  {
    titleKey: 'footer.groups.company',
    links: [
      { labelKey: 'footer.links.aboutAcse', href: '#contact' },
      { labelKey: 'footer.links.caseStudies', href: '#contact' },
      { labelKey: 'footer.links.contact', href: '#contact' },
    ],
  },
  {
    titleKey: 'footer.groups.tryIt',
    links: [
      { labelKey: 'footer.links.useCases', href: '#use-cases' },
      { labelKey: 'footer.links.platform', href: '#platform' },
    ],
  },
]

export default function Footer() {
  const { t } = useTranslation('landing')
  return (
    <footer className="bg-brand-navydeep text-white/70">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              {t('footer.tagline')}
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.titleKey}>
              <p className="text-sm font-semibold text-white">{t(g.titleKey)}</p>
              <ul className="mt-3 space-y-0.5">
                {g.links.map((l) => (
                  <li key={l.labelKey}>
                    {/* inline-block + py gives a ~32px tap target; a bare inline
                        <a> is only as tall as its 19px line box. */}
                    <a
                      href={l.href}
                      className="inline-block py-1.5 text-sm text-white/55 transition-colors hover:text-brand-cyan"
                    >
                      {t(l.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center">
          <p>{t('footer.copyright')}</p>
          <p>{t('footer.runsOn')}</p>
        </div>
      </div>
    </footer>
  )
}
