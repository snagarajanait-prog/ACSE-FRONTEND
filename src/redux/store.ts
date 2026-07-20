/**
 * Store composition. Every slice is mounted under its key from `reduxName`.
 * Add a slice = add its key to the registry and one line here.
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { reduxName } from '@/constants/reduxConstants'
import dataSourceReducer from '@/redux/dataSourceSlice'
import demoReducer from '@/redux/demoSlice'
import userReducer from '@/redux/userSlice'

const rootReducer = combineReducers({
  [reduxName.user]: userReducer,
  [reduxName.demo]: demoReducer,
  [reduxName.dataSource]: dataSourceReducer,
})

export const store = configureStore({
  reducer: rootReducer,
})

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
