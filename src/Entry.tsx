/**
 * The provider tree — composed ONCE, here. Adding global state means wrapping
 * one more provider in this file.
 *
 * Order: Redux → Query → Router → Theme → Loader.
 *
 * Loader sits innermost so its overlay renders inside the themed subtree — the
 * loading screen has to honour `.dark` like everything else.
 */

import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import BootSplash from '@/components/BootSplash'
import { LoaderProvider } from '@/context/LoaderContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { queryClient } from '@/lib/queryClient'
import { store } from '@/redux/store'

export default function Entry({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <LoaderProvider>
              {children}
              {/* Above the router on purpose — it plays on boot, not per route. */}
              <BootSplash />
            </LoaderProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}

/**
 * The React Query devtools are deliberately NOT mounted: their floating logo sits
 * in the bottom-right corner, which is where the assistant launcher lives. The
 * package is still installed — to debug a query, re-add:
 *
 *   import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
 *   import config from '@/config'
 *   …
 *   {config.isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
 */
