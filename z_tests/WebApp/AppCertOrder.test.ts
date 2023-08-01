import '../_tools/Mocks';
import creator from '../../Web/AppCertOrder';
import { expect } from 'chai';

describe('AppCertOrder Creator tests', () => {
  it('AppCertOrder Creator', async () => {
    const rs = await creator({
      domain: 'drunkcoding.net',
    });

    (rs.resource as any).certificateOrderName.apply((c) =>
      expect(c).to.equal('drunkcoding-net-ca')
    );
    (rs.resource as any).distinguishedName.apply((d) =>
      expect(d).to.includes('CN=*')
    );
  });
});
