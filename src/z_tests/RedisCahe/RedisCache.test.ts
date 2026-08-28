import '../_tools/Mocks';

import assert from 'node:assert/strict';
// RedisCache moved into the Builder pattern; creator(...).withSku(...).build() replaces the old direct call.
import creator from '../../Builder/RedisCacheBuilder';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

describe('RedisCache Creator tests', () => {
  it('Redis Cache Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = creator({
      name: 'cache',
      group,
    })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .build();

    assert.strictEqual(rs.name, 'teststack-cache-sg-rds');
  });

  it('withNetwork ipAddresses creates a whitelist FirewallRule', async () => {
    const before = createdResources.length;
    creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .withNetwork({ ipAddresses: ['1.2.3.4'] })
      .build();

    const inputs = await waitForResource('azure-native:redis:FirewallRule', before);
    assert.strictEqual(inputs.startIP, '1.2.3.4');
  });

  it('withNetworkIf(true, privateLink) creates a private endpoint and disables public access', async () => {
    const before = createdResources.length;
    creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .withNetworkIf(true, { privateLink: { subnetIds: ['/subnet/1'] } })
      .build();

    const [redis, endpoint] = await Promise.all([
      waitForResource('azure-native:redis:Redis', before),
      waitForResource('azure-native:network:PrivateEndpoint', before),
    ]);
    assert.strictEqual(redis.publicNetworkAccess, 'Disabled');
    assert.ok(endpoint);
  });

  it('withNetworkIf(false, ...) skips the network config entirely', async () => {
    const before = createdResources.length;
    creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .withNetworkIf(false, { privateLink: { subnetIds: ['/subnet/1'] } })
      .build();

    const redis = await waitForResource('azure-native:redis:Redis', before);
    assert.strictEqual(redis.publicNetworkAccess, 'Enabled');
    assert.ok(
      !createdResources
        .slice(before)
        .some((r) => r.type === 'azure-native:network:PrivateEndpoint'),
    );
  });

  it('build() with vaultInfo succeeds (connection secrets are pushed once hostName resolves)', () => {
    const vaultInfo = { id: '/12345', group: { resourceGroupName: 'RG' }, name: 'vault' };
    const rs = creator({ name: 'cache', group: { resourceGroupName: 'RG' }, vaultInfo })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .build();

    assert.strictEqual(rs.name, 'teststack-cache-sg-rds');
  });
});
