import '../_tools/Mocks';

import creator from '../../WebApp/AppCertOrder';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('AppCertOrder Creator tests', () => {
  it('AppCertOrder Creator', async () => {
    const rs = await creator({
      domain: 'drunkcoding.net',
    });

    const [c, d] = await outputPromise([
      (rs.resource as any).certificateOrderName,
      (rs.resource as any).distinguishedName,
    ]);

    expect(c).to.equal('drunkcoding-net-ca');
    expect(d).to.includes('CN=*');
  });
});
