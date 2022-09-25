import { addKey, addSecret, getKey } from '../../KeyVault/Helper';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';
import { KeyVaultInfo } from '../../types';

describe('Key Vault tests', () => {
  const vaultInfo: KeyVaultInfo = {
    id: '/s/123',
    group: { resourceGroupName: 'test-root' },
    name: 'key-vault',
  };

  it('Add Key test', async () => {
    const rs = addKey({
      name: 'test-stack-cache-primary-connection-string',
      vaultInfo,
    });

    const n = await outputPromise((rs as any).keyName);
    expect(n).to.equal('cache-primary-connection-string');
  });

  it('Add Secret test', async () => {
    const rs = addSecret({
      name: 'test-stack-cache-primary',
      value: '1212312312',
      vaultInfo,
    });

    const n = await outputPromise((rs as any).secretName);
    expect(n).to.equal('cache-primary');
  });
});
