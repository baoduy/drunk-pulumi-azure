import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as pulumi from '@pulumi/pulumi';
import {
  getIdentityInfoOutput,
  getIdentitySecretNames,
  getUserAssignedIdentityInfo,
} from '../../AzAd/Helper';
import { getVaultItemName } from '../../KeyVault/Helper';
import { naming } from '../../Common';
import { KeyVaultInfo } from '../../types';
import { mockSecretClient } from '../_tools/SecretClientMock';

describe('getIdentityInfoOutput secret tests (PULUMI-SEC-009 R3)', () => {
  const vaultInfo: KeyVaultInfo = {
    id: '/s/123',
    group: { resourceGroupName: 'test-root' },
    name: 'key-vault',
  };
  const name = 'test-identity';

  // Derive the exact Key Vault secret names getIdentityInfo will request,
  // using the library's own naming/secret-name helpers rather than
  // re-implementing that logic here.
  const identityName = naming.getIdentityName(name);
  const secretNames = getIdentitySecretNames(identityName);
  const key = (n: string) => getVaultItemName(n);

  let restore: () => void;

  before(() => {
    restore = mockSecretClient({
      [key(secretNames.objectIdName)]: 'object-id-value',
      [key(secretNames.clientIdKeyName)]: 'client-id-value',
      [key(secretNames.clientSecretKeyName)]: 'client-secret-value',
      [key(secretNames.principalIdKeyName)]: 'principal-id-value',
      [key(secretNames.principalSecretKeyName)]: 'principal-secret-value',
    });
  });

  after(() => restore());

  it('marks the resolved identity info as a Pulumi secret -- the path DRK-776 missed', async () => {
    const rs = getIdentityInfoOutput({ name, vaultInfo });

    assert.strictEqual(await pulumi.isSecret(rs), true);
    const value = await rs.promise();
    assert.strictEqual(value.objectId, 'object-id-value');
    assert.strictEqual(value.clientId, 'client-id-value');
    assert.strictEqual(value.clientSecret, 'client-secret-value');
  });

  it('stays secret when principal info is included too', async () => {
    const rs = getIdentityInfoOutput({
      name,
      vaultInfo,
      includePrincipal: true,
    });

    assert.strictEqual(await pulumi.isSecret(rs), true);
    const value = await rs.promise();
    assert.strictEqual(value.principalId, 'principal-id-value');
    assert.strictEqual(value.principalSecret, 'principal-secret-value');
  });

  // getUserAssignedIdentityInfo is a separate, pre-existing helper -- not
  // part of the PULUMI-SEC-009 change set ([D776-1] only touched
  // getIdentityInfoOutput). Covered here for the ≥80%-per-touched-class gate
  // on AzAd/Helper.ts; no secretness assertion, none is expected.
  describe('getUserAssignedIdentityInfo', () => {
    const uidName = 'test-uid';
    const identityUidName = naming.getUIDName(uidName);
    let restore: () => void;

    before(() => {
      restore = mockSecretClient({
        [key(`${identityUidName}-id`)]: 'uid-id-value',
        [key(`${identityUidName}-clientId`)]: 'uid-client-id-value',
        [key(`${identityUidName}-principalId`)]: 'uid-principal-id-value',
      });
    });

    after(() => restore());

    it('resolves id/clientId/principalId from the vault', async () => {
      const rs = getUserAssignedIdentityInfo(uidName, vaultInfo);

      assert.strictEqual(await rs.id.promise(), 'uid-id-value');
      assert.strictEqual(await rs.clientId.promise(), 'uid-client-id-value');
      assert.strictEqual(
        await rs.principalId.promise(),
        'uid-principal-id-value',
      );
    });
  });
});
