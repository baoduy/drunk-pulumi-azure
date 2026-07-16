import '../_tools/Mocks';

import assert from 'node:assert/strict';
import vaultCreator from '../../KeyVault';
import { naming } from '../../Common';

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
});
