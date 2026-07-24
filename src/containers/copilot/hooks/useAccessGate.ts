/**
 * The identity gate that sits between the list of values and the chat.
 *
 * Whether an account is challenged at all is the active mode's call: modes with
 * `promptsForOtp` ask for an email and then a one-time code, while a mode wired
 * to a live, already-authenticated session skips both — its code was sent and
 * confirmed before the chat opened (see DATA_SOURCE_META).
 *
 * Like the code step inside the conversation, any six digits are accepted. The
 * point is to show the challenge, not to gatekeep a demo.
 */

import { useCallback } from 'react'
import { findAccount, findCustomer, type Account, type Customer } from '@/data/customers'
import { DATA_SOURCE_META } from '@/redux/dataSourceSlice'
import {
  beginVerification,
  cancelVerification,
  editVerificationEmail,
  sendVerificationCode,
  setChatContext,
  type VerifyStep,
} from '@/redux/demoSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'

export interface AccessGate {
  /** The account held at the gate, or null when nothing is pending. */
  pending: { customer: Customer; account: Account } | null
  step: VerifyStep
  /** Address the code was "sent" to (set once the email step is done). */
  email: string
  /**
   * Called when an account is picked from the list. Modes that challenge stop at
   * the gate; the rest are granted straight through.
   */
  pick: (customerId: string, accountId: string) => void
  sendCode: (email: string) => void
  editEmail: () => void
  /** Accept the code and hand the chat context over. Any code is accepted. */
  submitCode: () => void
  cancel: () => void
}

export function useAccessGate(): AccessGate {
  const dispatch = useAppDispatch()
  const { pendingCustomerId, pendingAccountId, verifyStep, verifyEmail } = useAppSelector(
    (s) => s.demoSlice,
  )
  const source = useAppSelector((s) => s.dataSourceSlice.source)
  const challenges = DATA_SOURCE_META[source].promptsForOtp

  const customer = findCustomer(pendingCustomerId)
  const account = findAccount(customer, pendingAccountId)

  const pick = useCallback(
    (customerId: string, accountId: string) => {
      if (challenges) {
        dispatch(beginVerification({ customerId, accountId }))
      } else {
        dispatch(setChatContext({ customerId, accountId, via: 'session' }))
      }
    },
    [challenges, dispatch],
  )

  const sendCode = useCallback(
    (email: string) => dispatch(sendVerificationCode(email)),
    [dispatch],
  )

  const editEmail = useCallback(() => dispatch(editVerificationEmail()), [dispatch])

  const submitCode = useCallback(() => {
    if (!customer || !account) return
    dispatch(setChatContext({ customerId: customer.id, accountId: account.id, via: 'challenge' }))
  }, [account, customer, dispatch])

  const cancel = useCallback(() => dispatch(cancelVerification()), [dispatch])

  return {
    pending: customer && account ? { customer, account } : null,
    step: verifyStep,
    email: verifyEmail,
    pick,
    sendCode,
    editEmail,
    submitCode,
    cancel,
  }
}
