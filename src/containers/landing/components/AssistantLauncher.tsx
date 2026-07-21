/**
 * The floating "Ask ACSE AI" launcher, bottom-right — the corner the React Query
 * devtools logo used to occupy (see the note at the bottom of `Entry.tsx`).
 *
 * It rests as a bare icon disc and grows into the full pill on hover, so it stays
 * one click from anywhere on the page without permanently covering content.
 *
 * How the growth works: the label is always in the DOM but clamped to `max-w-0`
 * with `overflow-hidden`, and hover/focus releases it to a fixed max-width. That
 * animates (a `width: auto` transition does not) and, because the text is never
 * removed, the button's accessible name is stable whether it is open or shut.
 * `group-focus-visible` mirrors every hover rule so keyboard users get the same
 * reveal — and on touch, where there is no hover, it simply stays a disc.
 *
 * Motion, all `motion-safe:` gated: a slow breathing halo marks it as live, and
 * one ping ring on mount draws the eye once, then stops.
 */

import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface AssistantLauncherProps {
  onAskAcseAi: () => void
}

export default function AssistantLauncher({ onAskAcseAi }: AssistantLauncherProps) {
  const { t } = useTranslation('landing')
  return (
    <button
      type="button"
      onClick={onAskAcseAi}
      aria-label={t('common.askAcseAi')}
      className={cn(
        'group fixed bottom-5 right-5 z-30 inline-flex items-center rounded-full p-2.5',
        'bg-brand-navy text-white shadow-[0_10px_30px_-8px_rgba(10,30,53,0.55)] ring-1 ring-white/10',
        'outline-none transition-[background-color,box-shadow,translate,scale] duration-300',
        'hover:-translate-y-0.5 hover:bg-brand-navy/95 hover:shadow-[0_16px_40px_-10px_rgba(44,165,217,0.55)]',
        'focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:translate-y-0 active:scale-95',
        'dark:bg-brand-cyan dark:text-brand-navydeep dark:ring-white/20',
        'motion-safe:animate-rise-in',
      )}
    >
      {/* Breathing halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-brand-cyan/30 blur-lg motion-safe:animate-orb-breathe"
      />

      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-cyan/20 dark:bg-brand-navydeep/15">
        {/* One-shot attention ring. */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 ring-brand-cyan/60 motion-safe:animate-ring-out"
        />
        <Sparkles className="h-4 w-4 text-brand-cyan transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 dark:text-brand-navydeep" />
      </span>

      {/* The hover and focus-visible rules are spelled out rather than built from
          a shared constant: Tailwind scans source text, so a class assembled at
          runtime is never emitted and the reveal would silently do nothing. */}
      <span
        className={cn(
          'max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-semibold tracking-tight opacity-0',
          'transition-all duration-300 ease-out',
          'group-hover:max-w-36 group-hover:pl-2.5 group-hover:pr-1.5 group-hover:opacity-100',
          'group-focus-visible:max-w-36 group-focus-visible:pl-2.5 group-focus-visible:pr-1.5 group-focus-visible:opacity-100',
        )}
      >
        {t('common.askAcseAi')}
      </span>
    </button>
  )
}
