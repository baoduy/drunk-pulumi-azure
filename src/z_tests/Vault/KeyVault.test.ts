import '../_tools/Mocks';

import assert from 'node:assert/strict';
import vaultCreator from '../../KeyVault';
import { naming } from '../../Common';

// Output.apply() callbacks run on a microtask queue that outlives a
// non-awaited `it()` body (see Storage.test.ts), so resolve via .promise().
const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('Key Vault Creator tests', () => {
  it('Vault Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    // `auth` prop was removed; the vault always enables RBAC authorization now.
    const rs = await vaultCreator({
      name: 'root',
      group,
    });

    assert.strictEqual(rs.name, naming.getKeyVaultName('root'));
    // `toVaultInfo()` was renamed to `info()`.
    assert.strictEqual(rs.info().group, group);

    const urn = await rs.vault.urn.promise();
    assert.ok(urn.includes(rs.name));
  }).timeout(5000);

  it('Vault Creator with custom prefix', async () => {
    const group = { resourceGroupName: 'RG' };
    // The old `nameConvention` param is gone; a custom naming override is now
    // passed through the `name` field itself as { val, rule }.
    const customName = { val: 'root', rule: { prefix: 'steven' } };

    const rs = await vaultCreator({
      name: customName,
      group,
    });

    assert.strictEqual(rs.name, naming.getKeyVaultName(customName));
    assert.strictEqual(rs.info().group, group);

    const urn = await rs.vault.urn.promise();
    assert.ok(urn.includes(rs.name));
  }).timeout(5000);

  describe('networkAcls.defaultAction / publicNetworkAccess (PULUMI-SEC-006)', () => {
    it('defaults to Deny when a subnetId rule is supplied (R2 security fix)', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
        network: { subnetId: '/subnet/1' },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.networkAcls.defaultAction, 'Deny');
    });

    it('defaults to Deny when an ipAddresses rule is supplied (R2 security fix)', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
        network: { ipAddresses: ['1.2.3.4'] },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.networkAcls.defaultAction, 'Deny');
    });

    it('stays Allow when no network is configured (R3 regression guard)', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.networkAcls.defaultAction, 'Allow');
    });

    it('stays Allow when ipAddresses is an empty array (empty array is not a rule)', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
        network: { ipAddresses: [] },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.networkAcls.defaultAction, 'Allow');
    });

    it('stays Allow with only privateLink configured, no subnetId/ipAddresses', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
        network: { privateLink: { subnetIds: ['/subnet/1'] } },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.networkAcls.defaultAction, 'Allow');
    });

    it('an explicit defaultAction overrides the derived value', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
        network: { subnetId: '/subnet/1', defaultAction: 'Allow' },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.networkAcls.defaultAction, 'Allow');
    });

    it('publicNetworkAccess is Disabled when privateLink is configured (R4)', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
        network: { privateLink: { subnetIds: ['/subnet/1'] } },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.publicNetworkAccess, 'Disabled');
    });

    it('publicNetworkAccess is Enabled without privateLink (R4)', async () => {
      const rs = await vaultCreator({
        name: 'root',
        group: { resourceGroupName: 'RG' },
      });

      const properties = await resolveOutput<any>(rs.vault.properties);
      assert.strictEqual(properties.publicNetworkAccess, 'Enabled');
    });
  });
});
