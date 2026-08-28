import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/AcrBuilder';
import { naming } from '../../Common';
import { createdResources } from '../_tools/Mocks';

// AcrBuilder.build() only returns a top-level ResourceInfo — the
// registry.Registry instance stays private — so read what was actually
// emitted to it via the shared resource-capture list. Pulumi's mock runtime
// resolves resource registration a few microtask hops after build() returns
// (even for resources with no Output inputs), so poll rather than assert
// synchronously.
const waitForRegistry = async (before: number) => {
  for (let i = 0; i < 50; i++) {
    const found = createdResources
      .slice(before)
      .find((r) => r.type === 'azure-native:containerregistry:Registry');
    if (found) return found.inputs;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('Registry was not created in time');
};

describe('AcrBuilder Creator tests', () => {
  it('AcrBuilder Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    const rs = creator({
      name: 'drunkcoding',
      group,
    })
      .withSku('Basic')
      .build();

    assert.strictEqual(rs.name, naming.getAcrName('drunkcoding'));
    assert.strictEqual(rs.group.resourceGroupName, 'RG');
  });

  describe('networkRuleSet.defaultAction (PULUMI-SEC-006)', () => {
    it('defaults to Deny when an ipAddresses rule is supplied on Premium (R3 security fix)', async () => {
      const before = createdResources.length;
      creator({ name: 'drunkcoding', group: { resourceGroupName: 'RG' } })
        .withSku('Premium')
        .withNetwork({ ipAddresses: ['1.2.3.4'] })
        .build();

      const inputs = await waitForRegistry(before);
      assert.strictEqual(inputs.networkRuleSet.defaultAction, 'Deny');
    });

    it('stays Allow when network is configured with no rules on Premium (R3 regression guard)', async () => {
      const before = createdResources.length;
      creator({ name: 'drunkcoding', group: { resourceGroupName: 'RG' } })
        .withSku('Premium')
        .withNetwork({})
        .build();

      const inputs = await waitForRegistry(before);
      assert.strictEqual(inputs.networkRuleSet.defaultAction, 'Allow');
    });

    it('stays Allow when ipAddresses is an empty array (empty array is not a rule)', async () => {
      const before = createdResources.length;
      creator({ name: 'drunkcoding', group: { resourceGroupName: 'RG' } })
        .withSku('Premium')
        .withNetwork({ ipAddresses: [] })
        .build();

      const inputs = await waitForRegistry(before);
      assert.strictEqual(inputs.networkRuleSet.defaultAction, 'Allow');
    });

    it('an explicit defaultAction overrides the derived value', async () => {
      const before = createdResources.length;
      creator({ name: 'drunkcoding', group: { resourceGroupName: 'RG' } })
        .withSku('Premium')
        .withNetwork({ ipAddresses: ['1.2.3.4'], defaultAction: 'Allow' })
        .build();

      const inputs = await waitForRegistry(before);
      assert.strictEqual(inputs.networkRuleSet.defaultAction, 'Allow');
    });

    it('no networkRuleSet at all on non-Premium, even with ipAddresses (pre-existing guard, unchanged)', async () => {
      const before = createdResources.length;
      creator({ name: 'drunkcoding', group: { resourceGroupName: 'RG' } })
        .withSku('Basic')
        .withNetwork({ ipAddresses: ['1.2.3.4'] })
        .build();

      const inputs = await waitForRegistry(before);
      assert.strictEqual(inputs.networkRuleSet, undefined);
    });
  });
});
