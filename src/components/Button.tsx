/**
 * The one button. Props in, events out — no store coupling.
 *
 * Renders an <a> when `href` is passed and a <button> otherwise, which is why
 * there is no `asChild`/Slot indirection: every link-shaped button in the design
 * is an anchor, so the prop decides the element directly.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'outline' | 'ghost'
export type ButtonSize = 'md' | 'lg' | 'icon'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:brightness-110 focus-visible:ring-primary',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
  ghost: 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9',
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Render as an anchor instead of a button. */
  href?: string
  type?: 'button' | 'submit'
  children?: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium outline-none transition',
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
