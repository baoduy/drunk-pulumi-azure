import '../_tools/Mocks';

import assert from 'node:assert/strict';
// PublicDns.ts was replaced by DnsZoneBuilder (class-based Builder) under src/Builder.
import creator from '../../Builder/DnsZoneBuilder';

describe('PublicDns Creator tests', () => {
  it('PublicDns Creator', async () => {
    const rs = creator({
      name: 'drunkcoding.net',
      group: { resourceGroupName: 'global-grp-hbd' },
    })
      .withARecord({ recordName: '@', ipAddresses: ['10.0.0.1'] })
      .withSubZone('hello')
      .withSubZone('office')
      .build();

    assert.strictEqual(rs.name, 'drunkcoding.net');
    assert.strictEqual(rs.group.resourceGroupName, 'global-grp-hbd');
    // Note: build() only returns the root zone ResourceInfo now; child zone
    // instances are created internally and no longer exposed on the result,
    // so there is nothing to iterate/assert on for `childZones` anymore.
  });
});
