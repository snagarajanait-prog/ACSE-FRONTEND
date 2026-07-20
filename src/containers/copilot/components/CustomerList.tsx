/**
 * The "list of values" — the core concept of the demo: before any chat, the
 * visitor picks a synthetic customer/account, which becomes the assistant's
 * context. Picking does not grant it outright; it goes through the identity
 * gate first (see `useAccessGate`).
 */

import { useMemo, useState } from 'react'
import { ChevronRight, Search, User } from 'lucide-react'
import { useAccessGate } from '@/containers/copilot/hooks/useAccessGate'
import { formatCurrency } from '@/containers/copilot/utils/formatCurrency'
import { customers } from '@/data/customers'
import { cn } from '@/utils/cn'

export default function CustomerList() {
  const { pick } = useAccessGate()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.accounts.some((a) => a.id.toLowerCase().includes(q)),
    )
  }, [query])

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 md:px-6">
      <div className="shrink-0 pb-4 pt-8">
        <h2 className="text-xl font-semibold text-brand-navy dark:text-slate-100">
          Select a customer
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pick an account to set the assistant&apos;s context. These are non-production customer
          records — several have multiple accounts.
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search customers"
            placeholder="Search by name, customer no. or account no."
            className="h-11 w-full rounded-xl bg-white pl-9 pr-3 text-sm text-brand-navy outline-none ring-1 ring-slate-200 transition placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:bg-white/[0.04] dark:text-slate-100 dark:ring-white/10 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 space-y-3 overflow-y-auto pb-8">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-white/[0.03] dark:shadow-none dark:ring-white/10"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-navy/5 text-brand-navy dark:bg-brand-cyan/15 dark:text-brand-cyan">
                <User className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-brand-navy dark:text-slate-100">{c.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.id} · since {c.since}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {c.accounts.length} account{c.accounts.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {c.accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pick(c.id, a.id)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-brand-cyan/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan dark:hover:bg-white/[0.05]"
                >
                  <span className="shrink-0 rounded-md bg-brand-cyan/10 px-2 py-0.5 text-[11px] font-medium text-brand-cyan">
                    {a.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {a.id}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {a.serviceAddress}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        a.balance > 0
                          ? 'text-brand-navy dark:text-slate-100'
                          : 'text-emerald-700 dark:text-emerald-400',
                      )}
                    >
                      {a.balance > 0 ? formatCurrency(a.balance) : '$0.00'}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {a.balance > 0 ? 'due' : 'settled'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      a.status === 'Active' &&
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
                      a.status === 'Pending' &&
                        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                      a.status === 'Final' &&
                        'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400',
                    )}
                  >
                    {a.status}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-cyan dark:text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No customers match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  )
}
