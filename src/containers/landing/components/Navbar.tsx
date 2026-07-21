/**
 * Sticky top nav — glass over whatever it is scrolled across.
 *
 * It follows the theme rather than staying navy: the hero below it is now a
 * light, airy surface, and a solid brand slab sitting on top of that reads as a
 * seam rather than a header. The border and shadow only appear once scrolled, so
 * at rest it dissolves into the hero.
 */

import { useEffect, useState } from 'react'
import { Menu, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/utils/cn'

const links = [
  { href: '#platform', labelKey: 'nav.platform' },
  { href: '#use-cases', labelKey: 'nav.useCases' },
  { href: '#billing', labelKey: 'nav.billing' },
  { href: '#contact', labelKey: 'nav.about' },
]

interface NavbarProps {
  onAskAcseAi: () => void
}

export default function Navbar({ onAskAcseAi }: NavbarProps) {
  const { t } = useTranslation('landing')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl transition-colors',
        scrolled
          ? 'border-slate-200/80 shadow-sm dark:border-white/10'
          : 'border-transparent',
      )}
    >
      <nav className="container flex h-[70px] items-center justify-between">
        <a href="#top" className="shrink-0">
          <Logo />
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[15px] font-medium text-slate-600 transition-colors hover:text-brand-cyan dark:text-slate-300 dark:hover:text-brand-cyan"
              >
                {t(l.labelKey)}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button onClick={onAskAcseAi} className="rounded-full px-5">
            <Sparkles className="h-4 w-4" />
            {t('common.askAcseAi')}
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            className="grid h-10 w-10 place-items-center rounded-md text-slate-600 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:text-slate-300 dark:hover:bg-white/10"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t('nav.toggleMenu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-background px-6 py-4 md:hidden dark:border-white/10">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-2 py-2.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  {t(l.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => {
              setMobileOpen(false)
              onAskAcseAi()
            }}
            className="mt-3 w-full rounded-full"
          >
            <Sparkles className="h-4 w-4" />
            {t('common.askAcseAi')}
          </Button>
        </div>
      )}
    </header>
  )
}
