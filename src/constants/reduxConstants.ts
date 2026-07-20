/**
 * Slice-name registry. Every slice takes its `name` from here and `store.ts`
 * mounts it under the same key, so there are no magic strings anywhere.
 */

export const reduxName = {
  user: 'userSlice',
  demo: 'demoSlice',
  dataSource: 'dataSourceSlice',
} as const
