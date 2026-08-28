import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/ServiceBusBuilder';
import { createdResources } from '../_tools/Mocks';

// ServiceBusBuilder.build() only returns a top-level ResourceInfo — the
// NamespaceNetworkRuleSet instance stays private — so read what was actually
// emitted to it via the shared resource-capture list, keyed by Pulumi type.
// NamespaceNetworkRuleSet's `namespaceName` input is itself an Output off the
// namespace resource, so its mock registration lands a few microtask hops
// after build() returns — poll instead of asserting synchronously.
const waitForNetworkRuleSet = async (before: number) => {
  for (let i = 0; i < 50; i++) {
    const found = createdResources
      .slice(before)
      .find((r) => r.type === 'azure-native:servicebus:NamespaceNetworkRuleSet');
    if (found) return found.inputs;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('NamespaceNetworkRuleSet was not created in time');
};

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

  describe('NamespaceNetworkRuleSet.defaultAction (PULUMI-SEC-006)', () => {
    it('defaults to Deny when a subnetId rule is supplied (R3 security fix)', async () => {
      const before = createdResources.length;
      creator({ name: 'aks', group })
        .withSku('Premium')
        .withNetwork({ subnetId: '/subnet/1' })
        .build();

      const inputs = await waitForNetworkRuleSet(before);
      assert.strictEqual(inputs.defaultAction, 'Deny');
    });

    it('defaults to Deny when an ipAddresses rule is supplied (R3 security fix)', async () => {
      const before = createdResources.length;
      creator({ name: 'aks', group })
        .withSku('Premium')
        .withNetwork({ ipAddresses: ['1.2.3.4'] })
        .build();

      const inputs = await waitForNetworkRuleSet(before);
      assert.strictEqual(inputs.defaultAction, 'Deny');
    });

    it('stays Allow when network is configured with no rules (R3 regression guard)', async () => {
      const before = createdResources.length;
      creator({ name: 'aks', group }).withSku('Premium').withNetwork({}).build();

      const inputs = await waitForNetworkRuleSet(before);
      assert.strictEqual(inputs.defaultAction, 'Allow');
    });

    it('stays Allow when ipAddresses is an empty array (empty array is not a rule)', async () => {
      const before = createdResources.length;
      creator({ name: 'aks', group })
        .withSku('Premium')
        .withNetwork({ ipAddresses: [] })
        .build();

      const inputs = await waitForNetworkRuleSet(before);
      assert.strictEqual(inputs.defaultAction, 'Allow');
    });

    it('an explicit defaultAction overrides the derived value', async () => {
      const before = createdResources.length;
      creator({ name: 'aks', group })
        .withSku('Premium')
        .withNetwork({ subnetId: '/subnet/1', defaultAction: 'Allow' })
        .build();

      const inputs = await waitForNetworkRuleSet(before);
      assert.strictEqual(inputs.defaultAction, 'Allow');
    });
  });
});
