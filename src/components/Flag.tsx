/**
 * Small language flags for the `<LanguageSwitcher>` list.
 *
 * Rendered as inline SVG rather than flag emoji ON PURPOSE: regional-indicator
 * emoji (🇫🇷 …) don't have glyphs on Windows/Chrome and fall back to bare letter
 * pairs ("FR"), so an SVG is the only way a real flag shows on every platform.
 *
 * Each flag maps to a `LanguageCode`; English uses the Union Jack. Shapes are
 * intentionally simple (Spain omits the coat of arms) — at ~20px it reads as the
 * flag without the detail. `preserveAspectRatio="none"` lets every flag fill the
 * same fixed box so the list stays aligned.
 */

import { useId } from 'react'
import type { LanguageCode } from '@/i18n/config'
import { cn } from '@/utils/cn'

interface FlagProps {
  code: LanguageCode
  className?: string
}

export default function Flag({ code, className }: FlagProps) {
  const cls = cn(
    'block h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10 dark:ring-white/20',
    className,
  )

  switch (code) {
    case 'fr':
      return (
        <svg viewBox="0 0 3 2" className={cls} aria-hidden preserveAspectRatio="none">
          <rect width="3" height="2" fill="#fff" />
          <rect width="1" height="2" fill="#0055A4" />
          <rect width="1" height="2" x="2" fill="#EF4135" />
        </svg>
      )
    case 'de':
      return (
        <svg viewBox="0 0 5 3" className={cls} aria-hidden preserveAspectRatio="none">
          <rect width="5" height="1" y="0" fill="#000" />
          <rect width="5" height="1" y="1" fill="#DD0000" />
          <rect width="5" height="1" y="2" fill="#FFCE00" />
        </svg>
      )
    case 'es':
      return (
        <svg viewBox="0 0 3 2" className={cls} aria-hidden preserveAspectRatio="none">
          <rect width="3" height="2" fill="#AA151B" />
          <rect width="3" height="1" y="0.5" fill="#F1BF00" />
        </svg>
      )
    case 'en':
    default:
      return <UnionJack className={cls} />
  }
}

/** The UK flag — the compact, well-known counter-changed SVG. `useId` keeps the
 *  two clip-path ids unique so multiple copies on a page never collide. */
function UnionJack({ className }: { className?: string }) {
  const id = useId()
  const clip = `${id}-c`
  const counter = `${id}-t`
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden preserveAspectRatio="none">
      <clipPath id={clip}>
        <rect width="60" height="30" />
      </clipPath>
      <clipPath id={counter}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${counter})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}
