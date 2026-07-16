import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { create } from '../../VNet/IpAddress';
import { naming } from '../../Common';

describe('IpAddress Creator tests', () => {
  it('IpAddress Creator', async () => {
    const rs = create({
      name: 'drunk',
      group: { resourceGroupName: 'drunk' },
    });

    // `creator` (default export) is gone; `create` is the current named
    // export. The resource only exposes `.name` (not `.publicIpAddressName`,
    // which was never a real output property, just a cast to `any` before).
    const name = await rs.name.promise();
    assert.strictEqual(name, naming.getIpAddressName('drunk'));
  });
});
