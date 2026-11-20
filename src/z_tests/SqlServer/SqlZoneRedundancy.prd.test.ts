import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { isPrd } from '../../Common';
import {
  buildCopiedDb,
  buildElasticPool,
  buildPooledDb,
  buildReplicaDb,
  buildStandaloneDb,
} from './sqlHarness';

// DRK-2570 acceptance tests, PRD rows of the legacy library. This file runs
// only in the PRD pass of `pnpm test` (PULUMI_NODEJS_STACK=teststack-prd).
// "No zone redundancy setting" means the zoneRedundant key is absent from the
// resource inputs (spec rule R1), never `false`.

describe('Legacy SQL in a PRD stack (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, true, 'the PRD pass must run with a "prd" stack'));

  describe('Scenario: the legacy library keeps its PRD SQL backup schedule', () => {
    it('"orders" on "S0" keeps zone-redundant backup storage, a differential backup every 12 hours and 7 days of point-in-time restore', async () => {
      const { database, shortTermPolicy } = await buildStandaloneDb('orders-s0-backup', 'S0');

      assert.strictEqual(database.requestedBackupStorageRedundancy, 'Zone');
      assert.strictEqual(shortTermPolicy.diffBackupIntervalInHours, 12);
      assert.strictEqual(shortTermPolicy.retentionDays, 7);
    });
  });

  describe('Scenario: a legacy PRD Premium elastic pool is zone-redundant', () => {
    it('"shared-pool" on tier "Premium" with 500 eDTU is zone-redundant', async () => {
      const pool = await buildElasticPool('pool-premium-500', { name: 'Premium', capacity: 500 });

      assert.deepStrictEqual(pool.sku, { name: 'PremiumPool', tier: 'Premium', capacity: 500 });
      assert.strictEqual(pool.zoneRedundant, true);
    });
  });

  describe('Scenario Outline: a database in a legacy Premium pool may grow to Azure\'s per-database limit', () => {
    const examples = [
      { poolSize: 125, databaseLimit: 125 },
      { poolSize: 250, databaseLimit: 250 },
      { poolSize: 500, databaseLimit: 500 },
      { poolSize: 1000, databaseLimit: 1000 },
      { poolSize: 1500, databaseLimit: 1000 },
      { poolSize: 2000, databaseLimit: 1750 },
      { poolSize: 2500, databaseLimit: 1750 },
      { poolSize: 3000, databaseLimit: 1750 },
      { poolSize: 3500, databaseLimit: 1750 },
      { poolSize: 4000, databaseLimit: 4000 },
    ] as const;

    for (const { poolSize, databaseLimit } of examples) {
      it(`a ${poolSize} eDTU Premium pool lets each database use up to ${databaseLimit} eDTU`, async () => {
        const pool = await buildElasticPool(`pool-limit-${poolSize}`, {
          name: 'Premium',
          capacity: poolSize,
        });

        assert.strictEqual(pool.perDatabaseSettings.maxCapacity, databaseLimit);
      });
    }
  });

  describe('Scenario Outline: a legacy PRD Premium standalone database is zone-redundant', () => {
    for (const size of ['P1', 'P2', 'P4', 'P6', 'P11'] as const) {
      it(`"orders" on "${size}" is zone-redundant`, async () => {
        const { database } = await buildStandaloneDb(`orders-${size.toLowerCase()}`, size);

        assert.strictEqual(database.sku.name, size);
        assert.strictEqual(database.zoneRedundant, true);
      });
    }

    it('"orders" copied onto "P1" is zone-redundant', async () => {
      const database = await buildCopiedDb('orders-copy-p1', 'P1');

      assert.strictEqual(database.createMode, 'Copy');
      assert.strictEqual(database.zoneRedundant, true);
    });

    it('"orders" replicated onto "P1" is zone-redundant', async () => {
      const database = await buildReplicaDb('orders-replica-p1', 'P1');

      assert.strictEqual(database.createMode, 'Secondary');
      assert.strictEqual(database.zoneRedundant, true);
    });
  });

  describe('Scenario Outline: legacy Basic and Standard SQL stays without zone redundancy in PRD', () => {
    it('the elastic pool "shared-pool" on tier "Standard" with 100 eDTU gets no zone redundancy setting', async () => {
      const pool = await buildElasticPool('pool-standard-100', { name: 'Standard', capacity: 100 });

      assert.deepStrictEqual(pool.sku, { name: 'StandardPool', tier: 'Standard', capacity: 100 });
      assert.strictEqual(pool.perDatabaseSettings.maxCapacity, 100);
      assert.strictEqual(pool.zoneRedundant, undefined);
    });

    it('the elastic pool "shared-pool" on tier "Basic" with 100 eDTU gets no zone redundancy setting', async () => {
      const pool = await buildElasticPool('pool-basic-100', { name: 'Basic', capacity: 100 });

      assert.deepStrictEqual(pool.sku, { name: 'BasicPool', tier: 'Basic', capacity: 100 });
      assert.strictEqual(pool.perDatabaseSettings.maxCapacity, 5);
      assert.strictEqual(pool.zoneRedundant, undefined);
    });

    for (const size of ['S0', 'S1', 'S2', 'S3', 'Basic'] as const) {
      it(`the standalone database "orders" on size "${size}" gets no zone redundancy setting`, async () => {
        const { database } = await buildStandaloneDb(`orders-std-${size.toLowerCase()}`, size);

        assert.strictEqual(database.sku.name, size);
        assert.strictEqual(database.zoneRedundant, undefined);
      });
    }

    it('the database "orders" inside the Premium elastic pool "shared-pool" gets no zone redundancy setting', async () => {
      const database = await buildPooledDb('orders-pooled', { name: 'Premium', capacity: 500 });

      assert.ok(database.elasticPoolId, 'expected "orders" to sit in "shared-pool"');
      assert.strictEqual(database.zoneRedundant, undefined);
    });

    // Rule R2: placement decides first — a pooled database on a Premium size
    // still follows its pool.
    it('a database on size "P1" inside the Premium elastic pool gets no zone redundancy setting', async () => {
      const database = await buildPooledDb('orders-pooled-p1', { name: 'Premium', capacity: 500 }, 'P1');

      assert.ok(database.elasticPoolId, 'expected the database to sit in the pool');
      assert.strictEqual(database.zoneRedundant, undefined);
    });
  });
});
