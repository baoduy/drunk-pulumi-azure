import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/MySqlBuilder';
import { isPrd } from '../../Common';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

// DRK-2570 acceptance test, legacy MySQL row of "outside PRD the touched
// defaults stay as they are today" (the mocked stack "teststack" is not PRD).
describe('Legacy MySQL backups outside PRD (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, false, 'this file must run with a non-PRD stack'));

  it('Scenario Outline: outside PRD the touched defaults stay as they are today — "orders-db" has geo-redundant backup off and keeps backups for 1 day', async () => {
    const before = createdResources.length;
    const rs = creator({
      name: 'orders-db-dev',
      group: { resourceGroupName: 'RG' },
      vaultInfo: { id: '/vault/123', group: { resourceGroupName: 'RG' }, name: 'vault' },
    })
      .withSku({ sku: { name: 'Standard_D2ds_v4', tier: 'GeneralPurpose' }, version: '8.0.21' })
      .withLogin({ adminLogin: 'adminUser', password: 'P@ssw0rd123' })
      .build();

    const server = await waitForResource(
      'azure-native:dbformysql:Server',
      before,
      (i) => i.serverName === rs.name,
    );
    assert.strictEqual(server.backup.geoRedundantBackup, 'Disabled');
    assert.strictEqual(server.backup.backupRetentionDays, 1);
  });
});
