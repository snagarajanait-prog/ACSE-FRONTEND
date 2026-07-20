/**
 * REFERENCE FEATURE — copy this folder's shape for every new screen:
 *
 *   containers/<feature>/
 *   ├── index.tsx        entry component — wires hooks to components, thin view
 *   ├── components/      UI used only by this feature (+ index.ts barrel)
 *   ├── hooks/           this feature's stateful logic
 *   └── utils/           this feature's pure helpers
 *
 * The entry component should read like a table of contents. All data and state
 * logic belongs in the hook.
 */

import { DashboardHeader } from '@/containers/dashboard/components'
import { useDashboard } from '@/containers/dashboard/hooks/useDashboard'

export default function Dashboard() {
  const { user, isLoading } = useDashboard()

  return (
    <div className="p-6">
      <DashboardHeader title="Dashboard" subtitle={user ? `Signed in as ${user.name}` : undefined} />
      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
    </div>
  )
}
