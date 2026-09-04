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

  describe('deletion guard (lock)', () => {
    // `protect` is a Pulumi *resource option*, not an output, and
    // MockResourceArgs (src/z_tests/_tools/Mocks.ts) only exposes
    // `type` / `name` / `inputs` / `provider` / `custom` / `id` — `protect`
    // is never handed to the mock, so it cannot be asserted directly here.
    // The Locker half is asserted instead: in RedisCacheBuilder.buildRedis
    // both `protect: this._lock` and the guarded `Locker(...)` call are
    // driven by the same `_lock` field, so the lock resource's
    // presence/absence is a reliable proxy for `protect`'s value.
    const LOCK_TYPE = 'azure-native:authorization:ManagementLockByScope';

    it('non-production default: no .lock() call creates no ManagementLockByScope', async () => {
      const before = createdResources.length;
      creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
        .withSku({ name: 'Basic', family: 'C', capacity: 0 })
        .build();

      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(
        !createdResources.slice(before).some((r) => r.type === LOCK_TYPE),
        'expected no ManagementLockByScope when lock() is never called',
      );
    });

    it('.lock() guards the instance with a CanNotDelete ManagementLockByScope', async () => {
      const before = createdResources.length;
      const rs = creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
        .withSku({ name: 'Basic', family: 'C', capacity: 0 })
        .lock()
        .build();

      const lockInputs = await waitForResource(LOCK_TYPE, before);
      assert.strictEqual(lockInputs.level, 'CanNotDelete');
      assert.strictEqual(lockInputs.lockName, `${rs.name}-CanNotDelete`);
    });

    it('.lock(false) explicitly opts out even though it would otherwise lock', async () => {
      const before = createdResources.length;
      creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
        .withSku({ name: 'Basic', family: 'C', capacity: 0 })
        .lock(false)
        .build();

      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(
        !createdResources.slice(before).some((r) => r.type === LOCK_TYPE),
        'expected no ManagementLockByScope after lock(false)',
      );
    });

    it('lock() returns a chainable builder', () => {
      const rs = creator({ name: 'cache', group: { resourceGroupName: 'RG' } })
        .withSku({ name: 'Basic', family: 'C', capacity: 0 })
        .lock()
        .withNetworkIf(false, { privateLink: { subnetIds: ['/subnet/1'] } })
        .build();

      assert.strictEqual(rs.name, 'teststack-cache-sg-rds');
    });
  });

  it('import survives alongside the new protect option (regression, PULUMI-WAF-004)', async () => {
    const before = createdResources.length;
    const importUri =
      '/subscriptions/12345/resourceGroups/RG/providers/Microsoft.Cache/redis/existing';
    creator({
      name: 'cache',
      group: { resourceGroupName: 'RG' },
      importUri,
    })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .lock()
      .build();

    // `import` (unlike `protect`) IS observable through the mock harness:
    // the pulumi runtime forwards the `import` resource option to
    // `newResource` as `args.id` (see Mocks.ts's `importId` capture), so
    // this proves `import: importUri` still reaches the Redis resource
    // alongside the new `protect: this._lock`.
    let redis;
    for (let i = 0; i < 50 && !redis; i++) {
      redis = createdResources
        .slice(before)
        .find((r) => r.type === 'azure-native:redis:Redis');
      if (!redis) await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(redis, 'expected the Redis resource to be created');
    assert.strictEqual(redis!.importId, importUri);
  });
});
