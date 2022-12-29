import creator from '../../VNet/IpAddress';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('IpAddress Creator tests', () => {
  it('IpAddress Creator', async () => {
    const rs = creator({
      name: 'drunk',
      group: { resourceGroupName: 'drunk' },
    });

    (rs as any).publicIpAddressName.apply(n => expect(n).to.equal('test-stack-drunk-ip'));
  });
});
