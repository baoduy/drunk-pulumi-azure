import rgCreator from '../../Core/ResourceGroup';
import { expect } from 'chai';
import * as pulumi from '@pulumi/pulumi';
import '../_tools/Mocks';

describe('Core Resource Group tests', () => {
  it('Create Resource Group', async () => {
    const { resource } = await rgCreator({
      name: 'resource-group',
    });

    pulumi.all([resource.urn]).apply(([u]) => {
      expect(u).to.be.equal('test-resource-group-dc');
      // if (u.includes('test-resource-group-dc')) done();
      // else done(new Error('Resource Group creation failed'));
    });
  });

  it('Create Resource Group with lock', async () => {
    const { resource, locker } = await rgCreator({
      name: 'resource-group',
      lock: true,
    });

    expect(resource).to.not.undefined;
    expect(locker).to.not.undefined;
  });
});
