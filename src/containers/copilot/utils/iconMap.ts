/**
 * Resolve a lucide icon by the string name stored in data, so `@/data/useCases`
 * stays presentation-free and never imports a component.
 */

import {
  ArrowLeftRight,
  CalendarClock,
  CloudOff,
  Droplets,
  HelpCircle,
  Power,
  PowerOff,
  TrendingUp,
  UserCog,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  Power,
  PowerOff,
  ArrowLeftRight,
  TrendingUp,
  CalendarClock,
  CloudOff,
  UserCog,
  Droplets,
}

export function getIcon(name: string): LucideIcon {
  return icons[name] ?? HelpCircle
}
