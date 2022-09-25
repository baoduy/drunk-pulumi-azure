import creator from '../../VNet/PrivateDns';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('PrivateDns Creator tests', () => {
  it('PrivateDns Creator', async () => {
    const rs = creator({
      name: 'drunkcoding.net',
      vnetIds: [
        '/subscriptions/1234567890/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-vnet-trans',
      ],
    });

    const [n, g] = await outputPromise([
      (rs as any).privateZoneName,
      (rs as any).resourceGroupName,
    ]);

    expect(n).to.equal('drunkcoding.net');
    expect(g).to.equal('global-grp-hbd');
  });
});
