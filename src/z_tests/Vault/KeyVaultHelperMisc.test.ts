import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { addEncryptKey, getCert, getCertOutput } from '../../KeyVault/Helper';
import { KeyVaultInfo } from '../../types';
import { mockCertClient } from '../_tools/SecretClientMock';

// Coverage for the KeyVault/Helper.ts paths [D776-1] deliberately left
// unwrapped (addEncryptKey, getCert/getCertOutput). Not part of the
// PULUMI-SEC-009 fix, so these do NOT assert `pulumi.isSecret` -- see
// [D776-2] verification report for that call.
describe('Key Vault Helper misc tests', () => {
  const vaultInfo: KeyVaultInfo = {
    id: '/s/123',
    group: { resourceGroupName: 'test-root' },
    name: 'key-vault',
  };

  it('addEncryptKey creates an encryption key resource', async () => {
    const rs = addEncryptKey('test-key', vaultInfo);

    const keyName = await rs.keyName.promise();
    assert.strictEqual(keyName, 'test-key-encryptKey');
  }).timeout(5000);

  describe('getCert / getCertOutput', () => {
    let restore: () => void;

    before(() => {
      restore = mockCertClient({ 'my-cert': 'cert-bytes' });
    });

    after(() => restore());

    it('getCert resolves the certificate from the vault', async () => {
      const cert = await getCert({ name: 'my-cert', vaultInfo });
      assert.strictEqual(cert?.name, 'my-cert');
    });

    it('getCertOutput resolves undefined for a missing certificate', async () => {
      const rs = getCertOutput({ name: 'does-not-exist', vaultInfo });
      assert.strictEqual(await rs.promise(), undefined);
    });
  });
});
