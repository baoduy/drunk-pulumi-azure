import '../_tools/Mocks';

import assert from 'node:assert/strict';

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
      // securityGroup/routeTable now require an explicit `enabled: true`
      // (the old API enabled them just by presence of the feature key).
      features: { securityGroup: { enabled: true }, routeTable: { enabled: true } },
    });

    // Output.apply() callbacks run on a microtask queue that outlives a
    // non-awaited `it()` body, so assertions inside them never reach mocha.
    // Use the (untyped) `.promise()` escape hatch to actually await the value.
    const vnetName: string = await (
      rs.vnet as any
    ).virtualNetworkName.promise();
    assert.strictEqual(vnetName, 'teststack-aks-sg-vnt');

    assert.notStrictEqual(rs.routeTable, undefined);
    assert.notStrictEqual(rs.securityGroup, undefined);

    const subnets = await (rs.vnet.subnets as any).promise();
    assert.strictEqual(subnets!.length, 1);
  });
});
