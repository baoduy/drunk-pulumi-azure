import creator from '../../VNet/Vnet';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('Vnet Creator tests', () => {
  it('Vnet Creator', async () => {
    const rs = creator({
      name: 'aks',
      group: { resourceGroupName: 'RG' },

      subnets: [
        {
          name: 'subnet1',
          addressPrefix: '10.0.0.0/8',
          allowedServiceEndpoints: true,
          enablePrivateEndpoint: true,
          enablePrivateLinkService: true,
        },
      ],
      features: { securityGroup: {} },
    });

    const n = await outputPromise((rs.vnet as any).virtualNetworkName);
    expect(n).to.equal('test-stack-aks-vnt');

    expect(rs.routeTable).to.not.undefined;
    expect(rs.securityGroup).to.not.undefined;

    const sl = await outputPromise(rs.vnet.subnets.apply((s) => s!.length));
    expect(sl).to.be.equal(1);
  });
});
