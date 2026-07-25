/**
 * Joins conditional Tailwind class names, with conflicting-class merging.
 *
 * Upgraded from the hand-rolled joiner (as its own comment sanctioned) because
 * the design system leans on override-by-prop: a component sets a base class and
 * the caller passes `className` to beat it (`Button` variants, `Chip`,
 * `Modal`). A plain join emits both classes and lets CSS source order pick
 * the winner, which makes overrides silently unreliable; `twMerge` resolves them
 * last-wins. It also unlocks object/array syntax via `clsx`.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
