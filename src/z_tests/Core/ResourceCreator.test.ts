import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as native from '@pulumi/azure-native';
// DefaultResourceArgs (../../types) no longer exists; ResourceCreator now
// exports its own props type, DefaultCreatorProps, which is the type its
// second argument is actually constrained to.
import rsCreator, { DefaultCreatorProps } from '../../Core/ResourceCreator';

describe('Resource Creator tests. The resource creator will not reformat the name', () => {
  it('Resource Creator', async () => {
    const rs = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    const urn = await rs.resource.urn.promise();
    assert.ok(urn.includes('resource-group'));
  });

  it('Resource Creator with lock', async () => {
    const { locker } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
      lock: true,
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    assert.notStrictEqual(locker, undefined);

    const name = await locker!.name.promise();
    assert.strictEqual(name, 'resource-group-CanNotDelete');
  });
});
