import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { getVaultItemName } from '../../KeyVault/Helper';
import { KeyVaultInfo } from '../../types';
import { addCustomSecret } from '../../KeyVault/CustomHelper';

describe('Key Vault tests', () => {
  const vaultInfo: KeyVaultInfo = {
    id: '/s/123',
    group: { resourceGroupName: 'test-root' },
    name: 'key-vault',
  };

  it('Add Key test', async () => {
    // `addKey` was removed from KeyVault/Helper; its name-formatting logic
    // (stripping the stack prefix) now lives in `getVaultItemName`.
    const n = getVaultItemName(
      'test-stack-cache-primary-connection-string',
      'test-stack',
    );
    assert.strictEqual(n, 'cache-primary-connection-string');
  });

  it('Add Secret test', async () => {
    const rs = addCustomSecret({
      name: 'test-stack-cache-primary',
      value: '1212312312',
      vaultInfo,
    });

    const name = await rs.name.promise();
    assert.strictEqual(name, 'test-stack-cache-primary');
  });
});
