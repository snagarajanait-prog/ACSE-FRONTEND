/**
 * Typed Redux hooks. Always use these — never the untyped `useDispatch` /
 * `useSelector` straight from react-redux.
 */

import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/redux/store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
