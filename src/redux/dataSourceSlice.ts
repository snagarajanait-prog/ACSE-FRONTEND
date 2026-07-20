/**
 * The internal data-source toggle.
 *
 * - 'AUTONOMOUS': the AI reads/writes the synthetic demo store. This is what the
 *   public demo world always uses so the real billing application is never
 *   exposed or overloaded.
 * - 'C2M': the AI is wired to the real billing application. Used only internally
 *   to prove end-to-end functionality (and when showing a prospective customer).
 *
 * This switch must be controlled INTERNALLY ONLY — never a feature the end user
 * drives.
 *
 * Note the two vocabularies in DATA_SOURCE_META. The `label`/`short`/`system`
 * names are for the internal control only; anything rendered inside the
 * conversation uses the neutral `chat*` names, so the chat surface never names
 * an internal system.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { reduxName } from '@/constants/reduxConstants'

export type DataSource = 'AUTONOMOUS' | 'C2M'

interface DataSourceState {
  source: DataSource
}

const initialState: DataSourceState = {
  // Public demo defaults to the safe, synthetic Autonomous DB path.
  source: 'AUTONOMOUS',
}

const dataSourceSlice = createSlice({
  name: reduxName.dataSource,
  initialState,
  reducers: {
    setDataSource(state, action: PayloadAction<DataSource>) {
      state.source = action.payload
    },
    toggleDataSource(state) {
      state.source = state.source === 'C2M' ? 'AUTONOMOUS' : 'C2M'
    },
  },
})

export const { setDataSource, toggleDataSource } = dataSourceSlice.actions

export default dataSourceSlice.reducer

/** Human-facing metadata for whichever source is active. */
export const DATA_SOURCE_META: Record<
  DataSource,
  {
    /** Internal-control names. Never rendered inside the conversation. */
    label: string
    short: string
    system: string
    description: string
    /** Neutral names safe to render inside the conversation. */
    chatLabel: string
    chatShort: string
    chatSystem: string
    /**
     * Whether the customer has to key a one-time code in to verify identity.
     * The demo store has no portal session behind it, so it challenges; the live
     * path inherits an already-authenticated session and doesn't.
     */
    promptsForOtp: boolean
  }
> = {
  AUTONOMOUS: {
    label: 'Autonomous DB',
    short: 'ATP',
    system: 'Autonomous Transaction Processing',
    description:
      'Isolated data store. Safe for customer-facing sessions — the billing application is never touched.',
    chatLabel: 'the ACSE service platform',
    chatShort: 'STANDARD',
    chatSystem: 'ACSE Service Platform',
    promptsForOtp: true,
  },
  C2M: {
    label: 'C2M (live)',
    short: 'C2M',
    system: 'Oracle C2M application',
    description: 'Live end-to-end path. Internal use only — proves the flow against the real system.',
    chatLabel: 'the live service system',
    chatShort: 'LIVE',
    chatSystem: 'Live Service Platform',
    promptsForOtp: false,
  },
}
