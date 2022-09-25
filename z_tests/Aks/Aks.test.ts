import '../_tools/Mocks';

import creator from '../../Aks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

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
      aksAccess: { enableAzureRBAC: true },
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

    const [g, n] = await outputPromise([
      (rs!.aks as any).nodeResourceGroup,
      (rs!.aks as any).resourceName,
    ]);

    expect(g).to.equal('test-stack-cluster-aks-nodes');
    expect(n).to.equal('test-stack-cluster-aks');
  });
});
