import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/AksBuilder';
import { naming } from '../../Common';

describe('AksBuilder Creator tests', () => {
  it('AksBuilder Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    const rs = await creator({
      name: 'cluster',
      group,

      vaultInfo: {
        group: { resourceGroupName: 'vault' },
        id: 'vault',
        name: 'vault',
      },
    })
      .withNewSsh({})
      .withNetwork({ subnetId: '/123' })
      .withDefaultNodePool({ vmSize: 'Standard_B2s', osDiskSizeGB: 128 })
      .withNodePool({
        name: 'main',
        mode: 'System',
        vmSize: 'Standard_B2s',
        osDiskSizeGB: 128,
      })
      .build();

    assert.notStrictEqual(rs.instance, undefined);

    // `rs.name` is a plain string computed synchronously by naming.getAksName,
    // so this can be verified directly (this is what the original test's
    // `.resourceName` check was after).
    assert.strictEqual(rs.name, naming.getAksName('cluster'));

    // NOTE: rs.instance's Outputs (id, nodeResourceGroup, etc.) never resolve
    // under the mock runtime here - `rs.instance.id.apply(...)` did not fire
    // even after 20s in testing. This reproduces with a plain ManagedCluster
    // build, so it
    // looks like a genuine gap (unresolved/rejected internal promise while
    // registering `ccs.ManagedCluster` under pulumi.runtime.setMocks), not
    // something introduced by this test. The original test's assertion on
    // `.nodeResourceGroup` had the same problem masked: it asserted inside a
    // fire-and-forget `.apply()` that mocha never waited on, so it silently
    // never ran. Left unverified here rather than faking a pass.
  }).timeout(10000);
});
