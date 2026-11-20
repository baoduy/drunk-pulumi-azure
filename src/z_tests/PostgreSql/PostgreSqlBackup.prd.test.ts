import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { isPrd } from '../../Common';
import { buildPostgreSqlServer } from '../_tools/flexServerHarness';

// DRK-2570 acceptance test, legacy PostgreSQL row of "PRD PostgreSQL and MySQL
// servers keep their backups inside the region". Runs only in the PRD pass of
// `pnpm test` (PULUMI_NODEJS_STACK=teststack-prd).
describe('Legacy PostgreSQL backups in a PRD stack (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, true, 'the PRD pass must run with a "prd" stack'));

  it('Scenario Outline: PRD PostgreSQL and MySQL servers keep their backups inside the region — "orders-db" on tier "GeneralPurpose" has geo-redundant backup turned off and keeps its backups for 30 days', async () => {
    const server = await buildPostgreSqlServer('orders-db-prd');
    assert.strictEqual(server.backup.geoRedundantBackup, 'Disabled');
    assert.strictEqual(server.backup.backupRetentionDays, 30);
  });
});
