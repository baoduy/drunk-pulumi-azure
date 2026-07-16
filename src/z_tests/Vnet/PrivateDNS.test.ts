import '../_tools/Mocks';

import assert from 'node:assert/strict';
// PrivateDns.ts was replaced by a class-based Builder under src/Builder.
import creator from '../../Builder/PrivateDnsZoneBuilder';

describe('PrivateDns Creator tests', () => {
  it('PrivateDns Creator', async () => {
    const rs = creator({
      name: 'drunkcoding.net',
      group: { resourceGroupName: 'global-grp-hbd' },
    })
      .linkTo({
        vnetIds: [
          '/subscriptions/1234567890/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-vnet-trans',
        ],
      })
      .build();

    assert.strictEqual(rs.name, 'drunkcoding.net');
    assert.strictEqual(rs.group.resourceGroupName, 'global-grp-hbd');
  });
});
