import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { convertToIpRange } from '../../VNet/Helper';

describe('Vnet Helper tests', () => {
  it('convertToIpRange test', async () => {
    const rs = convertToIpRange(['192.168.0.0/24']);

    assert.ok(Array.isArray(rs));
    assert.deepStrictEqual(rs, [{ start: '192.168.0.0', end: '192.168.0.255' }]);
  });
});
