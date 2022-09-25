import creator from '../../VNet/IpAddress';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('IpAddress Creator tests', () => {
  it('IpAddress Creator', async () => {
    const rs = creator({
      name: 'drunk',
      group: { resourceGroupName: 'drunk' },
    });

    const n = await outputPromise((rs as any).publicIpAddressName);
    expect(n).to.equal('test-stack-drunk-ip');
  });
});
