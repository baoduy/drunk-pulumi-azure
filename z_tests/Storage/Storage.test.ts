import creator from '../../Storage';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('Storage Creator tests', () => {
  it('Storage Creator', async () => {
    const rs = await creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
    });

    (rs.storage as any).accountName.apply(n => expect(n).to.equal('teststackstoragestg'));
  });

  it('Storage Creator', async () => {
    const rs = await creator({
      name: 'storage',
      featureFlags: { allowSharedKeyAccess: true, enableStaticWebsite: true },
      group: { resourceGroupName: 'RG' },
    });

    (rs.storage as any).allowSharedKeyAccess.apply(n => expect(n).to.equal(true));
  });
});
