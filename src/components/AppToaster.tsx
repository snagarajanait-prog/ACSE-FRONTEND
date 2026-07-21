/**
 * App-wide toast host (Sonner), pinned top-right.
 *
 * Mounted once in the provider tree so any feature can fire `toast.success` /
 * `toast.error` imperatively without threading state around. Theme is driven off
 * `useTheme` so toasts follow the app's manual light/dark toggle rather than the
 * OS setting — mount it INSIDE `ThemeProvider`.
 */

import { Toaster } from 'sonner'
import { useTheme } from '@/context/theme.context'

export default function AppToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      position="top-right"
      theme={theme}
      richColors
      closeButton
      toastOptions={{ className: 'font-sans' }}
    />
  )
}
