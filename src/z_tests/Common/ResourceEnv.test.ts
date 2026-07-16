import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { rsInfo } from '../../Common';
// Common/ResourceEnv.ts was consolidated into Common/Naming.ts; its
// getResourceName is now a named export there, and getResourceGroupName /
// getStorageName live as properties on Naming's default-exported `naming`
// object instead of standalone named exports.
import naming, { getResourceName } from '../../Common/Naming';

describe('Common/ResourceEnv tests', () => {
  it('Get Resource Group Name', () => {
    const name = naming.getResourceGroupName('Resource');
    assert.strictEqual(name, 'teststack-resource-sg-grp-testorganization');
  });

  it('Get Resource Name', () => {
    const name = getResourceName('KeyVault');
    assert.strictEqual(name, 'teststack-keyvault-sg');
  });

  it('Get Storage Name', () => {
    const name = naming.getStorageName('The-Main');
    assert.strictEqual(name, 'teststackthemaintestorga');
  });

  it('Get name space should be replace with hyphen', () => {
    const name = getResourceName('This is my Name');
    assert.strictEqual(name, 'teststack-this-is-my-name-sg');
  });

  // Assumption: getSecretName (originally in Common/ResourceEnv.ts, stripped
  // the stack name out of a secret name) was deleted in a refactor with no
  // replacement anywhere in src/. There is nothing left to call, so this
  // case is dropped rather than reimplemented against dead functionality.

  it('Get Resource Info from Id', () => {
    const info = rsInfo.getResourceInfoFromId(
      '/subscriptions/1234567890/resourceGroups/sg-dev-aks-vnet/providers/Microsoft.Network/virtualNetworks/sg-dev-vnet-trans',
    );

    assert.strictEqual(info!.name, 'sg-dev-vnet-trans');
    assert.strictEqual(info!.group.resourceGroupName, 'sg-dev-aks-vnet');
    assert.strictEqual(info!.subscriptionId, '1234567890');
  });

  it('Prefix should not be duplicated', () => {
    // Use the real current stack prefix ('teststack'), not a hardcoded
    // literal, so this genuinely exercises the dedup logic against the
    // stack value actually in effect during this test run.
    const name = getResourceName('teststack-storage-name');
    assert.strictEqual(name, 'teststack-storage-name-sg');
  });

  it('Suffix should not be duplicated', () => {
    const name = getResourceName('storage-name-sg', {
      suffix: 'sg',
    });
    assert.strictEqual(name, 'teststack-storage-name-sg');
  });
});
