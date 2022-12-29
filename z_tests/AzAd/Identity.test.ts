import '../_tools/Mocks';

import creator from '../../AzAd/Identity';
import { expect } from 'chai';

describe('Identity Creator tests', () => {
  it('Identity Creator', async () => {
    const item = await creator({
      name: 'test',
      allowImplicit: false,
      createPrincipal: true,
      createClientSecret: true,

      vaultInfo: {
        group: { resourceGroupName: 'test' },
        id: 'test',
        name: 'test',
      },
    });

    expect(item.name).to.equal('stack-test');
    expect(item.clientSecret).to.not.undefined;
    expect(item.clientId).to.not.undefined;
    expect(item.objectId).to.not.undefined;
    expect(item.principalId).to.not.undefined;
    expect(item.principalSecret).to.not.undefined;
  });
});
