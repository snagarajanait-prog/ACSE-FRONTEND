/**
 * Site footer. Navy in both palettes, like the navbar — the page is bookended by
 * brand surfaces regardless of theme.
 */

import Logo from '@/components/Logo'

const groups = [
  {
    title: 'Platform',
    links: [
      { label: 'Customer service AI', href: '#platform' },
      { label: 'Billing automation', href: '#billing' },
      { label: 'Field operations', href: '#platform' },
      { label: 'Integrations', href: '#platform' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About ACSE', href: '#contact' },
      { label: 'Case studies', href: '#contact' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Try it',
    links: [
      { label: 'Use cases', href: '#use-cases' },
      { label: 'Platform', href: '#platform' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-brand-navydeep text-white/70">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              AI-powered automation for utility customer service, billing exceptions, and field
              operations.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-sm font-semibold text-white">{g.title}</p>
              <ul className="mt-3 space-y-0.5">
                {g.links.map((l) => (
                  <li key={l.label}>
                    {/* inline-block + py gives a ~32px tap target; a bare inline
                        <a> is only as tall as its 19px line box. */}
                    <a
                      href={l.href}
                      className="inline-block py-1.5 text-sm text-white/55 transition-colors hover:text-brand-cyan"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center">
          <p>© 2026 ACSE Solutions · Product preview — all data shown is non-production.</p>
          <p>Runs on Oracle Cloud Infrastructure</p>
        </div>
      </div>
    </footer>
  )
}
