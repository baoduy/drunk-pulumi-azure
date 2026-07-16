import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/ServiceBusBuilder';

describe('ServiceBus Creator tests', function () {
  this.timeout(5000);
  const group = { resourceGroupName: 'RG' };
  const vaultInfo = { id: '/12345', group, name: '123' };

  // Note: ServiceBusBuilder.build() only returns a top-level ResourceInfo
  // (name/group/id) — unlike the old module-function creator, topics/queues/
  // subscriptions are no longer returned, so we can only assert the namespace
  // name and that the build succeeds with each configuration.
  it('ServiceBus Creator', async () => {
    const rs = creator({
      name: 'aks',
      group,
      //vaultInfo,
    })
      .withSku('Basic')
      .build();

    assert.strictEqual(rs.name, 'teststack-aks-testorganization-sg-bus');
  });

  it('ServiceBus Creator with Topics', async () => {
    const rs = creator({
      name: 'aks',
      group,
      //Not able to create Key in test mode
      //vaultInfo,
    })
      .withSku('Basic')
      .withTopics({
        'cake-v1-tp': {
          subscriptions: {
            'eat-cakev1-sub': {},
            'eat-cakev1-session-sub': { requiresSession: true },
          },
        },
      })
      .build();

    assert.strictEqual(rs.name, 'teststack-aks-testorganization-sg-bus');
  });

  it('ServiceBus Creator with Queue', async () => {
    const rs = creator({
      name: 'aks',
      group,
      //Not able to create Key in test mode
      //vaultInfo,
    })
      .withSku('Basic')
      .withQueues({ 'cake-v1-que': {} })
      .build();

    assert.strictEqual(rs.name, 'teststack-aks-testorganization-sg-bus');
  });

  it('ServiceBus Creator with VaultInfo', async () => {
    const rs = creator({
      name: 'aks',
      group,
      vaultInfo,
    })
      .withSku('Basic')
      .withTopics({ 'cake-v1-tp': {} })
      .withQueues({ 'cake-v1-que': {} })
      .build();

    assert.strictEqual(rs.name, 'teststack-aks-testorganization-sg-bus');
  });
});
