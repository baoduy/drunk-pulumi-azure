import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { output } from '@pulumi/pulumi';
// ponytail: SSH key generation moved out of CustomProviders into Core/KeyGenerators (generateSsh),
// which wraps the external @drunk-pulumi/azure-providers SshKeyResource + vault secret storage.
import { generateSsh } from '../../Core/KeyGenerators';

describe('Generate ssh Keys tests', () => {
  it('generateSsh test', async () => {
    const vaultInfo = {
      name: 'vault',
      id: output('vault-id'),
      group: { resourceGroupName: 'RG' },
    };

    const rs = generateSsh({ name: 'test', vaultInfo });

    const userName = await rs.userName.promise();
    const publicKey = await rs.publicKey.promise();
    assert.ok(userName);
    assert.ok(publicKey);
  });
});
