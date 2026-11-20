// Type-level fixture for DRK-2570 "a legacy Premium elastic pool refuses a
// size that is not a Premium size". Compiled with `tsc --noEmit` by
// SqlZoneRedundancy.test.ts, never executed: every line without a directive
// must compile, and every `@ts-expect-error` line must stay a type error.
import type { SqlElasticPoolType } from '../../../Sql';

export const premiumSizes: SqlElasticPoolType[] = [
  { name: 'Premium', capacity: 125 },
  { name: 'Premium', capacity: 250 },
  { name: 'Premium', capacity: 500 },
  { name: 'Premium', capacity: 1000 },
  { name: 'Premium', capacity: 1500 },
  { name: 'Premium', capacity: 2000 },
  { name: 'Premium', capacity: 2500 },
  { name: 'Premium', capacity: 3000 },
  { name: 'Premium', capacity: 3500 },
  { name: 'Premium', capacity: 4000 },
];

export const basicAndStandardSizes: SqlElasticPoolType[] = [
  { name: 'Basic', capacity: 50 },
  { name: 'Standard', capacity: 1200 },
];

// @ts-expect-error 100 eDTU is not a Premium pool size
export const premium100: SqlElasticPoolType = { name: 'Premium', capacity: 100 };

// @ts-expect-error 125 eDTU is not a Basic pool size
export const basic125: SqlElasticPoolType = { name: 'Basic', capacity: 125 };
