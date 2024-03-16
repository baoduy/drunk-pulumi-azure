import creator from '../../VNet/PrivateDns';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('PrivateDns Creator tests', () => {
  it('PrivateDns Creator', async () => {
    const rs = creator({
      name: 'drunkcoding.net',
      vnetIds: [
        '/subscriptions/1234567890/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-vnet-trans',
      ],
    });
    (rs as any).privateZoneName.apply(n => expect(n).to.equal('drunkcoding.net'));
    (rs as any).resourceGroupName.apply(g => expect(g).to.equal('global-grp-hbd'));
  });
});
