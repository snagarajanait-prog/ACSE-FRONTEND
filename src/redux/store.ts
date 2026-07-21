/**
 * Store composition. Every slice is mounted under its key from `reduxName`.
 * Add a slice = add its key to the registry and one line here.
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { STORAGE_KEYS } from '@/constants/constants'
import { reduxName } from '@/constants/reduxConstants'
import dataSourceReducer from '@/redux/dataSourceSlice'
import demoReducer from '@/redux/demoSlice'
import settingsReducer from '@/redux/settingsSlice'
import userReducer from '@/redux/userSlice'
import type { User } from '@/types'
import { storage } from '@/utils/storage'

const rootReducer = combineReducers({
  [reduxName.user]: userReducer,
  [reduxName.demo]: demoReducer,
  [reduxName.dataSource]: dataSourceReducer,
  [reduxName.settings]: settingsReducer,
})

// Restore a persisted sign-in synchronously, before the first render, so a
// refresh reopens straight into the admin panel instead of flashing its login.
// Only the user slice is seeded; every other slice starts from its own initial
// state. `useAdminAuth` writes and clears the same key.
const sessionUser = storage.get<User>(STORAGE_KEYS.session)

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: sessionUser
    ? { [reduxName.user]: { current: sessionUser, isAuthenticated: true } }
    : undefined,
})

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
