import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as pulumi from '@pulumi/pulumi';
import * as native from '@pulumi/azure-native';
// Core/ResourceGroup.ts (the old rgCreator) was deleted in a refactor; it
// was a thin wrapper that called ResourceCreator with the ResourceGroup
// class. Resource-group naming conventions moved out to
// Builder/ResourceBuilder, and ResourceCreator itself does not reformat
// names (see ResourceCreator.test.ts), so the urn now contains the raw name
// instead of the old fully-formatted 'test-resource-group-dc'.
import rsCreator, { DefaultCreatorProps } from '../../Core/ResourceCreator';

describe('Core Resource Group tests', () => {
  it('Create Resource Group', async () => {
    const { resource } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    const [urn] = await pulumi.all([resource.urn]).promise();
    assert.ok(urn.includes('resource-group'));
  });

  it('Create Resource Group with lock', async () => {
    const { resource, locker } = await rsCreator(
      native.resources.ResourceGroup,
      {
        resourceGroupName: 'resource-group',
        lock: true,
      } as native.resources.ResourceGroupArgs & DefaultCreatorProps,
    );

    assert.notStrictEqual(resource, undefined);
    assert.notStrictEqual(locker, undefined);
  });
});
