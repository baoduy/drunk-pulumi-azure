import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { isPrd } from '../../Common';
import { buildPostgreSqlServer } from '../_tools/flexServerHarness';

// DRK-2570 acceptance test, legacy PostgreSQL row of "outside PRD the touched
// defaults stay as they are today" (the mocked stack "teststack" is not PRD).
describe('Legacy PostgreSQL backups outside PRD (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, false, 'this file must run with a non-PRD stack'));

  it('Scenario Outline: outside PRD the touched defaults stay as they are today — "orders-db" has geo-redundant backup off and keeps backups for 7 days', async () => {
    const server = await buildPostgreSqlServer('orders-db-dev');
    assert.strictEqual(server.backup.geoRedundantBackup, 'Disabled');
    assert.strictEqual(server.backup.backupRetentionDays, 7);
  });
});
