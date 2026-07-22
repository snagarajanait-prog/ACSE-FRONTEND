/**
 * The customer/account currently in context, resolved from the demo slice.
 *
 * Shared by both surfaces that render account context — the persistent
 * `AccountPanel` sidebar (lg+) and the compact `AccountRail` (below lg) — so the
 * two never disagree about who is in context.
 */

import { findAccount, findCustomer } from '@/data/customers'
import { useAppSelector } from '@/redux/hooks'

export function useAccountContext() {
  const { selectedCustomerId, selectedAccountId } = useAppSelector((s) => s.demoSlice)
  const customer = findCustomer(selectedCustomerId)
  const account = findAccount(customer, selectedAccountId)
  return { customer, account }
}
