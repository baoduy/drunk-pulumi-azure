import creator from '../../Storage';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('Storage Creator tests', () => {
  it('Storage Creator', async () => {
    const rs = await creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
    });

    const n = await outputPromise((rs.storage as any).accountName);
    expect(n).to.equal('teststackstoragestg');
  });

  it('Storage Creator', async () => {
    const rs = await creator({
      name: 'storage',
      featureFlags: { allowSharedKeyAccess: true, enableStaticWebsite: true },
      group: { resourceGroupName: 'RG' },
    });

    const n = await outputPromise((rs.storage as any).allowSharedKeyAccess);
    expect(n).to.equal(true);
  });
});
