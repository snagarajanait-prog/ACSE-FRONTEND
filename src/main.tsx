/**
 * Boot: mount the React root. Keep this file thin — providers live in Entry.tsx.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import Entry from '@/Entry'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Entry>
      <App />
    </Entry>
  </StrictMode>,
)
