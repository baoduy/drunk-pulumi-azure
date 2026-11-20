import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { isPrd } from '../../Common';
import { buildElasticPool, buildStandaloneDb } from './sqlHarness';

// DRK-2570 acceptance tests, outside-PRD rows of the legacy library (the
// mocked stack is "teststack", which is not a PRD stack). "Not
// zone-redundant" means the zoneRedundant key is absent from the resource
// inputs (spec rule R1), never `false`.

describe('Legacy SQL outside PRD (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, false, 'this file must run with a non-PRD stack'));

  describe('Scenario Outline: outside PRD the touched defaults stay as they are today', () => {
    it('the Premium elastic pool "shared-pool" of 500 eDTU is not zone-redundant', async () => {
      const pool = await buildElasticPool('pool-dev-premium-500', { name: 'Premium', capacity: 500 });

      assert.deepStrictEqual(pool.sku, { name: 'PremiumPool', tier: 'Premium', capacity: 500 });
      assert.strictEqual(pool.zoneRedundant, undefined);
    });

    it('the standalone database "orders" on size "P1" is not zone-redundant', async () => {
      const { database } = await buildStandaloneDb('orders-dev-p1', 'P1');

      assert.strictEqual(database.sku.name, 'P1');
      assert.strictEqual(database.zoneRedundant, undefined);
    });

    it('the Azure SQL database "orders" on size "S0" keeps local backup storage, a differential backup every 24 hours and 7 days of point-in-time restore', async () => {
      const { database, shortTermPolicy } = await buildStandaloneDb('orders-dev-s0', 'S0');

      assert.strictEqual(database.requestedBackupStorageRedundancy, 'Local');
      assert.strictEqual(shortTermPolicy.diffBackupIntervalInHours, 24);
      assert.strictEqual(shortTermPolicy.retentionDays, 7);
    });
  });
});

// tsx strips types, so the type-level refusal is proven by running the
// TypeScript compiler over a fixture: every Premium size must compile, and the
// `@ts-expect-error` lines for Premium 100 and Basic 125 must still be errors.
describe('Scenario: a legacy Premium elastic pool refuses a size that is not a Premium size', () => {
  it('the check fails because 100 eDTU is not a Premium pool size', function () {
    this.timeout(120000);
    const tsconfig = path.join(__dirname, 'fixtures', 'tsconfig.json');
    // typescript 7 exports no `bin/tsc` subpath, so resolve it from the repo root.
    const tsc = path.resolve(__dirname, '../../../node_modules/typescript/bin/tsc');

    const result = spawnSync(
      process.execPath,
      [tsc, '--noEmit', '-p', tsconfig],
      { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } },
    );

    assert.strictEqual(result.status, 0, `tsc reported:\n${result.stdout}${result.stderr}`);
  });
});
