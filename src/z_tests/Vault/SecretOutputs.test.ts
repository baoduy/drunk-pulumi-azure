import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as pulumi from '@pulumi/pulumi';
import { getSecretOutput, getSecrets } from '../../KeyVault/Helper';
import { KeyVaultInfo } from '../../types';
import { mockSecretClient } from '../_tools/SecretClientMock';

describe('Key Vault secret output tests (PULUMI-SEC-009)', () => {
  const vaultInfo: KeyVaultInfo = {
    id: '/s/123',
    group: { resourceGroupName: 'test-root' },
    name: 'key-vault',
  };

  let restore: () => void;

  before(() => {
    restore = mockSecretClient({
      'db-password': 'super-secret-value',
      'storage-key': 'account-key-value',
      'empty-secret': '',
    });
  });

  after(() => restore());

  it('getSecrets marks every resolved value as a Pulumi secret (R1)', async () => {
    const rs = getSecrets({
      vaultInfo,
      names: { password: 'db-password' },
    });

    assert.strictEqual(await pulumi.isSecret(rs.password), true);
    assert.strictEqual(await rs.password.promise(), 'super-secret-value');
  });

  it('getSecretOutput marks the resolved value as a Pulumi secret (R2)', async () => {
    const rs = getSecretOutput({ name: 'db-password', vaultInfo });

    assert.strictEqual(await pulumi.isSecret(rs), true);
    const value = await rs.promise();
    assert.strictEqual(value?.value, 'super-secret-value');
  });

  it('getSecrets still resolves "" for a missing secret, not just secret-wrapped (R4)', async () => {
    const rs = getSecrets({
      vaultInfo,
      names: { missing: 'does-not-exist' },
    });

    assert.strictEqual(await pulumi.isSecret(rs.missing), true);
    assert.strictEqual(await rs.missing.promise(), '');
  });

  it('getSecrets resolves "" for a secret that exists but is empty (R4)', async () => {
    const rs = getSecrets({
      vaultInfo,
      names: { empty: 'empty-secret' },
    });

    assert.strictEqual(await pulumi.isSecret(rs.empty), true);
    assert.strictEqual(await rs.empty.promise(), '');
  });

  it('getSecretOutput still resolves undefined for a missing secret (R4)', async () => {
    const rs = getSecretOutput({ name: 'does-not-exist', vaultInfo });

    assert.strictEqual(await pulumi.isSecret(rs), true);
    assert.strictEqual(await rs.promise(), undefined);
  });

  it('getSecrets on an empty names object resolves an empty result, not an error (R4)', () => {
    const rs = getSecrets({ vaultInfo, names: {} });
    assert.deepStrictEqual(Object.keys(rs), []);
  });

  it('a value derived from getSecrets stays secret (R5 propagation)', async () => {
    const rs = getSecrets({
      vaultInfo,
      names: { key: 'storage-key' },
    });

    // Same shape as `src/Storage/Helper.ts:29` -> a connection string built by
    // interpolating a getSecrets() value. If this loses secretness, the whole
    // "wrap it once, three places" design is wrong -- it's not a thin test.
    const connectionString = pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=test;AccountKey=${rs.key};EndpointSuffix=core.windows.net`;

    assert.strictEqual(await pulumi.isSecret(connectionString), true);
    assert.strictEqual(
      await connectionString.promise(),
      'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=account-key-value;EndpointSuffix=core.windows.net',
    );
  });
});
