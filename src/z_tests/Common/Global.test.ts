import '../_tools/Mocks';

import assert from 'node:assert/strict';
import naming from '../../Common/Naming';

// GlobalEnv.ts (which used to export groupInfo/logGroupInfo) was removed in a
// module consolidation; naming.getResourceGroupName is today's equivalent.
describe('GlobalEnv tests', () => {
  it('Global Resource Group', async () => {
    assert.strictEqual(
      naming.getResourceGroupName('global'),
      'teststack-global-sg-grp-testorganization',
    );
    assert.strictEqual(
      naming.getResourceGroupName('global-logs'),
      'teststack-global-logs-sg-grp-testorganization',
    );
  });
});
