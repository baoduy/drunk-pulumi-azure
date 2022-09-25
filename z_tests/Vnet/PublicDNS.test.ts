import creator from '../../VNet/PublicDns';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('PublicDns Creator tests', () => {
  it('PublicDns Creator', async () => {
    const rs = creator({
      name: 'drunkcoding.net',
      defaultIpAddress: '10.0.0.1',
      childZones: [
        {
          name: 'hello',
          defaultIpAddress: '10.0.0.1',
        },
        {
          name: 'office',
          defaultIpAddress: '10.0.0.1',
        },
      ],
    });

    const [n, g] = await outputPromise([
      (rs.zone as any).zoneName,
      (rs.zone as any).resourceGroupName,
    ]);

    expect(n).to.equal('drunkcoding.net');
    expect(g).to.equal('global-grp-hbd');

    if (rs.child) rs.child.forEach((c) => {});
  });
});
