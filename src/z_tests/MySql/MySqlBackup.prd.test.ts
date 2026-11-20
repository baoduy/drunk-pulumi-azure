import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/MySqlBuilder';
import { isPrd } from '../../Common';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

// DRK-2570 acceptance test, legacy MySQL row of "PRD PostgreSQL and MySQL
// servers keep their backups inside the region". Runs only in the PRD pass of
// `pnpm test` (PULUMI_NODEJS_STACK=teststack-prd).
describe('Legacy MySQL backups in a PRD stack (DRK-2570)', () => {
  before(() => assert.strictEqual(isPrd, true, 'the PRD pass must run with a "prd" stack'));

  it('Scenario Outline: PRD PostgreSQL and MySQL servers keep their backups inside the region — "orders-db" on tier "GeneralPurpose" has geo-redundant backup turned off and keeps its backups for 7 days', async () => {
    const before = createdResources.length;
    const rs = creator({
      name: 'orders-db-prd',
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
    assert.strictEqual(server.backup.backupRetentionDays, 7);
  });
});
