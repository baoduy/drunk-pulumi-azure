import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { create } from '../../VNet/Firewall';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';
import { LogInfo } from '../../types';

const DIAGNOSTIC_SETTING_TYPE = 'azure-native:monitor:DiagnosticSetting';

describe('Firewall Creator tests', () => {
  it('logInfo wires an AzureFirewall diagnostic setting with the firewall log category groups', async () => {
    const before = createdResources.length;

    create({
      name: 'fw',
      group: { resourceGroupName: 'RG' },
      outbound: [],
      policy: {},
      logInfo: {
        logWp: { id: '/subscriptions/1/resourceGroups/rg/providers/workspace' },
      } as unknown as LogInfo,
    });

    const inputs = await waitForResource(DIAGNOSTIC_SETTING_TYPE, before);
    assert.strictEqual(
      inputs.workspaceId,
      '/subscriptions/1/resourceGroups/rg/providers/workspace'
    );
    assert.deepStrictEqual(inputs.logs, [
      { categoryGroup: 'AzureFirewallApplicationRule', enabled: true },
      { categoryGroup: 'AzureFirewallNetworkRule', enabled: true },
      { categoryGroup: 'AzureFirewallDnsProxy', enabled: true },
    ]);
  });

  it('no logInfo creates no diagnostic setting for the firewall', async () => {
    const before = createdResources.length;

    create({
      name: 'fw-no-logs',
      group: { resourceGroupName: 'RG' },
      outbound: [],
      policy: {},
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(
      !createdResources
        .slice(before)
        .some((r) => r.type === DIAGNOSTIC_SETTING_TYPE)
    );
  });
});
