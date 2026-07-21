/**
 * Language picker. Reads the shared i18next instance rather than a prop, so the
 * landing navbar, copilot header, admin shell and login gate all stay in sync
 * without any of them owning the state — the same pattern as `ThemeToggle`.
 *
 * Selecting a language calls `i18n.changeLanguage`; `I18nProvider` handles the
 * document side effects (persistence, `<html dir>`), so this stays pure
 * presentation. Layout uses logical utilities (`end-*`, `text-start`) so the
 * popover mirrors correctly under RTL.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/i18n/config'
import { cn } from '@/utils/cn'

export interface LanguageSwitcherProps {
  className?: string
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (code: string) => {
    void i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={t('language.label')}
        aria-label={t('language.label')}
        className={cn(
          'grid h-9 w-9 place-items-center rounded-md text-slate-500 outline-none transition-colors',
          'hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan',
          'dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
        )}
      >
        <Languages className="h-4 w-4" />
      </button>

      {open && (
        <ul
          id={menuId}
          role="listbox"
          aria-label={t('language.label')}
          className="absolute end-0 z-50 mt-2 min-w-[9rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10 dark:border-white/10 dark:bg-brand-navy dark:shadow-black/40"
        >
          {LANGUAGES.map((lng) => {
            const active = lng.code === current.code
            return (
              <li key={lng.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  lang={lng.code}
                  onClick={() => pick(lng.code)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm transition-colors',
                    'hover:bg-slate-100 dark:hover:bg-white/10',
                    active
                      ? 'font-semibold text-brand-navy dark:text-white'
                      : 'text-slate-600 dark:text-slate-300',
                  )}
                >
                  <span>{lng.nativeLabel}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-brand-cyan" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
