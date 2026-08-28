import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Storage';
import { createdResources } from '../_tools/Mocks';

// Resolves a pulumi Output's value as a real awaited Promise. Using
// `.apply()` directly and asserting inside its callback does NOT fail the
// test on a wrong value: the callback runs on a microtask queued after the
// (non-awaited) async test function has already resolved, so mocha reports
// the test as passing regardless of what the assertion inside apply() finds.
const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('Storage Creator tests', () => {
  it('Storage Creator', async () => {
    // defaultManagementRules moved under `policies` in the current API.
    const rs = creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
      policies: {
        defaultManagementRules: [
          {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 365,
                  daysAfterLastAccessTimeGreaterThan: 365,
                },
                tierToCool: {
                  daysAfterModificationGreaterThan: 365,
                  daysAfterLastAccessTimeGreaterThan: 365,
                },
                tierToArchive: {
                  daysAfterModificationGreaterThan: 365 * 3,
                  daysAfterLastAccessTimeGreaterThan: 365 / 2,
                },
                enableAutoTierToHotFromCool: true,
              },
              snapshot: { delete: { daysAfterCreationGreaterThan: 365 } },
              version: { delete: { daysAfterCreationGreaterThan: 365 } },
            },
            filters: {
              blobTypes: ['blockBlob', 'appendBlob'],
              containerNames: [
                'insights-logs-auditevent',
                'insights-metrics-pt1m',
                '$logs',
              ],
            },
          },
        ],
      },
    });

    const accountName = await resolveOutput(rs.instance.name);
    assert.strictEqual(accountName, 'teststackstoragetestorga');
  });

  it('Storage Creator with feature flags', async () => {
    // featureFlags was renamed to `features` in the current API.
    const rs = creator({
      name: 'storage',
      features: { allowSharedKeyAccess: true, enableStaticWebsite: true },
      group: { resourceGroupName: 'RG' },
    });

    const allowSharedKeyAccess = await resolveOutput(
      rs.instance.allowSharedKeyAccess,
    );
    assert.strictEqual(allowSharedKeyAccess, true);
  });

  describe('networkRuleSet.defaultAction (PULUMI-SEC-006)', () => {
    it('defaults to Deny when a subnetId rule is supplied (R2 security fix)', async () => {
      const rs = creator({
        name: 'storage',
        group: { resourceGroupName: 'RG' },
        network: { vnet: [{ subnetId: '/subnet/1' }] },
      });

      const rule = await resolveOutput<any>((rs.instance as any).networkRuleSet);
      assert.strictEqual(rule.defaultAction, 'Deny');
    });

    it('defaults to Deny when an ipAddresses rule is supplied (R2 security fix)', async () => {
      const rs = creator({
        name: 'storage',
        group: { resourceGroupName: 'RG' },
        network: { vnet: [{ ipAddresses: ['1.2.3.4'] }] },
      });

      const rule = await resolveOutput<any>((rs.instance as any).networkRuleSet);
      assert.strictEqual(rule.defaultAction, 'Deny');
    });

    it('stays Allow when no network is configured (R3 regression guard)', async () => {
      const rs = creator({
        name: 'storage',
        group: { resourceGroupName: 'RG' },
      });

      const rule = await resolveOutput<any>((rs.instance as any).networkRuleSet);
      assert.strictEqual(rule.defaultAction, 'Allow');
    });

    it('stays Allow when the vnet entry has neither subnetId nor ipAddresses', async () => {
      const rs = creator({
        name: 'storage',
        group: { resourceGroupName: 'RG' },
        network: { vnet: [{}] },
      });

      const rule = await resolveOutput<any>((rs.instance as any).networkRuleSet);
      assert.strictEqual(rule.defaultAction, 'Allow');
    });

    it('stays Allow when ipAddresses is an empty array (empty array is not a rule)', async () => {
      const rs = creator({
        name: 'storage',
        group: { resourceGroupName: 'RG' },
        network: { vnet: [{ ipAddresses: [] }] },
      });

      const rule = await resolveOutput<any>((rs.instance as any).networkRuleSet);
      assert.strictEqual(rule.defaultAction, 'Allow');
    });

    it('an explicit defaultAction overrides the derived value', async () => {
      const rs = creator({
        name: 'storage',
        group: { resourceGroupName: 'RG' },
        network: { vnet: [{ subnetId: '/subnet/1' }], defaultAction: 'Allow' },
      });

      const rule = await resolveOutput<any>((rs.instance as any).networkRuleSet);
      assert.strictEqual(rule.defaultAction, 'Allow');
    });
  });

  it('Storage Creator with containers, queues and file shares', async () => {
    const rs = creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
      containers: [{ name: 'public-c', public: true }, { name: 'private-c' }],
      queues: ['my-queue'],
      fileShares: ['my-share'],
    });

    const accountName = await resolveOutput(rs.instance.name);
    assert.strictEqual(accountName, 'teststackstoragetestorga');
  });

  it('Storage Creator with vaultInfo stores account keys as Key Vault secrets', async () => {
    const vaultInfo = {
      id: '/s/123',
      group: { resourceGroupName: 'RG' },
      name: 'key-vault',
    };

    const before = createdResources.length;
    const rs = creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
      vaultInfo,
    });

    // Keys are pushed to the vault from inside `stg.id.apply(async ...)`,
    // which chains a real async `listStorageAccountKeys` call — poll instead
    // of asserting synchronously after the id resolves. addCustomSecret's
    // Pulumi resource name is a formatted (getVaultItemName) variant of
    // `${accountName}-key`, so match on the shared `contentType` instead,
    // which Storage/index.ts sets to `Storage: <accountName>` verbatim.
    await resolveOutput(rs.instance.id);
    const accountName = await resolveOutput(rs.instance.name);
    const contentType = `Storage: ${accountName}`;
    let secret;
    for (let i = 0; i < 50 && !secret; i++) {
      secret = createdResources
        .slice(before)
        .find((r) => r.inputs?.contentType === contentType);
      if (!secret) await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(secret, 'expected the storage account key to be saved as a secret');
  });

  it('Storage Creator with privateEndpoint creates the private link and disables public access', async () => {
    const rs = creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
      network: { privateEndpoint: { type: 'blob', subnetIds: ['/subnet/1'] } },
    });

    const publicNetworkAccess = await resolveOutput<any>(
      (rs.instance as any).publicNetworkAccess,
    );
    assert.strictEqual(publicNetworkAccess, 'Disabled');
  });
});
