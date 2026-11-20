import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { isPrd } from '../../Common';
import { buildMySqlServer } from '../_tools/flexServerHarness';

// DRK-2570 acceptance test, legacy MySQL row of "outside PRD the touched
// defaults stay as they are today" (the mocked stack "teststack" is not PRD).
describe('Legacy MySQL backups outside PRD (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, false, 'this file must run with a non-PRD stack'));

  it('Scenario Outline: outside PRD the touched defaults stay as they are today — "orders-db" has geo-redundant backup off and keeps backups for 1 day', async () => {
    const server = await buildMySqlServer('orders-db-dev');
    assert.strictEqual(server.backup.geoRedundantBackup, 'Disabled');
    assert.strictEqual(server.backup.backupRetentionDays, 1);
  });
});
