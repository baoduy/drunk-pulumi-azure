import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../AzAd/Identity';

describe('Identity Creator tests', () => {
  it('Identity Creator', async () => {
    const item = await creator({
      name: 'test',
      appType: 'api',
      createPrincipal: true,
      createClientSecret: true,

      vaultInfo: {
        group: { resourceGroupName: 'test' },
        id: 'test',
        name: 'test',
      },
    });

    // Original assertion expected 'stack-test'; current naming convention
    // (stack + region suffix) produces 'teststack-test-sg' under the test mocks.
    assert.strictEqual(item.name, 'teststack-test-sg');
    assert.notStrictEqual(item.clientSecret, undefined);
    assert.notStrictEqual(item.clientId, undefined);
    assert.notStrictEqual(item.objectId, undefined);
    assert.notStrictEqual(item.principalId, undefined);
    assert.notStrictEqual(item.principalSecret, undefined);
  });
});
