import { addKey } from '../../KeyVault/Helper';
import '../_tools/Mocks';
import { expect } from 'chai';
import { KeyVaultInfo } from '../../types';
import { addCustomSecret } from '../../KeyVault/CustomHelper';

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

    (rs as any).keyName.apply((n) =>
      expect(n).to.equal('cache-primary-connection-string')
    );
  });

  it('Add Secret test', async () => {
    const rs = addCustomSecret({
      name: 'test-stack-cache-primary',
      value: '1212312312',
      vaultInfo,
    });

    (rs as any).secretName.apply((n) => expect(n).to.equal('cache-primary'));
  });
});
