/**
 * User/session state. Redux owns CLIENT state — state the app itself is the
 * source of truth for. Data fetched from the backend belongs in TanStack Query,
 * not here.
 */

import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { reduxName } from '@/constants/reduxConstants'
import type { User } from '@/types'

interface UserState {
  current: User | null
  isAuthenticated: boolean
}

const initialState: UserState = {
  current: null,
  isAuthenticated: false,
}

const userSlice = createSlice({
  name: reduxName.user,
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.current = action.payload
      state.isAuthenticated = true
    },
    clearUser: (state) => {
      state.current = null
      state.isAuthenticated = false
    },
  },
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer
