import { convertToIpRange } from '../../VNet/Helper';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('Vnet Helper tests', () => {
  it('convertToIpRange test', async () => {
    const rs = convertToIpRange(['192.168.0.0/24']);

    expect(rs)
      .to.be.an('array')
      .and.to.deep.equal([{ start: '192.168.0.0', end: '192.168.0.255' }]);
  });
});
