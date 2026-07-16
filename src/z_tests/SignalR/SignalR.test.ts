import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/SignalRBuilder';

describe('SignalR Creator tests', () => {
  it('SignalR Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    // Note: SignalRBuilder.build() only returns a top-level ResourceInfo
    // (name/group/id) — the private endpoint resource is no longer returned,
    // so we can only assert the SignalR name and that the build succeeds with
    // a private link configured (Standard tier, since Free_F1 skips private link).
    const rs = creator({
      name: 'aaa',
      group,
    })
      .withKind('SignalR')
      .withSku({ name: 'Standard_S1', tier: 'Standard' })
      .withPrivateLink({ subnetIds: ['123456'] })
      .build();

    assert.strictEqual(rs.name, 'teststack-aaa-sg-sigr');
  });
});
