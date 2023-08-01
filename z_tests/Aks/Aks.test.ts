import '../_tools/Mocks';

import creator from '../../Aks';
import { expect } from 'chai';

describe('Aks Creator tests', () => {
  it('Aks Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    const rs = await creator({
      name: 'cluster',
      group,
      linux: {
        adminUsername: 'admin',
        sshKeys: ['123456'],
      },
      //aksAccess: { envRoleNames: true },
      nodePools: [{ name: 'main', mode: 'System' }],

      network: {
        subnetId: '/123',
      },

      vaultInfo: {
        group: { resourceGroupName: 'vault' },
        id: 'vault',
        name: 'vault',
      },
    });

    expect(rs!.aks).to.not.undefined;

    (rs!.aks as any).nodeResourceGroup.apply((g) =>
      expect(g).to.equal('test-stack-cluster-aks-nodes')
    );
    (rs!.aks as any).resourceName.apply((n) =>
      expect(n).to.equal('test-stack-cluster-aks')
    );
  }).timeout(5000);
});
