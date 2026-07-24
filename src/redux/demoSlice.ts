/**
 * The assistant demo's own state: which customer/account is in context, how that
 * context cleared the identity gate, and any scenario queued for auto-play.
 *
 * This is client state, not server state, so it belongs here rather than in
 * TanStack Query — nothing in this slice is fetched.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { reduxName } from '@/constants/reduxConstants'

/** Which step of the identity gate is showing. */
export type VerifyStep = 'email' | 'otp'

/**
 * How the live chat context cleared the identity gate.
 *
 * - 'challenge': the customer keyed a one-time code in at the gate.
 * - 'session': no gate — the mode inherits an already-authenticated session, so
 *   the code was sent and confirmed before the chat ever opened.
 */
export type VerifiedVia = 'challenge' | 'session'

/** Hand the chat context to a surface, recording how identity was settled. */
export interface GrantPayload {
  customerId: string
  accountId: string
  via: VerifiedVia
}

/** A contact-form submission captured by the landing page. */
export interface Lead {
  name: string
  email: string
  organization: string
  interest: string
}

interface DemoState {
  selectedCustomerId: string | null
  /** Account within the selected customer that sets the assistant's context. */
  selectedAccountId: string | null
  /**
   * Account picked from the list but not yet through the identity gate. While
   * this is set, the copilot shows the verification steps in place of its list
   * — it is what holds the pick back from becoming the chat context.
   */
  pendingCustomerId: string | null
  pendingAccountId: string | null
  verifyStep: VerifyStep
  /** Address the code was "sent" to — echoed on the code step and after. */
  verifyEmail: string
  /** How the live context was verified; null when there is no context. */
  verifiedVia: VerifiedVia | null
  /** A use-case the user asked to auto-play (storyboard), or null. */
  activeScenarioId: string | null
  /** Captured contact/demo-request leads. */
  leads: Lead[]
}

const initialState: DemoState = {
  selectedCustomerId: null,
  selectedAccountId: null,
  pendingCustomerId: null,
  pendingAccountId: null,
  verifyStep: 'email',
  verifyEmail: '',
  verifiedVia: null,
  activeScenarioId: null,
  leads: [],
}

/** Promote the pending pick to the live chat context and tear the gate down. */
function grantContext(state: DemoState, { customerId, accountId, via }: GrantPayload) {
  state.selectedCustomerId = customerId
  state.selectedAccountId = accountId
  state.verifiedVia = via
  state.pendingCustomerId = null
  state.pendingAccountId = null
  state.verifyStep = 'email'
  // NOTE: `activeScenarioId` is deliberately NOT cleared here. A use-case card on
  // the landing page queues a scenario and *then* sends the visitor through the
  // list and the identity gate, so the queue has to outlive the grant — clearing
  // it here would silently drop the very scenario that was asked for. The engine
  // clears it itself once it has played (see the auto-play effect).
}

/** Drop both the gate and whatever it had already verified. */
function resetVerification(state: DemoState) {
  state.pendingCustomerId = null
  state.pendingAccountId = null
  state.verifyStep = 'email'
  state.verifyEmail = ''
  state.verifiedVia = null
}

const demoSlice = createSlice({
  name: reduxName.demo,
  initialState,
  reducers: {
    /**
     * Hold an account at the identity gate: the pick is parked here until a code
     * is entered. Only modes that challenge get this far (see `promptsForOtp`).
     */
    beginVerification(state, action: PayloadAction<{ customerId: string; accountId: string }>) {
      state.pendingCustomerId = action.payload.customerId
      state.pendingAccountId = action.payload.accountId
      state.verifyStep = 'email'
      state.verifyEmail = ''
    },
    /** Address keyed in: "send" the code and move to the entry boxes. */
    sendVerificationCode(state, action: PayloadAction<string>) {
      state.verifyEmail = action.payload
      state.verifyStep = 'otp'
    },
    /** Step back from the entry boxes to correct the address. */
    editVerificationEmail(state) {
      state.verifyStep = 'email'
    },
    /** Abandon the gate and return to the list of values. */
    cancelVerification(state) {
      resetVerification(state)
    },
    /** Set the assistant's context (customer + account) once identity is settled. */
    setChatContext(state, action: PayloadAction<GrantPayload>) {
      grantContext(state, action.payload)
    },
    /** Clear the context — back to the list of values ("Change customer"). */
    clearChatContext(state) {
      state.selectedCustomerId = null
      state.selectedAccountId = null
      state.activeScenarioId = null
      resetVerification(state)
    },
    /** Switch account within the customer already in context. */
    setAccount(state, action: PayloadAction<string>) {
      state.selectedAccountId = action.payload
      state.activeScenarioId = null
    },
    /** Queue a storyboard to auto-play once the copilot has a context. */
    playScenario(state, action: PayloadAction<string>) {
      state.activeScenarioId = action.payload
    },
    clearScenario(state) {
      state.activeScenarioId = null
    },
    addLead(state, action: PayloadAction<Lead>) {
      state.leads.push(action.payload)
    },
  },
})

export const {
  beginVerification,
  sendVerificationCode,
  editVerificationEmail,
  cancelVerification,
  setChatContext,
  clearChatContext,
  setAccount,
  playScenario,
  clearScenario,
  addLead,
} = demoSlice.actions

export default demoSlice.reducer
