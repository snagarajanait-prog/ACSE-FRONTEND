/**
 * The ACSE Solutions lockup.
 *
 * The artwork is `acse-solutions-logo.png`, trimmed and downsampled from the
 * brand master `ACSE PNG.png`. The master is an 8334x8334 RGBA square in which
 * the mark occupies only 29% of the canvas — used directly, `h-8 w-auto` would
 * size the padded square rather than the mark and render it about 12px tall, at
 * a cost of 492KB. See `src/assets/README.md` for how to regenerate it.
 *
 * The PNG keeps its transparent background, so it sits directly on whatever
 * surface hosts it — navy navbar, dark footer, or a light copilot header alike.
 *
 * `className` sets the image height (defaults to h-10); the aspect ratio is
 * preserved via `w-auto`.
 *
 * The default is h-10 rather than h-8 because this lockup is stacked (cloud over
 * wordmark, aspect ~1.9) where the previous one was wide (~2.9). At an identical
 * height the stacked mark reads much smaller, so it needs the extra rise to keep
 * the same presence beside 15px nav text.
 */

import logoUrl from '@/assets/acse-solutions-logo.png'
import { cn } from '@/utils/cn'

export interface LogoProps {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt="ACSE Solutions"
      width={900}
      height={470}
      className={cn('h-10 w-auto select-none', className)}
    />
  )
}
