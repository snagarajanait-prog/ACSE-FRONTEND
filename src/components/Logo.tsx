/**
 * The ACSE brand lockup.
 *
 * The artwork is `logo/Main_logo.svg` — the brand master. It is an SVG wrapper
 * around a single 638×220 raster, so it keeps a transparent background and sits
 * directly on whatever surface hosts it (navy navbar, dark footer, or a light
 * copilot header alike), while `<img>` scales it cleanly at any height and DPR.
 * See `src/assets/README.md`.
 *
 * `className` sets the image height (defaults to h-10); the aspect ratio (~2.9,
 * a wide lockup) is preserved via `w-auto`, so this occupies the same vertical
 * space at every call site — only the width follows the artwork.
 */

import logoUrl from '@/assets/logo/Main_logo.svg'
import { cn } from '@/utils/cn'

export interface LogoProps {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  return (
    <img
      src={logoUrl}
      alt="ACSE"
      width={638}
      height={220}
      className={cn('h-10 w-auto select-none', className)}
    />
  )
}
