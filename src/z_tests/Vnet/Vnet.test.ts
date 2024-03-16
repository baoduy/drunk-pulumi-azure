import '../_tools/Mocks';

import { expect } from 'chai';

import creator from '../../VNet/Vnet';

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

    (rs.vnet as any).virtualNetworkName.apply(n => expect(n).to.equal('test-stack-aks-vnt'));

    expect(rs.routeTable).to.not.undefined;
    expect(rs.securityGroup).to.not.undefined;

    rs.vnet.subnets.apply((s) => expect(s!.length).to.be.equal(1));
  });
});
