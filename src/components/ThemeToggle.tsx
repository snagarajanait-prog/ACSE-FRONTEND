/**
 * Light/dark switch. Shows the icon of the palette it will switch TO, which is
 * the convention users read fastest (a sun means "go light").
 *
 * Reads the global ThemeProvider rather than taking a prop, so the landing
 * navbar and the copilot header stay in sync without either owning the state.
 */

import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/context/theme.context'
import { cn } from '@/utils/cn'

export interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useTranslation('common')
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? t('theme.toLight') : t('theme.toDark')

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-md text-slate-500 outline-none transition-colors',
        'hover:bg-slate-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan',
        'dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
        className,
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
