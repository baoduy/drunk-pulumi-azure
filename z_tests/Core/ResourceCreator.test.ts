import '../_tools/Mocks';

import * as native from '@pulumi/azure-native';

import { DefaultResourceArgs } from '../../types';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';
import rsCreator from '../../Core/ResourceCreator';

describe('Resource Creator tests. The resource creator will not reformat the name', () => {
  it('Resource Creator', async () => {
    const rs = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
    } as native.resources.ResourceGroupArgs & DefaultResourceArgs);

    const u = await outputPromise(rs.resource.urn);
    expect(u).to.include('resource-group');
  });

  it('Resource Creator with lock', async () => {
    const { locker } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
      lock: true,
    } as native.resources.ResourceGroupArgs & DefaultResourceArgs);

    expect(locker).to.not.undefined;

    const n = await outputPromise(locker!.name);
    expect(n).to.be.equal('resource-group-CanNotDelete');
  });

  it('Resource Creator with diagnostic', async () => {
    const { diagnostic } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
      monitoring: { logsCategories: ['All'], logWpId: '12345667' },
    } as native.resources.ResourceGroupArgs & DefaultResourceArgs);

    expect(diagnostic).to.not.undefined;

    const n = await outputPromise(diagnostic!.name);
    expect(n).to.be.equal('resource-group-diag');
  });
});
